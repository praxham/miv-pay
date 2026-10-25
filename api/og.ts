import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { poppinsBold, poppinsMedium, resvgWasm } from "../src/assets/og/assets";

const b64ToBytes = (b64: string) => Uint8Array.from(Buffer.from(b64, "base64"));

const fonts = [
  {
    name: "Poppins",
    data: b64ToBytes(poppinsMedium),
    weight: 500 as const,
    style: "normal" as const,
  },
  {
    name: "Poppins",
    data: b64ToBytes(poppinsBold),
    weight: 700 as const,
    style: "normal" as const,
  },
];

// Initialise the wasm renderer once per warm instance.
let wasmReady: Promise<void> | null = null;
const ensureWasm = () =>
  (wasmReady ??= initWasm(b64ToBytes(resvgWasm)).catch((e) => {
    wasmReady = null; // allow retry on next request
    throw e;
  }));

const clip = (s: string | null, max: number) =>
  s && s.length > max ? `${s.slice(0, max - 1)}…` : s;

type Node = {
  type: string;
  props: { style?: Record<string, unknown>; children?: unknown };
};
const el = (style: Record<string, unknown>, children: unknown): Node => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const am = clip(searchParams.get("am"), 12) || "0";
    const pn = clip(searchParams.get("pn"), 36);
    const pa = clip(searchParams.get("pa"), 50) || "";
    const tn = clip(searchParams.get("tn"), 60);

    const payee = pn || pa;

    const tree = el(
      {
        width: 1200,
        height: 630,
        boxSizing: "border-box",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        padding: "64px 80px",
        fontFamily: "Poppins",
      },
      [
        el({ flexDirection: "column", width: 1040 }, [
          el(
            { fontSize: 34, fontWeight: 500, color: "#6B7280" },
            "Payment request",
          ),
          el(
            { fontSize: 120, fontWeight: 700, color: "#0F5132", marginTop: 8 },
            `₹${am}`,
          ),
          el(
            {
              fontSize: 44,
              fontWeight: 700,
              color: "#111827",
              marginTop: 4,
              maxWidth: 1040,
            },
            `to ${payee}`,
          ),
          tn
            ? el(
                {
                  fontSize: 32,
                  fontWeight: 500,
                  color: "#4B5563",
                  marginTop: 12,
                  maxWidth: 1040,
                },
                `for "${tn}"`,
              )
            : el({ height: 0 }, ""),
        ]),
        el(
          {
            border: "2px solid #E5E7EB",
            background: "#F9FAFB",
            borderRadius: 16,
            width: 1040,
            boxSizing: "border-box",
            padding: "24px 36px",
            fontSize: 28,
            fontWeight: 700,
            color: "#1F2937",
          },
          "Scan with any UPI app to pay securely",
        ),
      ],
    );

    const svg = await satori(tree as any, { width: 1200, height: 630, fonts });

    await ensureWasm();
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
      .render()
      .asPng();

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("OG image failed:", error);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
