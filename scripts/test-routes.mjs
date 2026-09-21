import test from "node:test";
import assert from "node:assert/strict";
import {
  clearRouteCaches,
  isCologneCoordinate,
  loadRoutes,
  normalizeRoute,
  serveGeocode,
  serveRoutes,
  validateRouteRequest,
} from "./route-service.mjs";

const start = [6.9485, 50.9364];
const end = [6.9395, 50.9196];
const feature = {
  type: "Feature",
  geometry: { type: "LineString", coordinates: [start, [6.944, 50.928], end] },
  properties: { summary: { distance: 1520.4, duration: 1081.2 } },
};

test("route validation accepts Cologne coordinates and rejects unsafe input", () => {
  assert.equal(isCologneCoordinate(start), true);
  assert.equal(isCologneCoordinate([8, 51]), false);
  assert.deepEqual(validateRouteRequest({ start, end }), { start, end });
  assert.equal(validateRouteRequest({ start, end: start }), null);
  assert.equal(validateRouteRequest({ start: ["6.9", 50.9], end }), null);
});

test("ORS features are normalized to the public route contract", () => {
  const result = normalizeRoute(feature, { id: "cool", type: "cool", label: "Coolroute" });
  assert.equal(result.distanceM, 1520);
  assert.equal(result.durationS, 1081);
  assert.equal(result.geometry.coordinates.length, 3);
  assert.equal(result.greenPotentialPct, null);
  assert.deepEqual(result.waterStops, []);
  assert.equal(normalizeRoute({ geometry: { type: "Point", coordinates: start } }, {}), null);
});

test("route loader requests green, fast and wheelchair profiles", async () => {
  clearRouteCaches();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ features: [feature] }) };
  };
  const result = await loadRoutes({ start, end }, "secret", fetchImpl);
  assert.equal(result.routes.length, 3);
  assert.equal(calls.length, 3);
  assert.ok(calls.some((call) => call.url.includes("/wheelchair/")));
  assert.ok(calls.some((call) => call.body.options?.profile_params?.weightings?.green));
  clearRouteCaches();
});

test("route endpoint validates requests and redacts upstream failures", async () => {
  let response = await serveRoutes(new Request("https://example.net/api/routes", {
    method: "POST",
    body: JSON.stringify({ start: [9, 50], end }),
  }), "secret");
  assert.equal(response.status, 400);
  response = await serveRoutes(new Request("https://example.net/api/routes", {
    method: "POST",
    body: JSON.stringify({ start, end }),
  }), "", async () => { throw new Error("should not run"); });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "routing_not_configured" });
});

test("geocoder keeps only bounded Cologne results", async () => {
  clearRouteCaches();
  const response = await serveGeocode(
    new Request("https://example.net/api/geocode?q=Neumarkt"),
    "secret",
    async () => ({
      ok: true,
      json: async () => ({ features: [
        { geometry: { coordinates: start }, properties: { id: "1", label: "Neumarkt, Koeln" } },
        { geometry: { coordinates: [8, 51] }, properties: { id: "2", label: "Ausserhalb" } },
      ] }),
    })
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).results.map((item) => item.label), ["Neumarkt, Koeln"]);
  clearRouteCaches();
});
