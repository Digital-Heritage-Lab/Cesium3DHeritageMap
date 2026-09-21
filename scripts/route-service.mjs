const COLOGNE_BOUNDS = Object.freeze({
  west: 6.75,
  south: 50.80,
  east: 7.20,
  north: 51.10,
});

const ROUTE_SPECS = Object.freeze([
  {
    id: "cool",
    type: "cool",
    label: "Coolroute",
    profile: "foot-walking",
    body: {
      preference: "recommended",
      options: { profile_params: { weightings: { green: { factor: 1 } } } },
    },
  },
  {
    id: "fast",
    type: "fast",
    label: "Schnellste Route",
    profile: "foot-walking",
    body: { preference: "fastest" },
  },
  {
    id: "accessible",
    type: "accessible",
    label: "Barriereärmere Route",
    profile: "wheelchair",
    body: { preference: "recommended" },
  },
]);

const routeCache = new Map();
const geocodeCache = new Map();
const CACHE_MS = 5 * 60 * 1000;

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": status === 200 ? "private, max-age=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function cached(cache, key) {
  const item = cache.get(key);
  if (!item || item.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function remember(cache, key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_MS });
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return value;
}

export function isCologneCoordinate(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(Number.isFinite) &&
    value[0] >= COLOGNE_BOUNDS.west &&
    value[0] <= COLOGNE_BOUNDS.east &&
    value[1] >= COLOGNE_BOUNDS.south &&
    value[1] <= COLOGNE_BOUNDS.north
  );
}

export function validateRouteRequest(body) {
  if (!body || !isCologneCoordinate(body.start) || !isCologneCoordinate(body.end)) {
    return null;
  }
  const distance = Math.hypot(body.end[0] - body.start[0], body.end[1] - body.start[1]);
  if (distance < 0.00005 || distance > 0.5) return null;
  return { start: body.start.map(Number), end: body.end.map(Number) };
}

export function normalizeRoute(feature, spec) {
  const coordinates = feature?.geometry?.coordinates;
  const summary = feature?.properties?.summary;
  if (
    feature?.geometry?.type !== "LineString" ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !coordinates.every((point) =>
      Array.isArray(point) && point.length >= 2 && point.slice(0, 2).every(Number.isFinite)
    ) ||
    !Number.isFinite(summary?.distance) ||
    !Number.isFinite(summary?.duration)
  ) {
    return null;
  }
  return {
    id: spec.id,
    type: spec.type,
    label: spec.label,
    geometry: { type: "LineString", coordinates: coordinates.map((point) => point.slice(0, 2)) },
    distanceM: Math.round(summary.distance),
    durationS: Math.round(summary.duration),
    greenPotentialPct: null,
    waterStops: [],
    accessibility: spec.type === "accessible" ? "Wheelchair-Profil von openrouteservice" : null,
    disclaimer:
      "Routing auf OpenStreetMap-Basis. Grün- und Schattenpotenzial werden lokal als Näherungswert ergänzt.",
  };
}

async function fetchJsonWithTimeout(url, options, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadRoutes(input, apiKey, fetchImpl = fetch) {
  const request = validateRouteRequest(input);
  if (!request) throw new Error("invalid_request");
  if (!apiKey?.trim()) throw new Error("not_configured");
  const key = JSON.stringify(request);
  const hit = cached(routeCache, key);
  if (hit) return hit;

  const routes = await Promise.all(
    ROUTE_SPECS.map(async (spec) => {
      const data = await fetchJsonWithTimeout(
        `https://api.openrouteservice.org/v2/directions/${spec.profile}/geojson`,
        {
          method: "POST",
          headers: {
            Authorization: apiKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ coordinates: [request.start, request.end], ...spec.body }),
        },
        fetchImpl,
        12000
      );
      return normalizeRoute(data?.features?.[0], spec);
    })
  );
  if (routes.some((route) => !route)) throw new Error("invalid_upstream");
  return remember(routeCache, key, { routes, attribution: "openrouteservice.org | OpenStreetMap-Mitwirkende" });
}

export async function loadGeocode(query, apiKey, fetchImpl = fetch) {
  const text = String(query || "").trim().slice(0, 120);
  if (text.length < 3) throw new Error("invalid_query");
  if (!apiKey?.trim()) throw new Error("not_configured");
  const key = text.toLocaleLowerCase("de-DE");
  const hit = cached(geocodeCache, key);
  if (hit) return hit;
  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("text", text);
  url.searchParams.set("size", "6");
  url.searchParams.set("boundary.rect.min_lon", String(COLOGNE_BOUNDS.west));
  url.searchParams.set("boundary.rect.min_lat", String(COLOGNE_BOUNDS.south));
  url.searchParams.set("boundary.rect.max_lon", String(COLOGNE_BOUNDS.east));
  url.searchParams.set("boundary.rect.max_lat", String(COLOGNE_BOUNDS.north));
  const data = await fetchJsonWithTimeout(
    url,
    { headers: { Authorization: apiKey.trim() } },
    fetchImpl,
    8000
  );
  const results = (data?.features || [])
    .filter((feature) => isCologneCoordinate(feature?.geometry?.coordinates))
    .slice(0, 6)
    .map((feature, index) => ({
      id: String(feature.properties?.id || `address-${index}`),
      label: String(feature.properties?.label || feature.properties?.name || "Adresse in Köln").slice(0, 180),
      coordinates: feature.geometry.coordinates.slice(0, 2),
    }));
  return remember(geocodeCache, key, { results });
}

function publicError(error) {
  if (error?.name === "AbortError") return [504, "route_timeout"];
  if (error?.message === "invalid_request" || error?.message === "invalid_query") return [400, error.message];
  if (error?.message === "not_configured") return [503, "routing_not_configured"];
  if (/^upstream_4/.test(error?.message || "")) return [502, "routing_rejected"];
  return [502, "routing_unavailable"];
}

export async function serveRoutes(request, apiKey, fetchImpl = fetch) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: "request_too_large" }, 413);
    return json(await loadRoutes(JSON.parse(text), apiKey, fetchImpl));
  } catch (error) {
    const [status, code] = publicError(error);
    return json({ error: code }, status);
  }
}

export async function serveGeocode(request, apiKey, fetchImpl = fetch) {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  try {
    return json(await loadGeocode(new URL(request.url).searchParams.get("q"), apiKey, fetchImpl));
  } catch (error) {
    const [status, code] = publicError(error);
    return json({ error: code }, status);
  }
}

export function clearRouteCaches() {
  routeCache.clear();
  geocodeCache.clear();
}

export { COLOGNE_BOUNDS };
