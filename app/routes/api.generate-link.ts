import { generateLinkSchema } from "~/validation-schema";
import type { Route } from "./+types/api.generate-link";
import { createSignature } from "~/functions";
import type { LoaderFunctionArgs } from "react-router";
import { corsHeaders } from "~/constants";



export const loader = async ({ request }: LoaderFunctionArgs) => {
  // for browser preflight check
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export async function action({ request }: Route.ActionArgs): Promise<Response> {
  try {
    const body = await request.json();
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

    const { pn, pa, am, tn, ct, ci, ra, vurl } = result.data;
    let validCt;
    if (ct === "whatsapp" && ci?.length === 0) {
      validCt = "";
    } else {
      validCt = ct;
    }
    const dataToProtect = `${pa}|${am}|${pn || ""}|${tn || ""}|${validCt || ""}|${ci || ""}|${ra || ""}|${vurl || ""}`;
    const signature = await createSignature(dataToProtect);

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const link = `${baseUrl}/pay/?${pn ? `pn=${encodeURIComponent(pn)}` : ""}&pa=${pa}&am=${am}${tn ? `&tn=${encodeURIComponent(tn)}` : ""}${validCt ? `&ct=${validCt}` : ""}${ci ? `&ci=${ci}` : ""}${ra ? `&ra=${ra}` : ""}${vurl ? `&vurl=${vurl}` : ""}&sig=${signature}`;

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
