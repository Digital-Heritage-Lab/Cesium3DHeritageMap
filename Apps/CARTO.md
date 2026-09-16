# CARTO Basemap Libre

The Positron raster layer requires a project-specific key from
https://carto.com/basemaps/apikey/ (see https://github.com/CartoDB/basemap-styles).

Set `CARTO_BASEMAP_API_KEY` in the ignored root `.env` for local development,
then restart `npm run start`. On Netlify, set the same variable with Functions
scope and deploy the updated app and `netlify/functions/carto.mjs` together.
Never put the key in client JavaScript or commit `.env`.

The server adds `?key=...` to the fixed CARTO upstream URL. The browser requests
only `/api/carto/light_all/{z}/{x}/{y}.png`. The key therefore needs to support
server-side requests; browser Referer restrictions are not forwarded by this proxy.
Successful tiles are cached for one hour; errors are not cached.

When the initial CARTO request fails, the app selects OpenStreetMap and displays
a notice. The OpenStreetMap option now uses OSM directly, independently of CARTO.
Both providers display their attribution. CARTO is retiring raster basemaps;
a future vector migration is separate from this Cesium raster-provider fix.

Check the proxy with `node scripts/test-carto.mjs`. In the running app, select
Basemap Libre, verify readable tiles without an API-key watermark, then switch
to OpenStreetMap and back. Without the environment variable, verify the fallback
notice and OpenStreetMap selection.
