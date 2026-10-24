import { timingSafeEqual } from "node:crypto";
import { createSignature } from "./functions";
import { generateLinkSchema, verifyLinkSchema } from "./validation-schema";
import { ImageResponse } from "@vercel/og";

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
};

export async function generateLinkHandler(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const result = generateLinkSchema.safeParse(body);
    if (!result.success) {
      return Response.json(
        {
          success: false,
          message: "Validation Error",
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }
    const { pn, pa, am, tn, ct, ci, ra } = result.data;
    const dataToProtect = `${pa}|${am}|${pn || ""}|${tn || ""}|${ct}|${ci}|${ra || ""}`;
    const signature = await createSignature(dataToProtect);

    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const link = `${baseUrl}/pay/?${pn ? `pn=${encodeURIComponent(pn)}` : ""}&pa=${pa}&am=${am}${tn ? `&tn=${encodeURIComponent(tn)}` : ""}&ct=${ct}&ci=${ci}${ra ? `&ra=${ra}` : ""}&sig=${signature}`;
    return Response.json({
      success: true,
      message: "Successfully Generated Secure Payment Link",
      data: { link },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, message: "Something Went Wrong!" },
      { status: 500 },
    );
  }
}

export async function verifyLinkHandler(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const result = verifyLinkSchema.safeParse(body);
    if (!result.success) {
      return Response.json({
        success: false,
        data: { isValid: false },
        errors: result.error.format(),
      });
    }

    const { pn, pa, am, tn, ct, ci, ra, sig } = result.data;

    if (!sig) {
      return Response.json({
        success: false,
        message: "Invalid or Tampered Link",
      });
    }

    const dataToVerify = `${pa}|${am}|${pn || ""}|${tn || ""}|${ct}|${ci}|${ra || ""}`;
    const calculatedSignature = await createSignature(dataToVerify);

    const isValid = safeEqual(String(calculatedSignature), String(sig));
    return Response.json({
      success: true,
      message: "Successfully Verified Secure Payment Link",
      data: { isValid },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, message: "Something Went Wrong!" },
      { status: 500 },
    );
  }
}

type OgNode = {
  type: string;
  props: { style: Record<string, unknown>; children: unknown };
};

const ogEl = (style: Record<string, unknown>, children: unknown): OgNode => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

export function ogHandler(req: Request): Response {
  try {
    const { searchParams } = new URL(req.url);
    const am = searchParams.get("am") || "0";
    const pn = searchParams.get("pn");
    const pa = searchParams.get("pa") || "";
    const tn = searchParams.get("tn");

    const title = `Paying Rs. ${am} ${pn ? `to ${pn}` : `to ${pa}`}`;
    const subtitle = tn ? `for "${tn}"` : " ";

    const tree = ogEl(
      {
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        padding: "80px",
      },
      [
        ogEl({ flexDirection: "column" }, [
          ogEl({ fontSize: 56, fontWeight: 800, color: "#111827" }, title),
          ogEl({ fontSize: 36, color: "#4B5563", marginTop: 24 }, subtitle),
        ]),
        ogEl(
          {
            border: "2px solid #E5E7EB",
            background: "#F9FAFB",
            borderRadius: 16,
            padding: "32px 40px",
            fontSize: 28,
            fontWeight: 700,
            color: "#1F2937",
          },
          "Scan with any UPI app to pay securely",
        ),
      ],
    );

    return new ImageResponse(tree as any, { width: 1200, height: 630 });
  } catch (error) {
    console.error(error);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}

const paymentFields = {
  pn: { type: "string", description: "Payee Name" },
  pa: { type: "string", description: "Payee UPI ID / VPA" },
  am: { type: "number", description: "Amount" },
  tn: { type: "string", description: "Transaction Note" },
  ct: { type: "string", description: "Category (email or whatsapp)" },
  ci: { type: "string", description: "Contact info (email or phone number)" },
  ra: { type: "string", description: "Reference Amount" },
};

export function docsJsonHandler(): Response {
  const swaggerSpec = {
    openapi: "3.0.0",
    info: { title: "Secure UPI Payment Link API", version: "1.0.0" },
    paths: {
      "/api/generate-link": {
        post: {
          summary: "Generate a secure payment link",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["pa", "am", "ct", "ci"],
                  properties: paymentFields,
                },
              },
            },
          },
          responses: {
            "200": { description: "Success" },
            "400": { description: "Validation Error" },
          },
        },
      },
      "/api/verify-link": {
        post: {
          summary: "Verify a secure payment link",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["pa", "am", "ct", "ci", "sig"],
                  properties: {
                    ...paymentFields,
                    sig: { type: "string", description: "Signature hash" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Success" },
            "400": { description: "Validation Error" },
          },
        },
      },
    },
  };
  return Response.json(swaggerSpec);
}

export function docsPageHandler(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>API Documentation - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({ url: '/api/docs-json', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
