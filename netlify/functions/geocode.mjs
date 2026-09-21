/* global Netlify */
import { serveGeocode } from "../../scripts/route-service.mjs";
import { createRateLimiter } from "../../scripts/chat-guard.mjs";

const allow = createRateLimiter({ limit: 20, windowMs: 60000 });

export default (request, context) => {
  if (!allow(context?.ip || "anonymous")) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  return serveGeocode(request, Netlify.env.get("ORS_API_KEY"));
};

export const config = { path: "/api/geocode" };
