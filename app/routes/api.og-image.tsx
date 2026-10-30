import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { Route } from "./+types/api.og.image";
import poppins400 from "../assets/fonts/poppins-400.woff?inline";
import poppins700 from "../assets/fonts/poppins-700.woff?inline";
import { readableAmount } from "~/functions";

const dataUrlToBuffer = (dataUrl: string) =>
  Buffer.from(dataUrl.split(",")[1], "base64");

const regular = dataUrlToBuffer(poppins400);
const bold = dataUrlToBuffer(poppins700);

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  try {
    const url = new URL(request.url);
    const am = url.searchParams.get("am") || "0";

    const svg = await satori(
      <div
        style={{
          position: "relative",
          fontFamily: "Poppins",
          background:
            "linear-gradient(to bottom right, #33333366, #3333331a, #33333380)",
          width: "100%",
          height: "100%",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 50, fontWeight: 500, color: "#333333" }}>
            Requested
          </div>
          <div style={{ fontSize: 100, fontWeight: 500 }}>
            Rs. {readableAmount(am)}
          </div>
        </div>
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            marginLeft: "auto",
            fontWeight: 600,
            color: "#333333",
            fontSize: 14,
          }}
        >
          MIV-PAY
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: "Poppins", data: regular, weight: 400, style: "normal" },
          { name: "Poppins", data: bold, weight: 700, style: "normal" },
        ],
      },
    );

    const png = new Resvg(svg).render().asPng();

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, message: "Something Went Wrong!" },
      { status: 500 },
    );
  }
}
