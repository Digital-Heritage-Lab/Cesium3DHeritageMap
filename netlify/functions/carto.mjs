/* global Netlify */
// Shared by Netlify and the local Express server. Never return upstream errors
// or URLs: they may contain the private basemap key.
export async function serveCarto(pathname, apiKey, fetchTile = fetch) {
  const fail = (status, message) => new Response(message, {
    status, headers: { "Cache-Control": "no-store" }
  });
  const match = /^\/api\/carto\/(light_all|voyager)\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.png$/.exec(pathname);
  if (!match) {
    return fail(400, "Invalid tile request.");
  }
  const [, style, z, x, y] = match;
  if (Number(z) > 20 || Number(x) >= 2 ** Number(z) || Number(y) >= 2 ** Number(z)) {
    return fail(400, "Invalid tile coordinates.");
  }
  if (!apiKey || !apiKey.trim()) {
    return fail(503, "CARTO basemap key is not configured.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const cartoStyle = style === "voyager" ? "rastertiles/voyager" : style;
    const url = new URL(`https://basemaps.cartocdn.com/${cartoStyle}/${z}/${x}/${y}.png`);
    url.searchParams.set("key", apiKey.trim());
    const response = await fetchTile(url, { signal: controller.signal, redirect: "error" });
    if (!response.ok || !response.headers.get("content-type")?.includes("image/png")) {
      return fail(502, "CARTO basemap is unavailable.");
    }
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return fail(502, "CARTO basemap is unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

export default async function carto(request) {
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }
  return serveCarto(new URL(request.url).pathname, Netlify.env.get("CARTO_BASEMAP_API_KEY"));
}

export const config = { path: "/api/carto/*" };
