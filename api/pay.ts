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
  // If anything goes wrong, send the visitor to the plain static page so
  // the payment page itself never breaks (it reads the query in the browser).
  const fallback = () =>
    Response.redirect(`${origin}/pay.html${url.search}`, 302);

  try {
    // The built static page (hashed script/css tags already inside).
    const shell = await fetch(`${origin}/pay.html`);
    if (!shell.ok) return fallback();
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

    // Only build a rich preview for correctly signed links.
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

      // Only the public bits go into the image URL (never ci / sig).
      const img = new URLSearchParams({ am, pa });
      if (pn) img.set("pn", pn);
      if (tn) img.set("tn", tn);
      const image = `${origin}/api/og?${img.toString()}`;

      const tags = [
        `<meta property="og:type" content="website" />`,
        `<meta property="og:url" content="${esc(url.toString())}" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:image" content="${esc(image)}" />`,
        `<meta property="og:image:type" content="image/png" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        `<meta name="twitter:image" content="${esc(image)}" />`,
      ].join("");

      html = html.replace(/<title>[\s\S]*?<\/title>/i, "");
      html = html.replace(
        /<\/head>/i,
        `<title>${esc(title)}</title>${tags}</head>`,
      );
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("pay page failed:", error);
    return fallback();
  }
}
