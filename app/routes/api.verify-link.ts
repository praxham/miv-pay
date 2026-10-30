import crypto from "node:crypto";
import type { Route } from "./+types/api.verify-link";
import { verifyLinkSchema } from "~/validation-schema";
import { createSignature } from "~/functions";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function action({ request }: Route.ActionArgs): Promise<Response> {
  try {
    const body = await request.json();
    const result = verifyLinkSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          data: { isValid: false },
          errors: result.error.issues,
        },
        { status: 400 },
      );
    }

    const { pn, pa, am, tn, ct, ci, ra, vurl, sig } = result.data;

    if (!sig) {
      return Response.json(
        {
          success: false,
          message: "Invalid or Tampered Link",
        },
        { status: 400 },
      );
    }

    let validCt;
    if (ct === "whatsapp" && ci?.length === 0) {
      validCt = "";
    } else {
      validCt = ct;
    }
    const dataToVerify = `${pa}|${am}|${pn || ""}|${tn || ""}|${validCt || ""}|${ci || ""}|${ra || ""}|${vurl || ""}`;
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
