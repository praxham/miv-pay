import { generateLinkSchema } from "~/validation-schema";
import type { Route } from "./+types/api.generate-link";
import { createSignature } from "~/functions";

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

    const { pn, pa, am, tn, ct, ci, ra } = result.data;
    const dataToProtect = `${pa}|${am}|${pn || ""}|${tn || ""}|${ct}|${ci}|${ra || ""}`;
    const signature = await createSignature(dataToProtect);

    const url = new URL(request.url);
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
