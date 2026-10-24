import { createSignature } from "../src/functions";
import { safeEqual } from "../src/handlers";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;

  // Get the built SPA shell (static files are served before rewrites).
  const shell = await fetch(`${origin}/index.html`);
  let html = await shell.text();

  const q = url.searchParams;
  const pn = q.get("pn") || "";
  const pa = q.get("pa") || "";
  const am = q.get("am") || "";
  const tn = q.get("tn") || "";
  const ct = q.get("ct") || "";
  const ci = q.get("ci") || "";
  const ra = q.get("ra") || "";
  const sig = q.get("sig") || "";

  // Only add a rich preview for links with a valid signature.
  let valid = false;
  try {
    const expected = await createSignature(
      `${pa}|${am}|${pn}|${tn}|${ct}|${ci}|${ra}`,
    );
    valid = Boolean(sig) && safeEqual(String(expected), sig);
  } catch {
    valid = false;
  }

  if (valid) {
    const title = `Paying ₹${am} ${pn ? `to ${pn}` : `to ${pa}`}${tn ? ` for "${tn}"` : ""}`;
    const description = "Scan with any UPI app to pay securely.";
    const image = `${origin}/api/og${url.search}`;

    const tags = `
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(url.toString())}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />`;

    html = html.replace(/<title>.*?<\/title>/s, "");
    html = html.replace(
      "</head>",
      `<title>${esc(title)}</title>${tags}\n</head>`,
    );
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
