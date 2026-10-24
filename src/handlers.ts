import { timingSafeEqual } from "node:crypto";
import { createSignature } from "./functions";
import { generateLinkSchema, verifyLinkSchema } from "./validation-schema";

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

export function ogHandler(req: Request): Response {
  try {
    const url = new URL(req.url);
    const am = url.searchParams.get("am") || "0";
    const pn = url.searchParams.get("pn");
    const pa = url.searchParams.get("pa") || "";
    const tn = url.searchParams.get("tn");

    const title = escapeXml(`Paying ₹${am} ${pn ? `to ${pn}` : `to ${pa}`}`);
    const subtitle = tn ? escapeXml(`for "${tn}"`) : "";

    const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#ffffff"/>
  <g transform="translate(80, 100)">
    <text x="0" y="80" font-family="system-ui, sans-serif" font-size="56" font-weight="800" fill="#111827">${title}</text>
    <text x="0" y="150" font-family="system-ui, sans-serif" font-size="36" font-weight="500" fill="#4B5563">${subtitle}</text>
  </g>
  <g transform="translate(80, 450)">
    <rect width="1040" height="100" rx="16" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="2"/>
    <text x="40" y="60" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#1F2937">Scan with any UPI app to pay securely</text>
  </g>
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
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
