import { ImageResponse } from "@vercel/og";

type OgNode = {
  type: string;
  props: { style: Record<string, unknown>; children: unknown };
};

const el = (style: Record<string, unknown>, children: unknown): OgNode => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

export function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const am = searchParams.get("am") || "0";
    const pn = searchParams.get("pn");
    const pa = searchParams.get("pa") || "";
    const tn = searchParams.get("tn");

    const title = `Paying Rs. ${am} ${pn ? `to ${pn}` : `to ${pa}`}`;
    const subtitle = tn ? `for "${tn}"` : " ";

    const tree = el(
      {
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        padding: "80px",
      },
      [
        el({ flexDirection: "column" }, [
          el({ fontSize: 56, fontWeight: 800, color: "#111827" }, title),
          el({ fontSize: 36, color: "#4B5563", marginTop: 24 }, subtitle),
        ]),
        el(
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
