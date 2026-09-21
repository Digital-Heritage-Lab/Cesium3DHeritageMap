/* Coolroute client: route requests stay server-side; local open data enriches the result. */
window.GreenRoutes = (() => {
  const state = { start: null, end: null, routes: [], activeId: "cool", busy: false };

  const radians = (value) => (value * Math.PI) / 180;
  function meters(a, b) {
    const x = radians(b[0] - a[0]) * Math.cos(radians((a[1] + b[1]) / 2));
    const y = radians(b[1] - a[1]);
    return Math.hypot(x, y) * 6371000;
  }
  function distanceToSegment(point, a, b) {
    const scale = Math.cos(radians(point[1]));
    const px = point[0] * scale, py = point[1];
    const ax = a[0] * scale, ay = a[1], bx = b[0] * scale, by = b[1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return meters(point, [(ax + t * dx) / scale, ay + t * dy]);
  }
  function nearRoute(point, coordinates, limit) {
    for (let index = 1; index < coordinates.length; index += 1) {
      if (distanceToSegment(point, coordinates[index - 1], coordinates[index]) <= limit) return true;
    }
    return false;
  }
  function routeBounds(coordinates, padding = 0.002) {
    const lons = coordinates.map((point) => point[0]);
    const lats = coordinates.map((point) => point[1]);
    return [Math.min(...lons) - padding, Math.min(...lats) - padding,
      Math.max(...lons) + padding, Math.max(...lats) + padding];
  }
  function unique(items) {
    return [...new Map(items.map((item) => [item.id, item])).values()];
  }
  function enrich(route) {
    const coordinates = route.geometry.coordinates;
    const bounds = routeBounds(coordinates);
    const cityTrees = GreenTrees.ready ? GreenTrees.inBounds(bounds, 12000) : [];
    const catalog = GreenData.collection.features;
    const trees = unique(cityTrees.concat(catalog.filter((feature) => feature.properties.theme === "trees")))
      .filter((feature) => nearRoute(feature.geometry.coordinates, coordinates, 28));
    const greenPlaces = catalog.filter((feature) =>
      ["parks", "gardens", "cemeteries", "botanical"].includes(feature.properties.theme) &&
      nearRoute(feature.geometry.coordinates, coordinates, 90));
    const waterStops = catalog.filter((feature) =>
      feature.properties.theme === "water" && nearRoute(feature.geometry.coordinates, coordinates, 120));
    const km = Math.max(route.distanceM / 1000, 0.25);
    const density = Math.min(45, (trees.length / km) * 1.8);
    const greenBonus = Math.min(30, greenPlaces.length * 7);
    const providerBonus = route.type === "cool" ? 12 : route.type === "accessible" ? 4 : 0;
    return {
      ...route,
      greenPotentialPct: Math.round(Math.max(12, Math.min(95, 18 + density + greenBonus + providerBonus))),
      waterStops: waterStops.slice(0, 12).map((feature) => ({
        id: feature.id,
        name: feature.properties.name,
        coordinates: feature.geometry.coordinates,
      })),
      evidence: { nearbyTrees: trees.length, greenPlaces: greenPlaces.length },
    };
  }
  function place(id) {
    if (id === "neumarkt") return { id, label: "Neumarkt", coordinates: [6.9477, 50.9365] };
    if (id === "volksgarten") return { id, label: "Volksgarten", coordinates: [6.9385, 50.9194] };
    const feature = GreenData.collection.features.find((item) => item.id === id) || GreenTrees.get(id);
    return feature ? { id: feature.id, label: feature.properties.name, coordinates: feature.geometry.coordinates } : null;
  }
  function places() {
    const preferred = [
      { id: "neumarkt", label: "Neumarkt", coordinates: [6.9477, 50.9365] },
      { id: "volksgarten", label: "Volksgarten", coordinates: [6.9385, 50.9194] },
      ...GreenData.collection.features.filter((feature) =>
        ["parks", "play", "water", "cemeteries"].includes(feature.properties.theme) &&
        !feature.properties.name.includes(" · OSM ")),
    ];
    return unique(preferred.map((item) => item.geometry ? {
      id: item.id, label: item.properties.name, coordinates: item.geometry.coordinates,
    } : item)).slice(0, 60);
  }
  function setEndpoint(kind, value) {
    if (!['start', 'end'].includes(kind) || !value?.coordinates) return false;
    state[kind] = { id: value.id || kind, label: value.label || "Punkt auf der Karte", coordinates: value.coordinates.slice(0, 2) };
    return true;
  }
  async function calculate() {
    if (!state.start || !state.end || state.busy) throw new Error("missing_points");
    state.busy = true;
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: state.start.coordinates, end: state.end.coordinates }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "routing_unavailable");
      state.routes = data.routes.map(enrich);
      state.activeId = state.routes.some((route) => route.id === "cool") ? "cool" : state.routes[0]?.id;
      GreenAtlas.getMap().showRoutes(state.routes, state.activeId);
      return state.routes;
    } finally {
      state.busy = false;
    }
  }
  async function geocode(query) {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "geocode_unavailable");
    return data.results || [];
  }
  function select(id) {
    if (!state.routes.some((route) => route.id === id)) return false;
    state.activeId = id;
    GreenAtlas.getMap().selectRoute(id);
    return true;
  }
  function clear() {
    state.routes = [];
    GreenAtlas.getMap()?.clearRoutes();
  }
  return { state, places, place, setEndpoint, calculate, geocode, select, clear, enrich, nearRoute };
})();
