import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import QRCode from "qrcode";
import type { Route } from "./+types/api.og.image";
import poppins400 from "../assets/fonts/poppins-400.woff?inline";
import poppins700 from "../assets/fonts/poppins-700.woff?inline";

const dataUrlToBuffer = (dataUrl: string) =>
  Buffer.from(dataUrl.split(",")[1], "base64");

const regular = dataUrlToBuffer(poppins400);
const bold = dataUrlToBuffer(poppins700);

function generateQrSvgPath(text: string, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const moduleCount = qr.modules.size;
  const cellSize = size / moduleCount;

  let path = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.modules.get(r, c)) {
        path += `M${c * cellSize},${r * cellSize}h${cellSize}v${cellSize}h-${cellSize}z `;
      }
    }
  }
  return { path, moduleCount, cellSize };
}

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  try {
    const url = new URL(request.url);
    const am = url.searchParams.get("am") || "0";
    const pn = url.searchParams.get("pn");
    const pa = url.searchParams.get("pa") || "";
    const tn = url.searchParams.get("tn");

    const pnParam =
      typeof pn === "string" && pn ? `&pn=${encodeURIComponent(pn)}` : "";
    const tnParam =
      typeof tn === "string" && tn ? `&tn=${encodeURIComponent(tn)}` : "";
    const UPIPaymentURL = `upi://pay?pa=${pa}${pnParam}&am=${am}&cu=INR${tnParam}`;

    const qrData = QRCode.create(UPIPaymentURL, { errorCorrectionLevel: "H" });
    const moduleCount = qrData.modules.size;
    const qrSize = 800;
    const cellSize = qrSize / moduleCount;

    let path = "";
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qrData.modules.get(r, c)) {
          path += `M${c * cellSize},${r * cellSize}h${cellSize}v${cellSize}h-${cellSize}z `;
        }
      }
    }

    const displaySize = 300;

    const svg = await satori(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Poppins",
          background: "white",
          width: "100%",
          height: "100%",
          padding: "64px 80px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              wordBreak: "break-all",
              color: "#111827",
              lineClamp: 2,
            }}
          >
            {`Paying Rs. ${am} ${pn ? `to ${pn}` : `to ${pa}`} ${tn ? `for "${tn}"` : ""}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "16px",
            border: "2px solid #E5E7EB",
            background: "#F9FAFB",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "white",
              padding: "16px",
              borderRadius: "12px",
            }}
          >
            <svg
              viewBox={`0 0 ${qrSize} ${qrSize}`}
              style={{
                display: "flex",
                width: displaySize,
                height: displaySize,
              }}
            >
              <path d={path} fill="black" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#1F2937" }}>
              Scan with any UPI app to pay
            </div>
            <div style={{ fontSize: 22, fontWeight: 400, color: "#6B7280" }}>
              Secure Payment Link
            </div>
          </div>
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
        // "Cache-Control": "public, max-age=31536000, immutable",
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
