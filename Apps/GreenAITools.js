/* GeoAI action layer for GrünAI. Model output is untrusted: only allowlisted actions with
   validated parameters run, and every number, list and distance comes from the loaded
   GrünAtlas data. Other modules are resolved at call time (GreenAtlas loads after this file). */
window.GreenAITools = (() => {
  const ALLOWED_ACTIONS = [
    "show_theme",
    "hide_theme",
    "show_object",
    "zoom_to_object",
    "zoom_to_theme",
    "search_features",
    "filter_features",
    "count_features",
    "list_features",
    "find_nearby",
    "show_reports",
    "filter_reports",
    "get_map_context",
    "rank_trees",
    "rank_districts",
    "set_layers",
    "spatial_analysis",
    "compare_areas",
    "green_access_analysis",
    "maintenance_analysis",
    "tree_structure_analysis",
    "open_coolroutes",
  ];
  // Route calculation stays inside the dedicated, server-backed CoolRoutes workflow.
  const PLANNED_ACTIONS = ["calculate_route"];
  const REPORTS = "reports";
  const SCOPES = ["viewport", "all_loaded"];
  const STATUSES = ["all", "open", "in_progress", "closed"];
  const STATUS_LABEL = { open: "offen", in_progress: "in Bearbeitung", closed: "abgeschlossen" };
  const MIN_RADIUS = 50;
  const MAX_RADIUS = 10000;
  const TREE_RENDER_HEIGHT = 2200; // GreenMap draws single trees only below this camera height
  const TREE_ZOOM_HEIGHT = 1800;
  const COLOGNE_CENTER = { lon: 6.9583, lat: 50.9413 };

  /* Controlled list of tree species that can bear edible fruit or nuts. Matching is exact on the
     normalised cadastre fields, never fuzzy: an exact botanical name is a "species" match; the few
     listed German-name/genus pairs are "name" matches (species not further specified). Ornamental
     forms, horse chestnut ("Roßkastanie"), tree hazel, rowan and whitebeam are deliberately absent. */
  const EDIBLE_TREE_SPECIES = [
    { key: "apfel", label: "Apfel", category: "fruit", botanical: ["malus domestica"],
      names: [["apfel", "malus"]], aliases: ["apfel", "apfelbaum", "apfelbaume"] },
    { key: "birne", label: "Birne", category: "fruit", botanical: ["pyrus communis"],
      names: [["birne", "pyrus"]], aliases: ["birne", "birnbaum", "birnbaume", "birnenbaum", "birnenbaume"] },
    { key: "kirsche", label: "Kirsche", category: "fruit", botanical: ["prunus avium"],
      names: [["kirsche", "prunus"]], aliases: ["kirsche", "kirschen", "kirschbaum", "kirschbaume"] },
    { key: "pflaume", label: "Pflaume", category: "fruit",
      botanical: ["prunus domestica", "prunus domestica italica", "prunus domestica syriaca"], names: [],
      aliases: ["pflaume", "pflaumenbaum", "pflaumenbaume", "zwetschge", "zwetschgen", "zwetschgenbaum"] },
    { key: "aprikose", label: "Aprikose", category: "fruit", botanical: ["prunus armeniaca"], names: [],
      aliases: ["aprikose", "aprikosenbaum", "aprikosenbaume"] },
    { key: "mandel", label: "Mandel", category: "nut",
      botanical: ["prunus dulcis", "prunus dulcis dulcis durkheimer krachmandel"], names: [],
      aliases: ["mandel", "mandelbaum", "mandelbaume"] },
    { key: "walnuss", label: "Walnuss", category: "nut", botanical: ["juglans regia"], names: [],
      aliases: ["walnuss", "walnussbaum", "walnussbaume", "walnusse"] },
    { key: "esskastanie", label: "Esskastanie", category: "nut", botanical: ["castanea sativa"],
      names: [["marone, esskastanie", "castanea"]],
      aliases: ["esskastanie", "esskastanien", "edelkastanie", "edelkastanien", "marone", "maronen"] },
    { key: "hasel", label: "Hasel", category: "nut", botanical: ["corylus avellana"],
      names: [["hasel", "corylus"]], aliases: ["hasel", "haselnuss", "haselnusse", "haselbaum"] },
  ];
  const CATEGORY_ALIASES = {
    fruit: ["obst", "obstbaum", "obstbaume"],
    nut: ["nuss", "nusse", "nussbaum", "nussbaume"],
  };
  const CATEGORY_LABEL = { fruit: "Obstbäume", nut: "Nussbäume" };
  const EDIBLE_NOTE =
    "Im Baumkataster sind Baumarten erfasst, die grundsätzlich essbare Früchte oder Nüsse tragen können. Ob Früchte vor Ort zur Ernte freigegeben und tatsächlich zum Verzehr geeignet sind, geht aus den Daten nicht hervor.";

  const norm = (value) => String(value ?? "").toLocaleLowerCase("de").normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
  const byBotanical = new Map();
  const byPair = new Map();
  const byKey = new Map();
  const byAlias = new Map();
  for (const entry of EDIBLE_TREE_SPECIES) {
    byKey.set(entry.key, entry);
    for (const name of entry.botanical) byBotanical.set(name, entry);
    for (const [german, botanical] of entry.names) byPair.set(`${german}|${botanical}`, entry);
    for (const alias of entry.aliases) byAlias.set(alias, entry);
  }

  function edibleInfo(german, botanical) {
    const latin = norm(botanical).trim();
    const species = byBotanical.get(latin);
    if (species) return { entry: species, match: "species" };
    const named = byPair.get(`${norm(german).trim()}|${latin}`);
    return named ? { entry: named, match: "name" } : null;
  }
  // 107k rows share only a few hundred distinct German/botanical pairs, so the result is cached per pair.
  const pairCache = new Map();
  function rowInfo(row) {
    const key = `${row[3]}|${row[4]}`;
    let info = pairCache.get(key);
    if (!info) {
      info = { text: norm(`${row[3]} ${row[4]}`), edible: edibleInfo(row[3], row[4]) };
      pairCache.set(key, info);
    }
    return info;
  }
  const featureInfo = (properties) => ({
    text: norm(`${properties.species || ""} ${properties.botanical || ""}`),
    edible: edibleInfo(properties.species, properties.botanical || properties.species),
  });
  function resolveSpecies(text) {
    const word = norm(text).trim();
    const entry = byAlias.get(word);
    if (entry) return { key: entry.key };
    for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
      if (aliases.includes(word)) return { category };
    }
    return null;
  }

  const data = () => window.GreenData;
  const trees = () => window.GreenTrees;
  const reports = () => window.GreenReports;
  const atlas = () => window.GreenAtlas;
  const map = () => atlas()?.getMap?.();
  let knownDistricts;
  const districtNames = () => {
    if (knownDistricts) return knownDistricts;
    const names = new Set(data().collection.features.map((f) => f.properties.district).filter(Boolean));
    trees().forEachRow((row) => { if (row[6]) names.add(row[6]); });
    knownDistricts = [...names];
    return knownDistricts;
  };
  const resolveDistrict = (value) => districtNames().find((name) => norm(name) === norm(value));
  const resolveDistrictParam = (value) => {
    const district = resolveDistrict(str(value, 60));
    if (!district) fail("Diesen Kölner Stadtteil kenne ich nicht.");
    return district;
  };
  const themeList = (value) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > data().themes.length) fail("Ungültige Themenliste.");
    const themes = [...new Set(value.map((id) => themeParam(id)))];
    if (themes.length !== value.length) fail("Themen dürfen nicht doppelt vorkommen.");
    return themes;
  };
  const log = (event, detail) => console.debug(`[GreenAI] ${event}`, detail ?? "");
  const number = (value) => value.toLocaleString("de-DE");
  const plural = (n, one, many) => `${number(n)} ${n === 1 ? one : many}`;
  const distanceText = (meters) =>
    meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace(".", ",").replace(/,0$/, "")} km`;
  const dateText = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("de-DE");
  };

  class Rejected extends Error {}
  const fail = (message) => {
    throw new Rejected(message);
  };

  /* ---------- validation ---------- */
  const str = (value, max = 40) => (typeof value === "string" ? value.replace(/[<>]/g, "").trim().slice(0, max) : "");
  const int = (value, min, max, fallback) => {
    const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
  };
  function themeParam(value, { reports: allowReports = false, required = true } = {}) {
    if (value === undefined || value === null || value === "") {
      if (required) fail("Für diese Aktion fehlt ein Thema.");
      return undefined;
    }
    if (allowReports && value === REPORTS) return REPORTS;
    if (typeof value !== "string" || !data().theme(value)) fail("Unbekanntes Thema.");
    return value;
  }
  function treeParams(raw, themeId) {
    const out = {};
    if (raw.edible !== undefined) {
      if (typeof raw.edible !== "boolean") fail("Ungültiger Parameter edible.");
      out.edible = raw.edible;
    }
    if (raw.edible_category !== undefined) {
      if (!CATEGORY_LABEL[raw.edible_category]) fail("Ungültige Kategorie.");
      out.edible_category = raw.edible_category;
    }
    if (raw.species !== undefined) out.species = str(raw.species);
    if (Object.keys(out).length && themeId && themeId !== "trees") fail("Baumfilter gelten nur für Bäume.");
    return out;
  }
  function reportParams(raw) {
    const out = {};
    if (raw.status !== undefined) {
      if (!STATUSES.includes(raw.status)) fail("Ungültiger Status.");
      out.status = raw.status;
    }
    if (raw.category !== undefined) {
      const codes = ["all", ...reports().services.map((service) => service.code)];
      if (!codes.includes(raw.category)) fail("Ungültige Meldungskategorie.");
      out.category = raw.category;
    }
    if (raw.text !== undefined) out.text = str(raw.text, 30);
    return out;
  }
  function findFeature(id) {
    if (typeof id !== "string") return null;
    if (id.startsWith("report-")) return reports().get(id);
    return data().collection.features.find((feature) => feature.id === id) || trees().get(id);
  }

  // Returns { ok: true, action } with only known, checked fields, or { ok: false, message }.
  function validate(raw) {
    try {
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || typeof raw.type !== "string") {
        fail("Diese Aktion kann ich nicht ausführen.");
      }
      if (PLANNED_ACTIONS.includes(raw.type)) {
        return { ok: false, planned: true, message: "Diese Funktion ist noch nicht verfügbar. Routen und Flächenanalysen sind für eine spätere Ausbaustufe vorgesehen." };
      }
      if (!ALLOWED_ACTIONS.includes(raw.type)) fail("Diese Aktion kann ich nicht ausführen.");
      const action = { type: raw.type };
      switch (raw.type) {
        case "show_theme":
        case "hide_theme":
        case "zoom_to_theme":
          action.theme = themeParam(raw.theme);
          break;
        case "show_object":
        case "zoom_to_object":
          action.id = str(raw.id, 80);
          if (!findFeature(action.id)) fail("Dieses Objekt kenne ich nicht.");
          break;
        case "search_features":
          action.query = str(raw.query);
          if (action.query.length < 2) fail("Die Suche braucht mindestens zwei Zeichen.");
          action.theme = themeParam(raw.theme, { required: false });
          action.limit = int(raw.limit, 1, 20, 10);
          break;
        case "filter_features": {
          action.theme = themeParam(raw.theme ?? "trees");
          if (raw.zoom_results !== undefined && typeof raw.zoom_results !== "boolean") fail("Ungültiger Parameter zoom_results.");
          action.zoom_results = raw.zoom_results !== false;
          if (raw.clear !== undefined) {
            if (typeof raw.clear !== "boolean") fail("Ungültiger Parameter clear.");
            action.clear = raw.clear;
          }
          Object.assign(action, treeParams(raw, action.theme));
          if (raw.filters !== undefined) {
            const allowed = data().theme(action.theme).filters;
            const entries = raw.filters && typeof raw.filters === "object" && !Array.isArray(raw.filters)
              ? Object.entries(raw.filters) : fail("Ungültige Filter.");
            if (entries.length > 3 || entries.some(([key, value]) => !Object.prototype.hasOwnProperty.call(allowed, key) || typeof value !== "string")) {
              fail("Unbekannter Filter.");
            }
            action.filters = Object.fromEntries(entries.map(([key, value]) => [key, str(value, 60)]));
          }
          if (!action.clear && !action.filters && action.edible === undefined && !action.edible_category && !action.species) {
            fail("Für den Filter fehlt eine Angabe.");
          }
          break;
        }
        case "count_features":
        case "list_features":
          action.theme = themeParam(raw.theme, { reports: true, required: raw.type === "list_features" });
          action.scope = raw.scope === undefined ? "viewport" : SCOPES.includes(raw.scope) ? raw.scope : fail("Ungültiger Bereich.");
          if (raw.type === "list_features") {
            action.limit = int(raw.limit, 1, 20, 10);
            if (raw.group_by !== undefined) {
              if (raw.group_by !== "species" || action.theme !== "trees") fail("Ungültige Gruppierung.");
              action.group_by = "species";
            }
          }
          if (action.theme === REPORTS) Object.assign(action, reportParams(raw));
          else Object.assign(action, treeParams(raw, action.theme ?? "trees"));
          if (raw.district !== undefined) {
            action.district = resolveDistrict(str(raw.district, 60));
            if (!action.district) fail("Diesen Kölner Stadtteil kenne ich nicht.");
          }
          break;
        case "rank_trees":
          action.metric = ["planting_year", "height", "trunk", "crown"].includes(raw.metric) ? raw.metric : fail("Unbekanntes Baummerkmal.");
          action.scope = raw.scope === undefined ? "viewport" : SCOPES.includes(raw.scope) ? raw.scope : fail("Ungültiger Bereich.");
          action.limit = int(raw.limit, 1, 10, 5);
          if (raw.district !== undefined) {
            action.district = resolveDistrict(str(raw.district, 60));
            if (!action.district) fail("Diesen Kölner Stadtteil kenne ich nicht.");
          }
          break;
        case "rank_districts":
          action.metric = raw.metric === "tree_count" ? "tree_count" : fail("Unbekannte Stadtteil-Auswertung.");
          action.limit = int(raw.limit, 1, 10, 5);
          break;
        case "set_layers":
          action.themes = themeList(raw.themes);
          action.mode = raw.mode === undefined ? "replace" : ["replace", "add"].includes(raw.mode) ? raw.mode : fail("Ungültiger Ebenenmodus.");
          break;
        case "spatial_analysis":
          action.theme = themeParam(raw.theme, { required: false });
          action.scope = raw.scope === undefined ? "viewport" : SCOPES.includes(raw.scope) ? raw.scope : fail("Ungültiger Bereich.");
          if (raw.district !== undefined) {
            action.district = resolveDistrictParam(raw.district);
            action.scope = "all_loaded";
          }
          action.show_layer = raw.show_layer !== false;
          break;
        case "compare_areas": {
          action.theme = themeParam(raw.theme, { required: false });
          if (!Array.isArray(raw.districts) || raw.districts.length < 2) fail("Für den Vergleich brauche ich genau zwei Stadtteile.");
          action.districts = raw.districts.slice(0, 2).map(resolveDistrictParam);
          if (action.districts[0] === action.districts[1]) fail("Bitte nenne zwei unterschiedliche Stadtteile.");
          break;
        }
        case "green_access_analysis":
          action.themes = raw.themes === undefined ? ["parks", "gardens", "play", "water"] : themeList(raw.themes);
          action.radius_m = int(raw.radius_m, MIN_RADIUS, MAX_RADIUS, 1000);
          action.origin = raw.origin === undefined ? "user" : ["user", "selected", "object"].includes(raw.origin) ? raw.origin : fail("Ungültiger Ausgangspunkt.");
          if (action.origin === "object") {
            action.object_id = str(raw.object_id, 80);
            if (!findFeature(action.object_id)) fail("Diesen Ausgangsort kenne ich nicht.");
          }
          action.show_layers = raw.show_layers !== false;
          break;
        case "maintenance_analysis":
          action.scope = raw.scope === undefined ? "viewport" : SCOPES.includes(raw.scope) ? raw.scope : fail("Ungültiger Bereich.");
          action.status = raw.status === undefined ? "open" : STATUSES.includes(raw.status) ? raw.status : fail("Ungültiger Status.");
          if (raw.category !== undefined) Object.assign(action, reportParams({ category: raw.category }));
          action.show_layer = raw.show_layer !== false;
          break;
        case "tree_structure_analysis":
          action.scope = raw.scope === undefined ? "viewport" : SCOPES.includes(raw.scope) ? raw.scope : fail("Ungültiger Bereich.");
          if (raw.district !== undefined) {
            action.district = resolveDistrictParam(raw.district);
            action.scope = "all_loaded";
          }
          break;
        case "find_nearby":
          action.theme = themeParam(raw.theme);
          action.radius_m = int(raw.radius_m, MIN_RADIUS, MAX_RADIUS, 1000);
          action.origin = raw.origin === undefined ? "user" : ["user", "selected", "object"].includes(raw.origin) ? raw.origin : fail("Ungültiger Ausgangspunkt.");
          if (action.origin === "object") {
            action.object_id = str(raw.object_id, 80);
            if (!findFeature(action.object_id)) fail("Diesen Ausgangsort kenne ich nicht.");
          }
          action.limit = int(raw.limit, 1, 10, 5);
          Object.assign(action, treeParams(raw, action.theme));
          break;
        case "show_reports":
          if (raw.visible !== undefined && typeof raw.visible !== "boolean") fail("Ungültiger Parameter visible.");
          action.visible = raw.visible !== false;
          break;
        case "filter_reports":
          Object.assign(action, reportParams(raw));
          if (!Object.keys(action).some((key) => key !== "type")) fail("Für den Filter fehlt eine Angabe.");
          break;
        default: // get_map_context takes no parameters
      }
      return { ok: true, action };
    } catch (error) {
      if (error instanceof Rejected) return { ok: false, message: error.message };
      throw error;
    }
  }

  /* ---------- tree predicates ---------- */
  // Null when the action has no tree criteria. Predicates get a cadastre row or an OSM feature.
  function treeSpec(action) {
    const named = action.species ? resolveSpecies(action.species) : null;
    const entry = named?.key ? byKey.get(named.key) : null;
    const category = action.edible_category || named?.category || null;
    const edible = action.edible === true || !!entry || !!category;
    const speciesText = action.species && !named ? norm(action.species).trim() : "";
    if (!edible && !speciesText) return null;
    const test = (info) => {
      if (edible) {
        if (!info.edible) return false;
        if (entry && info.edible.entry !== entry) return false;
        if (category && info.edible.entry.category !== category) return false;
      }
      return !speciesText || info.text.includes(speciesText);
    };
    return {
      edible,
      label: entry ? `${entry.label}-Bäume` : category ? CATEGORY_LABEL[category]
        : edible ? "essbare Bäume" : `Bäume der Art „${action.species}“`,
      row: (row) => test(rowInfo(row)),
      feature: (feature) => test(featureInfo(feature.properties)),
    };
  }

  /* ---------- geometry and data gathering ---------- */
  function haversine(lon1, lat1, lon2, lat2) {
    const rad = Math.PI / 180;
    const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
    return 2 * 6371008.8 * Math.asin(Math.sqrt(a));
  }
  function boxAround(lon, lat, radiusM) {
    const dLat = radiusM / 111320;
    const dLon = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
    return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
  }
  const boxCenter = (bounds) => ({ lon: (bounds[0] + bounds[2]) / 2, lat: (bounds[1] + bounds[3]) / 2 });
  const inBox = (bounds, lon, lat) => lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3];

  /* Counts matches and keeps the `keep` items closest to `center`.
     area: { bounds } (viewport), { center, radiusM } (nearby) or {} (everything loaded). */
  function gather({ themeId, area = {}, tree = null, center, keep = 0, groupBy = null, district = null }) {
    const out = { total: 0, cadastre: 0, osm: 0, nameOnly: 0, unassigned: 0, byTheme: new Map(), groups: new Map(), items: [] };
    const middle = center || (area.bounds ? boxCenter(area.bounds) : area.center) || COLOGNE_CENTER;
    const inArea = (lon, lat) => {
      if (area.bounds) return inBox(area.bounds, lon, lat);
      if (area.center) return haversine(area.center.lon, area.center.lat, lon, lat) <= area.radiusM;
      return true;
    };
    const take = (theme, lon, lat, source, groupKey, entryInfo, ref) => {
      out.total += 1;
      out[source] += 1;
      out.byTheme.set(theme, (out.byTheme.get(theme) || 0) + 1);
      if (entryInfo?.match === "name") out.nameOnly += 1;
      if (groupBy && theme === "trees") out.groups.set(groupKey, (out.groups.get(groupKey) || 0) + 1);
      if (keep) {
        out.items.push({ ref, source, lon, lat, theme, distance: haversine(middle.lon, middle.lat, lon, lat) });
        if (out.items.length > keep * 4 + 40) {
          out.items.sort((a, b) => a.distance - b.distance);
          out.items.length = keep;
        }
      }
    };
      for (const feature of data().collection.features) {
        const theme = feature.properties.theme;
        if ((themeId && theme !== themeId) || (tree && theme !== "trees") || (tree && !tree.feature(feature))) continue;
        const [lon, lat] = feature.geometry.coordinates;
        if (!inArea(lon, lat)) continue;
        if (district && norm(feature.properties.district) !== norm(district)) {
          if (!feature.properties.district) out.unassigned++;
          continue;
        }
      const info = theme === "trees" && groupBy ? featureInfo(feature.properties) : null;
      const label = tree?.edible && groupBy ? info?.edible?.entry.label : feature.properties.species || "ohne Artangabe";
      take(theme, lon, lat, "osm", label, info?.edible, feature);
    }
    if ((!themeId || themeId === "trees") && trees().ready) {
      const visit = (row) => {
        if (tree && !tree.row(row)) return true;
        if (district && norm(row[6]) !== norm(district)) return true;
        if (area.center && !inArea(row[1], row[2])) return true;
        const info = tree?.edible || groupBy ? rowInfo(row) : null;
        const label = tree?.edible && groupBy ? info.edible.entry.label : row[3] || row[4] || "ohne Artangabe";
        take("trees", row[1], row[2], "cadastre", label, info?.edible, row);
        return true;
      };
      if (area.bounds) trees().forEachInBounds(area.bounds, visit);
      else if (area.center) trees().forEachInBounds(boxAround(area.center.lon, area.center.lat, area.radiusM), visit);
      else trees().forEachRow(visit);
    }
    out.items.sort((a, b) => a.distance - b.distance);
    out.items = out.items.slice(0, keep).map((item) => ({
      ...item, feature: item.source === "cadastre" ? trees().toFeature(item.ref) : item.ref,
    }));
    return out;
  }

  const requireMap = () => map() || fail("Die Karte ist noch nicht bereit.");
  function viewportBounds() {
    const bounds = requireMap().viewBounds();
    if (!bounds) fail("Der Kartenausschnitt ist gerade nicht bestimmbar.");
    return bounds;
  }
  const areaFor = (scope) => (scope === "all_loaded" ? {} : { bounds: viewportBounds() });

  /* ---------- answer text ---------- */
  const sourceOf = (feature) => feature.properties.sourceKind === "cadastre" ? "Baumkataster Stadt Köln"
    : data().dataMode === "osm" ? "OpenStreetMap" : "Demo";
  function sourceNote(themeId) {
    const osm = data().dataMode === "osm";
    const cadastre = trees().ready ? `Baumkataster Stadt Köln (Stand ${dateText(trees().dataAsOf)}, betreute Einzelbäume, nicht alle Bäume)` : "";
    if (themeId === "trees") return `Quellen: ${[cadastre, osm ? "OpenStreetMap-Auszug (nur benannte Bäume)" : "Demo-Daten"].filter(Boolean).join(" und ")}.`;
    if (!themeId) return `Quellen: ${osm ? "OpenStreetMap-Auszug" : "Demo-Daten"}${cadastre ? ` und ${cadastre}` : ""}; keine Vollerhebung.`;
    return osm ? "Quelle: OpenStreetMap-Auszug, kein vollständiger oder amtlicher Bestand." : "Quelle: Demo-Daten, keine amtlichen Angaben.";
  }
  function visibilityNote(themeId) {
    const notes = [];
    if (themeId && themeId !== REPORTS && !requireMap().visible.has(themeId)) notes.push("Die Ebene ist auf der Karte ausgeblendet.");
    if ((!themeId || themeId === "trees") && trees().ready && requireMap().cameraHeight() > TREE_RENDER_HEIGHT) {
      notes.push("Einzelbäume erscheinen auf der Karte erst bei näherem Zoom.");
    }
    return notes.join(" ");
  }
  const scopeText = (scope) => (scope === "all_loaded" ? "im geladenen Datensatz" : "im aktuellen Kartenausschnitt");
  const joinParts = (...parts) => parts.filter(Boolean).join(" ");
  const upFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  function line(item) {
    const feature = item.feature;
    const place = feature.properties.place && feature.properties.place !== "Köln" ? ` (${feature.properties.place})` : "";
    const number0 = feature.properties.treeNumber ? ` · Baum-Nr. ${feature.properties.treeNumber}` : "";
    return `• ${feature.properties.name}${place}${number0}${item.showDistance ? ` · ${distanceText(item.distance)}` : ""} · ${sourceOf(feature)}`;
  }
  function groupLines(result, limit = 12) {
    const groups = [...result.groups.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
    const shown = groups.slice(0, limit).map(([name, count]) => `• ${name}: ${number(count)}`);
    if (groups.length > limit) shown.push(`• … und ${groups.length - limit} weitere Arten`);
    return shown;
  }

  /* ---------- reports ---------- */
  const REPORTS_UNAVAILABLE = "Die Grünmeldungen konnten momentan nicht geladen werden.";
  async function loadedReports() {
    try {
      await atlas().loadReports();
    } catch {
      fail(REPORTS_UNAVAILABLE);
    }
  }
  function reportRows(action, bounds) {
    return reports().filter(action.category || "all", action.status || "all", action.text || "")
      .filter((report) => !bounds || inBox(bounds, report.coordinates.lng, report.coordinates.lat));
  }
  const STATUS_ADJECTIVE = { open: "offene", in_progress: "in Bearbeitung befindliche", closed: "abgeschlossene" };
  function reportLabel(action) {
    return joinParts(STATUS_ADJECTIVE[action.status], "Grünmeldungen",
      action.text ? `mit „${action.text}“ in Beschreibung oder Adresse` : "");
  }
  function reportSource() {
    const when = reports().fetchedAt ? new Date(reports().fetchedAt).toLocaleString("de-DE") : "";
    return `Quelle: Sag's uns Köln, öffentliche Meldungen der letzten 30 Tage (${reports().snapshot ? "Archivstand" : "Abruf"} ${when}). Es gibt keine eigene Baum-Kategorie.`;
  }
  async function reportQuery(action, list) {
    await loadedReports();
    const bounds = action.scope === "all_loaded" ? null : viewportBounds();
    const rows = reportRows(action, bounds);
    const head = `${upFirst(reportLabel(action))} ${scopeText(action.scope)}: ${number(rows.length)} (${number(reports().reports.length)} Meldungen geladen).`;
    const hidden = requireMap().reportVisible ? "" : "Die Meldungsebene ist ausgeblendet; „Zeige Grünmeldungen“ blendet sie ein.";
    const lines = list ? rows.slice(0, action.limit).map((report) =>
      `• #${report.id} · ${report.category} · ${STATUS_LABEL[report.status] || "Status unbekannt"}${report.address ? ` · ${report.address}` : ""}`) : [];
    if (list && rows.length > lines.length) lines.push(`• … und ${number(rows.length - lines.length)} weitere`);
    return { ok: true, kind: "query", message: [joinParts(head, hidden), ...lines, reportSource()].join("\n") };
  }

  /* ---------- action execution ---------- */
  function nearbyOrigin(action) {
    if (action.origin === "selected" || action.origin === "object") {
      const id = action.origin === "object" ? action.object_id : atlas().getSelectedId();
      const feature = id && findFeature(id);
      if (!feature) return { message: "Wähle zuerst einen Ort auf der Karte aus, dann kann ich die Umgebung dieses Punkts durchsuchen." };
      const [lon, lat] = feature.geometry?.coordinates || [feature.coordinates.lng, feature.coordinates.lat];
      return { center: { lon, lat }, name: `„${feature.properties?.name || `Meldung #${feature.id}`}“` };
    }
    const location = atlas().getUserLocation();
    if (!location) return { message: "Für eine Suche in deiner Nähe benötige ich deinen Standort. Nutze dafür den Standort Button im GrünAtlas." };
    return { center: { lon: location.lon, lat: location.lat }, name: "deinen Standort" };
  }

  const CARE_TOPICS = [
    ["Baumkontrolle & Äste", /baum|ast|krone|stamm|umgesturzt|standfest/],
    ["Rückschnitt & Bewuchs", /ruckschnitt|schneid|hecke|gebusch|bewuchs|zugewachsen|grunzeug/],
    ["Sauberkeit & Abfall", /mull|abfall|ratte|verschmutz|unrat/],
    ["Wege & Verkehrssicherheit", /weg|gehweg|radweg|stolper|gefahr|verkehrssicher/],
    ["Spiel- und Freizeitanlagen", /spiel|bolz|gerat|schaukel|rutsche|kletter/],
  ];
  function careTopic(report) {
    const text = norm(`${report.category} ${report.description}`);
    return CARE_TOPICS.find(([, pattern]) => pattern.test(text))?.[0] || "Sonstige Grünpflege";
  }
  const median = (values) => {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };

  const runners = {
    show_theme(action) {
      const theme = data().theme(action.theme);
      atlas().setThemeVisible(action.theme, true);
      const features = requireMap().context(action.theme);
      const label = data().dataMode === "osm" ? "OSM-Orte" : "Demo-Orte";
      const names = features.slice(0, 6).map((f) => f.properties.name);
      return {
        kind: "map",
        message: joinParts(`${theme.layer} ist eingeblendet. ${features.length} passende ${label} liegen im aktuellen Kartenausschnitt${
          names.length ? `: ${names.join(", ")}${features.length > 6 ? ` und ${features.length - 6} weitere.` : "."}` : ". Zoome heraus, um weitere Orte zu entdecken."}`,
        visibilityNote(action.theme), sourceNote(action.theme)),
      };
    },
    hide_theme(action) {
      atlas().setThemeVisible(action.theme, false);
      return { kind: "map", message: `${data().theme(action.theme).layer} ist ausgeblendet.` };
    },
    zoom_to_theme(action) {
      atlas().setThemeVisible(action.theme, true);
      const found = requireMap().zoomTheme(action.theme);
      return { kind: "map", message: found ? `Die Karte zeigt alle Orte von „${data().theme(action.theme).name}“.` : "Für dieses Thema gibt es im geladenen Datensatz keine Orte." };
    },
    show_object(action) {
      atlas().showObject(action.id);
      const feature = findFeature(action.id);
      return { kind: "map", message: `Ich zeige „${feature.properties?.name || `Meldung #${feature.id}`}“ auf der Karte.` };
    },
    zoom_to_object(action) {
      const feature = findFeature(action.id);
      if (action.id.startsWith("report-")) requireMap().focusReport(feature);
      else requireMap().focus(action.id);
      return { kind: "map", message: `Die Karte zoomt auf „${feature.properties?.name || `Meldung #${feature.id}`}“.` };
    },
    search_features(action) {
      const osm = data().search(action.query, action.theme);
      const city = !action.theme || action.theme === "trees" ? trees().search(action.query, action.limit) : [];
      const all = [...osm, ...city];
      const lines = all.slice(0, action.limit).map((feature) =>
        `• ${feature.properties.name} (${feature.properties.place}) · ${sourceOf(feature)}`);
      return {
        kind: "query",
        message: all.length
          ? [`${plural(all.length, "Treffer", "Treffer")} für „${action.query}“${all.length > lines.length ? ` (zeige ${lines.length})` : ""}:`, ...lines, sourceNote(action.theme)].join("\n")
          : `Zu „${action.query}“ gibt es im geladenen Datensatz keinen Treffer. ${sourceNote(action.theme)}`,
      };
    },
    filter_features(action) {
      const map0 = requireMap();
      if (action.clear) {
        if (action.theme === "trees") map0.setTreeFilter(null);
        else map0.setFilter(action.theme, {});
        return { kind: "map", message: `Filter für „${data().theme(action.theme).name}“ zurückgesetzt.` };
      }
      atlas().setThemeVisible(action.theme, true);
      const spec = action.theme === "trees" ? treeSpec(action) : null;
      if (spec) {
        map0.setTreeFilter({ row: spec.row, feature: spec.feature, label: spec.label });
        const inView = gather({ themeId: "trees", area: areaFor("viewport"), tree: spec });
        const total = gather({ themeId: "trees", tree: spec,
          ...(action.zoom_results && { center: boxCenter(viewportBounds()), keep: 1 }) });
        const nearest = action.zoom_results ? total.items[0] : null;
        if (nearest) map0.focus(nearest.feature.id);
        else if (trees().ready && map0.cameraHeight() > TREE_RENDER_HEIGHT) map0.flyToView(TREE_ZOOM_HEIGHT);
        return {
          kind: "map",
          message: joinParts(
            `Auf der Karte werden nur noch ${spec.label} gezeigt.`,
            `Im bisherigen Kartenausschnitt: ${number(inView.total)}, im geladenen Datensatz insgesamt: ${number(total.total)}.`,
            spec.edible && total.nameOnly ? `${number(total.nameOnly)} davon sind nur über den Katasternamen zugeordnet (Art nicht näher bestimmt).` : "",
            nearest ? `Die Karte zoomt zum nächstgelegenen Treffer „${nearest.feature.properties.name}“. Weitere passende Marker in der Umgebung sind anklickbar.` : "",
            sourceNote("trees"), spec.edible ? EDIBLE_NOTE : ""),
        };
      }
      const wanted = action.filters || {};
      const options = data().search("", action.theme);
      const known = {};
      for (const [key, value] of Object.entries(wanted)) {
        const match = options.map((feature) => feature.properties[key]).find((candidate) => candidate && norm(candidate) === norm(value));
        if (!match) fail(`Für „${data().theme(action.theme).filters[key]}“ gibt es den Wert „${value}“ nicht.`);
        known[key] = match;
      }
      map0.setFilter(action.theme, known);
      return { kind: "map", message: `Filter gesetzt: ${data().filtered(action.theme, known).length} passende Orte. ${sourceNote(action.theme)}` };
    },
    async count_features(action) {
      if (action.theme === REPORTS) return reportQuery(action, false);
      const spec = treeSpec(action);
      const result = gather({ themeId: action.theme, area: areaFor(action.scope), tree: spec, district: action.district });
      const subject = spec ? spec.label : action.theme === "trees" ? "Bäume"
        : action.theme ? `Orte der Kategorie „${data().theme(action.theme).name}“` : "Orte";
      const parts = [`${upFirst(subject)} ${action.district ? `in ${action.district} ` : ""}${scopeText(action.scope)}: ${number(result.total)}.`];
      if (action.theme === "trees" || (!action.theme && result.cadastre)) {
        parts.push(`Davon Baumkataster ${number(result.cadastre)}, OpenStreetMap ${number(result.osm)}.`);
      }
      if (!action.theme) {
        const rows = [...result.byTheme.entries()].map(([id, count]) => `• ${data().theme(id).name}: ${number(count)}`);
        parts.push(rows.join("\n"));
      }
      if (spec?.edible && result.nameOnly) parts.push(`${number(result.nameOnly)} davon nur über den Katasternamen zugeordnet (Art nicht näher bestimmt).`);
      parts.push(visibilityNote(action.theme), sourceNote(action.theme), spec?.edible ? EDIBLE_NOTE : "");
      if (result.unassigned) parts.push(`${number(result.unassigned)} OSM-Orte ohne eindeutige Stadtteilzuordnung wurden nicht mitgezählt.`);
      return { kind: "query", message: parts.filter(Boolean).join("\n") };
    },
    async list_features(action) {
      if (action.theme === REPORTS) return reportQuery(action, true);
      const spec = treeSpec(action);
      const grouped = action.group_by === "species";
      const result = gather({ themeId: action.theme, area: areaFor(action.scope), tree: spec, keep: grouped ? 0 : action.limit, groupBy: grouped ? "species" : null, district: action.district });
      const subject = spec ? spec.label : data().theme(action.theme).name;
      let body;
      if (!result.total) body = [`Für „${subject}“ gibt es ${scopeText(action.scope)} keine Treffer.`];
      else if (grouped) body = [`${spec?.edible ? "Essbare Baumarten" : "Baumarten"} ${scopeText(action.scope)} (${number(result.total)} Bäume):`, ...groupLines(result)];
      else {
        const items = result.items.map((item) => ({ ...item, showDistance: false }));
        body = [`${plural(result.total, "Treffer", "Treffer")} für „${subject}“ ${scopeText(action.scope)}${result.total > items.length ? `, die ${items.length} nächsten zur Kartenmitte` : ""}:`, ...items.map(line)];
      }
      if (grouped && spec?.edible && result.nameOnly) body.push(`${number(result.nameOnly)} davon nur über den Katasternamen zugeordnet (Art nicht näher bestimmt).`);
      if (action.district) body.unshift(`Stadtteil: ${action.district}.`);
      if (result.unassigned) body.push(`${number(result.unassigned)} OSM-Orte ohne eindeutige Stadtteilzuordnung wurden nicht berücksichtigt.`);
      return { kind: "query", message: [...body, joinParts(visibilityNote(action.theme), sourceNote(action.theme), spec?.edible ? EDIBLE_NOTE : "")].join("\n") };
    },
    rank_trees(action) {
      const indices = { planting_year: 7, height: 9, trunk: 8, crown: 10 };
      const labels = { planting_year: "Älteste Bäume nach erfasstem Pflanzjahr", height: "Größte Bäume nach erfasster Höhe",
        trunk: "Bäume mit größtem erfassten Stammdurchmesser", crown: "Bäume mit größtem erfassten Kronendurchmesser" };
      const bounds = action.scope === "viewport" ? viewportBounds() : null;
      const found = [];
      let eligible = 0, missing = 0;
      trees().forEachRow((row) => {
        if (bounds && !inBox(bounds, row[1], row[2])) return;
        if (action.district && norm(row[6]) !== norm(action.district)) return;
        const value = Number(row[indices[action.metric]]);
        if (!Number.isFinite(value) || value <= 0 || (action.metric === "planting_year" && (value < 1700 || value > new Date().getFullYear()))) { missing++; return; }
        eligible++;
        found.push({ row, value });
      });
      found.sort((a, b) => (action.metric === "planting_year" ? a.value - b.value : b.value - a.value) || a.row[0].localeCompare(b.row[0]));
      const lines = found.slice(0, action.limit).map(({ row, value }) => `• ${row[3] || row[4] || "Baum"} · ${row[5] || row[6] || "Köln"} · Baum-Nr. ${row[0].split("@")[0]} · ${action.metric === "planting_year" ? `erfasstes Pflanzjahr ${value}` : `${value} ${action.metric === "height" ? "m" : "cm"}`}`);
      return { kind: "query", message: [`${labels[action.metric]} ${action.district ? `in ${action.district} ` : ""}${scopeText(action.scope)}: ${number(eligible)} Datensätze mit Wert ausgewertet, ${number(missing)} ohne auswertbaren Wert.`,
        ...lines, "Quelle: Baumkataster Stadt Köln; nur betreute Einzelbäume, Angaben können fehlen."].join("\n") };
    },
    rank_districts(action) {
      const counts = new Map();
      let missing = 0;
      trees().forEachRow((row) => { if (row[6]) counts.set(row[6], (counts.get(row[6]) || 0) + 1); else missing++; });
      const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
      return { kind: "query", message: [`Stadtteile mit den meisten erfassten Bäumen: ${number(trees().count - missing)} Datensätze mit Stadtteil ausgewertet, ${number(missing)} ohne Stadtteil.`,
        ...ranked.slice(0, action.limit).map(([name, count]) => `• ${name}: ${number(count)}`),
        "Quelle: Baumkataster Stadt Köln; betreute Einzelbäume, kein vollständiger Baumbestand."].join("\n") };
    },
    set_layers(action) {
      const selected = new Set(action.themes);
      if (action.mode === "replace") {
        for (const theme of data().themes) atlas().setThemeVisible(theme.id, selected.has(theme.id));
      } else {
        for (const theme of action.themes) atlas().setThemeVisible(theme, true);
      }
      const labels = action.themes.map((id) => data().theme(id).name);
      return { kind: "map", message: `${action.mode === "replace" ? "Auf der Karte aktiv" : "Zusätzlich eingeblendet"}: ${labels.join(", ")}.` };
    },
    spatial_analysis(action) {
      if (action.theme && action.show_layer) atlas().setThemeVisible(action.theme, true);
      const result = gather({ themeId: action.theme, area: areaFor(action.scope), district: action.district });
      const place = action.district ? `in ${action.district}` : scopeText(action.scope);
      const subject = action.theme ? data().theme(action.theme).name : "alle geladenen GrünAtlas-Themen";
      const rows = action.theme ? [] : [...result.byTheme.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => `• ${data().theme(id).name}: ${number(count)}`);
      return {
        kind: "query",
        message: [
          `Geoanalyse für ${subject} ${place}: ${number(result.total)} erfasste Objekte.`,
          ...rows,
          action.theme === "trees" || (!action.theme && result.cadastre)
            ? `Baumkataster: ${number(result.cadastre)}, OpenStreetMap: ${number(result.osm)}.` : "",
          result.unassigned ? `${number(result.unassigned)} OSM-Orte ohne Stadtteilzuordnung wurden nicht berücksichtigt.` : "",
          sourceNote(action.theme),
          "Die Auswertung zählt geladene Punktobjekte; sie bewertet weder Flächengröße noch Versorgungsqualität.",
        ].filter(Boolean).join("\n"),
      };
    },
    compare_areas(action) {
      const results = action.districts.map((district) => ({
        district,
        result: gather({ themeId: action.theme, district }),
      }));
      const [first, second] = results;
      const difference = Math.abs(first.result.total - second.result.total);
      const leader = first.result.total === second.result.total ? null
        : first.result.total > second.result.total ? first : second;
      const subject = action.theme ? data().theme(action.theme).name : "erfasste GrünAtlas-Objekte";
      return {
        kind: "query",
        message: [
          `Stadtteilvergleich für ${subject}:`,
          ...results.map(({ district, result }) => `• ${district}: ${number(result.total)}`),
          leader ? `${leader.district} hat im geladenen Datensatz ${number(difference)} Einträge mehr.` : "Beide Stadtteile haben im geladenen Datensatz gleich viele Einträge.",
          sourceNote(action.theme),
          "Das ist ein Vergleich absoluter Datensatzzahlen, nicht pro Fläche oder Einwohnerzahl; fehlende Datensätze können das Ergebnis verzerren.",
        ].join("\n"),
      };
    },
    green_access_analysis(action) {
      const origin = nearbyOrigin(action);
      if (!origin.center) return { kind: "query", message: origin.message };
      if (action.show_layers) for (const theme of action.themes) atlas().setThemeVisible(theme, true);
      const rows = action.themes.map((theme) => ({
        theme,
        result: gather({ themeId: theme, area: { center: origin.center, radiusM: action.radius_m }, keep: 1, center: origin.center }),
      }));
      return {
        kind: "query",
        message: [
          `Grünraum-Versorgungscheck im Umkreis von ${distanceText(action.radius_m)} um ${origin.name}:`,
          ...rows.map(({ theme, result }) => {
            const nearest = result.items[0];
            return `• ${data().theme(theme).name}: ${number(result.total)} erfasst${nearest ? `; nächster Eintrag ${nearest.feature.properties.name} in ${distanceText(nearest.distance)}` : "; kein Eintrag im geladenen Datensatz"}.`;
          }),
          sourceNote(),
          "Der Check nutzt Luftlinien und erfasste Punktobjekte; Zugänge, Barrieren, Flächengrößen und tatsächliche Versorgungsqualität sind nicht bewertet.",
        ].join("\n"),
      };
    },
    async maintenance_analysis(action) {
      await loadedReports();
      const bounds = action.scope === "viewport" ? viewportBounds() : null;
      const rows = reportRows(action, bounds);
      const topics = new Map();
      for (const report of rows) {
        const topic = careTopic(report);
        topics.set(topic, (topics.get(topic) || 0) + 1);
      }
      if (action.show_layer) await atlas().setReports({ visible: true, status: action.status, category: action.category || "all" });
      const ranked = [...topics].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
      return {
        kind: "query",
        message: [
          `Pflege- und Meldungslage ${scopeText(action.scope)}: ${number(rows.length)} ${action.status === "all" ? "erfasste" : STATUS_ADJECTIVE[action.status]} Grünmeldungen.`,
          ...ranked.map(([topic, count]) => `• ${topic}: ${number(count)}`),
          reportSource(),
          "Die Themen werden aus Meldungstexten regelbasiert zugeordnet. Sie sind Hinweise für die Sichtung, keine fachliche Priorisierung oder Arbeitsanweisung.",
        ].join("\n"),
      };
    },
    tree_structure_analysis(action) {
      const bounds = action.scope === "viewport" ? viewportBounds() : null;
      const heights = [], crowns = [];
      let total = 0, young = 0, established = 0, old = 0, withoutYear = 0;
      const currentYear = new Date().getFullYear();
      trees().forEachRow((row) => {
        if (bounds && !inBox(bounds, row[1], row[2])) return;
        if (action.district && norm(row[6]) !== norm(action.district)) return;
        total++;
        const year = Number(row[7]);
        if (Number.isFinite(year) && year >= 1700 && year <= currentYear) {
          const age = currentYear - year;
          if (age < 20) young++; else if (age < 60) established++; else old++;
        } else withoutYear++;
        if (Number(row[9]) > 0) heights.push(Number(row[9]));
        if (Number(row[10]) > 0) crowns.push(Number(row[10]));
      });
      const place = action.district ? `in ${action.district}` : scopeText(action.scope);
      return {
        kind: "query",
        message: [
          `Baumstruktur-Check ${place}: ${number(total)} betreute Einzelbäume im Kataster.`,
          `• Pflanzalter aus erfasstem Pflanzjahr: ${number(young)} unter 20 Jahre, ${number(established)} 20 bis 59 Jahre, ${number(old)} mindestens 60 Jahre; ${number(withoutYear)} ohne auswertbares Pflanzjahr.`,
          `• Erfasste Höhe: ${number(heights.length)} Werte${heights.length ? `, Median ${number(median(heights))} m` : ""}.`,
          `• Erfasster Kronendurchmesser: ${number(crowns.length)} Werte${crowns.length ? `, Median ${number(median(crowns))} m` : ""}.`,
          "Quelle: Baumkataster Stadt Köln; Angaben können fehlen. Altersklassen beschreiben die Bestandsstruktur und sind keine Aussage zum Pflegezustand oder zur Verkehrssicherheit.",
        ].join("\n"),
      };
    },
    open_coolroutes() {
      atlas().activateAppView("labs");
      return { kind: "map", message: "Ich öffne Coolrouten Köln. Wähle dort Start und Ziel; Entfernungen und Kennzahlen werden erst aus dem Routingdienst und den geladenen Gründaten berechnet." };
    },
    find_nearby(action) {
      const origin = nearbyOrigin(action);
      if (!origin.center) return { kind: "query", message: origin.message };
      atlas().setThemeVisible(action.theme, true);
      const spec = treeSpec(action);
      const result = gather({ themeId: action.theme, area: { center: origin.center, radiusM: action.radius_m }, tree: spec, keep: action.limit, center: origin.center });
      const subject = spec ? spec.label : data().theme(action.theme).name;
      const head = result.total
        ? `${plural(result.total, "Treffer", "Treffer")} für „${subject}“ im Umkreis von ${distanceText(action.radius_m)} um ${origin.name} (Luftlinie, keine Route)${result.total > result.items.length ? `; die ${result.items.length} nächsten:` : ":"}`
        : `Im Umkreis von ${distanceText(action.radius_m)} um ${origin.name} gibt es für „${subject}“ keine Treffer im geladenen Datensatz. Der Datensatz ist nicht vollständig.`;
      const lines = result.items.map((item) => line({ ...item, showDistance: true }));
      return { kind: "query", message: [head, ...lines, joinParts(sourceNote(action.theme), spec?.edible ? EDIBLE_NOTE : "")].join("\n") };
    },
    async show_reports(action) {
      if (!(await atlas().setReports({ visible: action.visible }))) fail(REPORTS_UNAVAILABLE);
      if (!action.visible) return { kind: "map", message: "Die Grünmeldungen sind ausgeblendet." };
      const rows = reportRows(map().reportFilters, viewportBounds());
      return { kind: "map", message: `Die Grünmeldungen sind eingeblendet. Im aktuellen Kartenausschnitt: ${number(rows.length)} (${number(reports().reports.length)} Meldungen geladen). ${reportSource()}` };
    },
    async filter_reports(action) {
      const next = { ...requireMap().reportFilters, ...action };
      delete next.type;
      if (!(await atlas().setReports({ visible: true, ...next }))) fail(REPORTS_UNAVAILABLE);
      const rows = reportRows(next, viewportBounds());
      return { kind: "map", message: `Filter gesetzt. ${upFirst(reportLabel(next))} im aktuellen Kartenausschnitt: ${number(rows.length)}. ${reportSource()}` };
    },
    get_map_context() {
      const map0 = requireMap();
      const features = map0.context();
      const label = data().dataMode === "osm" ? "OSM-Orte" : "Demo-Orte";
      const themes = [...map0.visible].map((id) => data().theme(id).name);
      return {
        kind: "query",
        message: [
          `Im aktuellen Kartenausschnitt sind ${features.length} eingeblendete ${label}: ${features.slice(0, 8).map((f) => f.properties.name).join(", ") || "keine"}. Verschiebe die Karte oder blende ein Thema ein.`,
          `Eingeblendete Ebenen: ${themes.join(", ") || "keine"}.${map0.treeFilter ? ` Baumfilter aktiv: ${map0.treeFilter.label}.` : ""}`,
          map0.reportVisible ? `Grünmeldungen: ${map0.reportsInView().length} im Ausschnitt.` : "Grünmeldungen sind ausgeblendet.",
          atlas().getUserLocation() ? "Dein Standort ist freigegeben." : "Dein Standort ist nicht freigegeben.",
        ].join("\n"),
      };
    },
  };

  async function execute(action) {
    return { ok: true, ...(await runners[action.type](action)) };
  }

  // Validates and executes one untrusted action. Never throws; failures become user-facing text.
  async function run(raw) {
    let checked;
    try {
      checked = validate(raw);
    } catch (error) {
      console.warn("[GreenAI] action rejected", error);
      return { ok: false, kind: "error", message: "Diese Aktion kann ich nicht ausführen." };
    }
    if (!checked.ok) {
      log("action rejected", raw && typeof raw.type === "string" ? raw.type.slice(0, 40) : typeof raw);
      return { ok: false, kind: "error", message: checked.message };
    }
    log("action validated", checked.action.type);
    try {
      const result = await execute(checked.action);
      log("action executed", checked.action.type);
      return result;
    } catch (error) {
      if (error instanceof Rejected) return { ok: false, kind: "error", message: error.message };
      console.warn("[GreenAI] action failed", checked.action.type, error);
      return { ok: false, kind: "error", message: "Die Aktion konnte nicht ausgeführt werden." };
    }
  }
  async function runActions(rawActions) {
    if (!Array.isArray(rawActions) || rawActions.length < 1 || rawActions.length > 3) {
      return { ok: false, kind: "error", message: "Erlaubt sind eine bis drei Aktionen pro Antwort.", actions: [] };
    }
    const checked = rawActions.map(validate);
    const rejected = checked.find((item) => !item.ok);
    if (rejected) return { ok: false, kind: "error", message: rejected.message, actions: [] };
    const done = [], messages = [];
    for (const { action } of checked) {
      const result = await run(action);
      if (!result.ok) return { ok: false, kind: "error", actions: done,
        message: `${messages.join("\n")}\nNach ${done.length} Aktion(en) gestoppt: ${result.message}`.trim() };
      done.push(action);
      messages.push(result.message);
    }
    return { ok: true, kind: "sequence", actions: done, action: done.at(-1), message: messages.join("\n") };
  }
  function parseActionBlocks(reply) {
    const blocks = [...String(reply).matchAll(/<action>\s*([\s\S]*?)\s*<\/action>/gi)];
    if (!blocks.length) return /<action>/i.test(reply) ? null : [];
    try { return blocks.map((block) => JSON.parse(block[1])); }
    catch { return null; }
  }

  /* ---------- reasoning trace and grounded interpretation ---------- */
  // Model text is untrusted: it is shown only as plain text, trimmed, and never as data.
  function parseReasoning(reply) {
    const block = String(reply).match(/<reasoning>([\s\S]*?)<\/reasoning>/i)?.[1] || "";
    return block.split(/\n+/).map((step) => step.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
      .filter(Boolean).slice(0, 4).map((step) => step.slice(0, 180));
  }
  const stripModelTags = (reply) => String(reply)
    .replace(/<(action|reasoning)>[\s\S]*?<\/\1>/gi, "").replace(/<\/?(action|reasoning)>/gi, "").trim();
  // Sentences with digits are dropped: every number shown next to data comes from GrünAtlas.
  function withoutNumbers(text) {
    return (String(text).match(/[^.!?\n]+[.!?]?/g) || [])
      .map((sentence) => sentence.trim()).filter((sentence) => sentence && !/\d/.test(sentence))
      .join(" ").slice(0, 500);
  }
  function describeAction(action) {
    const params = Object.entries(action).filter(([key]) => key !== "type")
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("+") : typeof value === "object" ? JSON.stringify(value) : value}`);
    return params.length ? `${action.type} (${params.join(", ")})` : action.type;
  }
  function buildInterpretPrompt() {
    return [
      "Du bist GrünAI, der GeoAI-Assistent des GrünAtlas Köln.",
      "Du erhältst die Frage des Nutzers und das geprüfte Ergebnis aus den GrünAtlas-Daten.",
      "Ordne das Ergebnis in zwei bis drei kurzen Sätzen auf Deutsch fachlich ein: Was bedeutet es für die Frage, welche Grenzen haben die Daten, welcher sinnvolle nächste Schritt auf der Karte bietet sich an?",
      "Nenne KEINE Zahlen, Mengen, Jahre oder Entfernungen und wiederhole keine Listen: GrünAtlas zeigt diese bereits. Erfinde keine Orte oder Eigenschaften. Keine Actions, keine Tags.",
    ].join("\n");
  }
  function remember(state, result) {
    if (!state || (!result?.ok && !result?.actions?.length)) return;
    const action = result.actions?.at(-1) || result.action;
    if (action) {
      state.lastAction = action;
      state.lastResultKind = result.kind;
      state.lastResultSummary = String(result.message || "").slice(-350);
      state.lastOriginId = action.object_id || (action.origin === "selected" ? atlas()?.getSelectedId?.() : state.lastOriginId) || null;
    }
    state.selectedId = atlas()?.getSelectedId?.() || null;
  }

  /* ---------- local intent recognition (no network) ---------- */
  const THEME_PATTERNS = [
    ["botanical", /botani|\bflora\b/],
    ["cemeteries", /friedhof|melaten/],
    ["play", /spiel|freizeit|bolzplatz/],
    ["dogs", /\bhund/],
    ["gardens", /garten|natur/],
    ["parks", /park(?!platz)|grunflach/],
    ["water", /brunnen|wasser/],
    ["trees", /baum|baume|linde|eiche/],
  ];
  const detectTheme = (q) => THEME_PATTERNS.find(([, pattern]) => pattern.test(q))?.[0] || null;
  const detectThemes = (q) => THEME_PATTERNS.filter(([, pattern]) => pattern.test(q)).map(([id]) => id);
  function detectEdible(q) {
    if (/zier|felsen|nelken|blut|trauben/.test(q)) return null;
    const words = q.split(" ");
    const species = words.map(resolveSpecies).find((hit) => hit?.key);
    if (species) return { species: byKey.get(species.key).label };
    const category = words.map(resolveSpecies).find((hit) => hit?.category);
    if (category) return { edible_category: category.category };
    return words.some((word) => /^essbar/.test(word)) ? { edible: true } : null;
  }
  function detectRadius(q) {
    const match = /(\d+(?:[.,]\d+)?)\s*(km|kilometer|m|meter)\b/.exec(q);
    return match ? Math.round(parseFloat(match[1].replace(",", ".")) * (match[2].startsWith("k") ? 1000 : 1)) : null;
  }

  // Returns { action } | { answer: "world" | "climate", theme } | null (null = needs the language model).
  function localIntent(text, state = {}) {
    const q = norm(text).replace(/[?!.,;:'’"„“]+/g, " ").replace(/\s+/g, " ").trim();
    if (!q) return null;
    if (/coolroute|kuhle route|grune route|schattige route|route vergleichen/.test(q)) {
      return { action: { type: "open_coolroutes" } };
    }
    const subject = q.split(/\b(?:in der nahe|im umkreis|im radius|entfernt von)\b/)[0];
    const theme = detectTheme(subject) || detectTheme(q);
    const view = /sehe|gerade|hier|ausschnitt|karte|sichtbar|diesem bereich/.test(q);
    const scope = view ? "viewport" : "all_loaded";
    const count = /wie viele|wieviele|anzahl/.test(q);
    const list = /welche|liste|auflisten|nenne/.test(q);
    const mentionedDistricts = districtNames().filter((name) => new RegExp(`\\b${norm(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q));
    const district = mentionedDistricts[0];
    if (/vergleich|vergleiche|gegenuber/.test(q) && mentionedDistricts.length >= 2) {
      return { action: { type: "compare_areas", districts: mentionedDistricts.slice(0, 2), ...(theme && { theme }) } };
    }
    if (/versorgungscheck|grunraum.*check|grunangebot|grunversorgung/.test(q)) {
      const origin = /diese[mnrs]? (ort|punkt)|von hier/.test(q) ? "selected" : "user";
      return { action: { type: "green_access_analysis", radius_m: detectRadius(q) ?? 1000, origin } };
    }
    if (/baumstruktur|altersstruktur|bestandsstruktur.*baum/.test(q)) {
      return { action: { type: "tree_structure_analysis", scope: district ? "all_loaded" : scope, ...(district && { district }) } };
    }
    if (/pflegeanalyse|pflegelage|landschaftspflege|pflegebedarf|grunpflege/.test(q)) {
      const status = /alle|gesamt/.test(q) ? "all" : /bearbeitung/.test(q) ? "in_progress" : /abgeschlossen|erledigt/.test(q) ? "closed" : "open";
      return { action: { type: "maintenance_analysis", scope, status, show_layer: true } };
    }
    if (/geoanalyse|analysier|raumlich.*auswert|werte.*ausschnitt.*aus/.test(q)) {
      return { action: { type: "spatial_analysis", scope, ...(theme && { theme }), ...(district && { district }) } };
    }
    if (/zeige nur|nur.*anzeigen|ebenen.*nur/.test(q)) {
      const themes = detectThemes(q);
      if (themes.length) return { action: { type: "set_layers", themes, mode: "replace" } };
    }
    const previous = state.lastAction;
    const nextTheme = /brunnen|wasser/.test(q) ? "water" : /meldung/.test(q) ? REPORTS : detectTheme(q);
    if (/^(und |auch |davon |davon nur )/.test(q) && previous) {
      const followSpecies = detectEdible(q);
      if (followSpecies && previous.theme === "trees") return { action: { type: "filter_features", theme: "trees", ...followSpecies } };
      if (/auch|dazu/.test(q) && nextTheme) return { action: nextTheme === REPORTS
        ? { type: "show_reports", visible: true } : { type: "show_theme", theme: nextTheme } };
      if (count && previous.theme) return { action: { type: "count_features", theme: previous.theme, scope: previous.scope || "viewport", ...(previous.district && { district: previous.district }) } };
    }
    if (!count && !list && /(?:zeige|blend).*(?:baum|baume).*(?:und|sowie).*(?:meldung|sag s uns)|(?:zeige|blend).*(?:meldung).*(?:und|sowie).*(?:baum|baume)/.test(q)) {
      return { actions: [{ type: "show_theme", theme: "trees" }, { type: "show_reports", visible: true }] };
    }
    if (/welcher stadtteil.*meisten baum|welche stadtteile.*meisten baum/.test(q)) return { action: { type: "rank_districts", metric: "tree_count", limit: 5 } };
    if (/altest.*baum|grosst.*baum|hochste.*baum|dickst.*baum|grosst.*krone/.test(q)) {
      const metric = /alt/.test(q) ? "planting_year" : /krone/.test(q) ? "crown" : /dick|stamm/.test(q) ? "trunk" : "height";
      return { action: { type: "rank_trees", metric, scope: view ? "viewport" : "all_loaded", limit: 5, ...(district && { district }) } };
    }
    if (/\b(welt|weltweit|deutschland|europa|nrw|bundesweit)\b/.test(q)) return { answer: "world", theme: theme || (detectEdible(q) ? "trees" : null) };
    if (/meldung|sag s uns|sags uns/.test(q)) {
      const status = /offen|neu\b|unbearbeitet/.test(q) ? "open" : /bearbeitung/.test(q) ? "in_progress" : /abgeschlossen|erledigt|geschlossen/.test(q) ? "closed" : null;
      const category = /spiel|bolz/.test(q) ? "3.3" : null;
      const filter = { ...(status && { status }), ...(category && { category }), ...(/\bbaum|baume/.test(q) && { text: "baum" }) };
      if (count) return { action: { type: "count_features", theme: REPORTS, scope, ...filter } };
      if (list) return { action: { type: "list_features", theme: REPORTS, scope, limit: 10, ...filter } };
      if (/ausblenden|blende.* aus|verstecke|verberge/.test(q)) return { action: { type: "show_reports", visible: false } };
      return { action: Object.keys(filter).length ? { type: "filter_reports", ...filter } : { type: "show_reports", visible: true } };
    }
    if (/klima|hitze|schatten/.test(q)) return { answer: "climate" };
    if (/(filter|auswahl).*(zuruck|loesch|aufheb|entfern)|zuruecksetzen|zurucksetzen/.test(q)) {
      return { action: { type: "filter_features", theme: theme || "trees", clear: true } };
    }
    const edible = detectEdible(q);
    const target = theme || (edible ? "trees" : null);
    if (!target) return /was sehe|kartenansicht|karte gerade|auf der karte/.test(q) ? { action: { type: "get_map_context" } } : null;
    const tree = target === "trees" && edible ? edible : {};
    if (/nahe|umkreis|entfernt|radius|nachst/.test(q) || (detectRadius(q) && !count && !list)) {
      const near = /nachst/.test(q);
      let origin = /diese[mnrs]? (ort|punkt|park|baum|brunnen|objekt|stelle)|von hier/.test(q) ? "selected" : "user";
      let objectId;
      const named = /(?:vom|von|bei|um)\s+(.+?)(?:\s+entfernt)?$/.exec(q);
      const namedPlace = named?.[1].replace(/\s+entfernt$/, "").trim();
      if (namedPlace && !/^(\d|hier|diesem|dieser|meinem|mir|uns|dem punkt|diesem punkt|diesem ort)(\b|$)/.test(namedPlace)) {
        const query = namedPlace.replace(/melatenfriedhof/, "melaten").replace(/^dem\s+/, "");
        const matches = data().collection.features.filter((f) => norm(f.properties.name).includes(query) ||
          (query === "melaten" && norm(f.properties.name).includes("melaten")));
        if (matches.length > 1) return { answer: "ambiguous", message: `Mehrere Orte passen zu „${namedPlace}“: ${matches.slice(0, 5).map((f) => f.properties.name).join(", ")}. Bitte nenne den Ort genauer oder wähle ihn auf der Karte.` };
        if (matches.length === 0) return { answer: "missing", message: `„${namedPlace}“ wurde im geladenen Datensatz nicht eindeutig gefunden.` };
        origin = "object";
        objectId = matches[0].id;
      }
      return {
        action: {
          type: "find_nearby", theme: target, radius_m: detectRadius(q) ?? (near ? MAX_RADIUS : 1000),
          origin, ...(objectId && { object_id: objectId }),
          limit: near ? 3 : 5, ...tree,
        },
      };
    }
    if (target === "trees" && edible && /zeig|karte|markier|hervorheb/.test(q)) {
      return { action: { type: "filter_features", theme: "trees", ...tree, zoom_results: true } };
    }
    if (count) return { action: { type: "count_features", theme: target, scope: district ? "all_loaded" : scope, ...tree, ...(district && { district }) } };
    if (list || district) {
      const groupBy = target === "trees" && /baumart|\barten\b|sorten|welche arten/.test(q) ? { group_by: "species" } : {};
      return { action: { type: "list_features", theme: target, scope: district ? "all_loaded" : scope, limit: 10, ...groupBy, ...tree, ...(district && { district }) } };
    }
    if (/ausblenden|blende.* aus|verstecke|verberge/.test(q)) return { action: { type: "hide_theme", theme: target } };
    if (target === "trees" && edible) return { action: { type: "filter_features", theme: "trees", ...edible } };
    if (/zoom|alle orte/.test(q)) return { action: { type: "zoom_to_theme", theme: target } };
    return { action: { type: "show_theme", theme: target } };
  }

  function worldAnswer(themeId) {
    const counted = themeId ? gather({ themeId }) : null;
    return joinParts(
      "Der GrünAtlas enthält nur einen begrenzten Kölner Datensatz und kann keine Aussagen über die ganze Welt, Deutschland oder NRW machen.",
      counted ? `Im geladenen Datensatz sind ${plural(counted.total, "Objekt", "Objekte")} zu „${data().theme(themeId).name}“ erfasst; das ist kein vollständiger Bestand.` : "",
      sourceNote(themeId));
  }
  const CLIMATE_ANSWER = "Bäume und Grünflächen können Schatten und Verdunstungskühle bieten. Für diesen Ausschnitt liegen keine Mess- oder Simulationsdaten vor.";

  async function handleLocal(text, state) {
    const intent = localIntent(text, state);
    if (!intent) return null;
    log("local intent", intent.action?.type || intent.answer);
    if (intent.answer === "climate") return { ok: true, kind: "query", message: CLIMATE_ANSWER };
    if (intent.answer === "world") return { ok: true, kind: "query", message: worldAnswer(intent.theme) };
    if (intent.answer) return { ok: true, kind: "query", message: intent.message };
    const result = intent.actions ? await runActions(intent.actions) : { ...(await run(intent.action)), action: intent.action };
    remember(state, result);
    return result;
  }

  /* ---------- language model support ---------- */
  function buildContext(state) {
    const map0 = map();
    if (!map0) return {};
    const source = (properties) => (properties.sourceKind === "cadastre" ? "Baumkataster" : data().dataMode === "osm" ? "OSM" : "Demo");
    const features = map0.context().slice(0, 25).map(({ id, properties }) => ({
      id, name: properties.name, theme: properties.theme, species: properties.species, botanical: properties.botanical, source: source(properties),
    }));
    const context = {
      map: {
        activeTheme: atlas().getActiveTheme() || null,
        visibleThemes: [...map0.visible],
        visibleFeatureCount: map0.context().length,
        cameraHeightM: Math.round(map0.cameraHeight()),
      },
      reports: { visible: map0.reportVisible, ...map0.reportFilters, inView: map0.reportsInView().length },
      treeFilter: map0.treeFilter?.label || null,
      userLocationAvailable: !!atlas().getUserLocation(),
      selectedId: atlas().getSelectedId() || null,
      lastAction: state?.lastAction || null,
      lastResultKind: state?.lastResultKind || null,
      lastResultSummary: state?.lastResultSummary || null,
      lastOriginId: state?.lastOriginId || null,
      features,
    };
    while (JSON.stringify(context).length > 4000 && context.features.length) context.features.pop();
    return context;
  }

  function buildSystemPrompt(state) {
    const themes = data().themes.map((theme) => `${theme.id}=${theme.name}`).join(", ");
    const services = reports().services.map((service) => `${service.code}=${service.name}`).join(", ");
    return [
      "Du bist GrünAI, der GeoAI-Assistent des GrünAtlas Köln (Stadt Köln, Amt für Landschaftspflege und Grünflächen).",
      "Du darfst ausschließlich die unten definierten GrünAtlas-Actions anfordern. Du führst selbst keine GIS-Berechnungen durch und erfindest keine Objekte, Entfernungen, Mengen oder Eigenschaften. Du nutzt nur Informationen aus dem Kontext oder aus Action-Ergebnissen. Fehlen Daten, sagst du das klar.",
      "Antworte bei Actions kurz auf Deutsch, höchstens ein Satz, und nenne keine Zahlen: Zahlen, Listen und Entfernungen liefert GrünAtlas selbst nach der Action.",
      "Setze eine bis drei Actions am Ende als getrennte <action>{JSON}</action>-Blöcke. Nutze den Gesprächszustand für Folgefragen. Erfinde keine Action. Der Nutzer sieht die Blöcke nicht.",
      "Beginne jede Antwort mit <reasoning>…</reasoning>: zwei bis vier kurze Zeilen ohne Zahlen, wie du die Frage auf Karte und Daten abbildest (Thema, Raumbezug, gewählte Action und warum). Der Nutzer sieht diese Zeilen als Denkweg.",
      "Beziehe Fragen zu Orten, Mengen, Vergleichen, Nähe oder Zustand immer auf eine Action. Nur bei reinem Allgemeinwissen ohne Datenbezug (z. B. Geschichte, Begriffe, Biologie) antwortest du ohne Action in höchstens drei Sätzen; diese Antwort wird als nicht aus GrünAtlas-Daten geprüft gekennzeichnet. Nutze get_map_context nicht als Ausweichantwort.",
      `Themen (theme): ${themes}. Sonderwert "reports" = Sag's uns Köln Grünmeldungen (nur bei count_features und list_features).`,
      "Jede Action ist ein JSON-Objekt und MUSS das Feld \"type\" enthalten. Actions (ID = eine Theme-ID):",
      '{"type":"show_theme","theme":ID}  {"type":"hide_theme","theme":ID}  {"type":"zoom_to_theme","theme":ID}',
      '{"type":"show_object","id":ID}  {"type":"zoom_to_object","id":ID}  (nur IDs aus dem Kontext)',
      '{"type":"search_features","query":"Text","theme":ID,"limit":10}  (theme optional)',
      '{"type":"filter_features","theme":"trees","edible":true,"edible_category":"fruit|nut","species":"Apfel","zoom_results":true}  oder  {"type":"filter_features","theme":ID,"filters":{"kind":"Wert"}}  oder  {"type":"filter_features","theme":ID,"clear":true}',
      '{"type":"count_features","theme":ID|"reports","scope":"viewport|all_loaded","edible":true,"species":"Walnuss","status":"open|in_progress|closed"}  (alles außer type optional)',
      '{"type":"list_features","theme":ID|"reports","scope":"viewport|all_loaded","limit":10,"group_by":"species"}  (group_by nur bei trees)',
      '{"type":"find_nearby","theme":ID,"radius_m":1000,"origin":"user|selected","limit":5,"edible":true}  (radius 50-10000)',
      '{"type":"show_reports","visible":true}',
      `{"type":"filter_reports","status":"all|open|in_progress|closed","category":"all|${reports().services.map((s) => s.code).join("|")}","text":"Stichwort"}  (${services})`,
      '{"type":"get_map_context"}',
      '{"type":"rank_trees","metric":"planting_year|height|trunk|crown","scope":"viewport|all_loaded","limit":5,"district":"Stadtteil"}',
      '{"type":"rank_districts","metric":"tree_count","limit":5}',
      '{"type":"set_layers","themes":[ID,ID],"mode":"replace|add"}  (steuert mehrere Kartenebenen in einer geprüften Aktion)',
      '{"type":"spatial_analysis","theme":ID,"scope":"viewport|all_loaded","district":"Stadtteil","show_layer":true}  (theme und district optional)',
      '{"type":"compare_areas","districts":["Stadtteil 1","Stadtteil 2"],"theme":ID}  (theme optional; districts MUSS EXAKT zwei verschiedene bekannte Stadtteile enthalten)',
      "Für eine allgemeine Empfehlung zur Analyse nach Stadtteilen ohne zwei vom Nutzer genannte Stadtteile verwendest du rank_districts, niemals compare_areas.",
      '{"type":"green_access_analysis","themes":["parks","gardens","play","water"],"radius_m":1000,"origin":"user|selected|object","object_id":"ID","show_layers":true}  (Grünraum-Angebot per Luftlinie)',
      '{"type":"maintenance_analysis","scope":"viewport|all_loaded","status":"all|open|in_progress|closed","category":"Service-Code","show_layer":true}  (Meldungstexte regelbasiert nach Pflegethemen auswerten)',
      '{"type":"tree_structure_analysis","scope":"viewport|all_loaded","district":"Stadtteil"}  (Altersklassen sowie vorhandene Höhen- und Kronenwerte; kein Pflegezustand)',
      '{"type":"open_coolroutes"}  (öffnet nur die Routingoberfläche; keine erfundenen Routenwerte)',
      'count_features und list_features akzeptieren optional "district":"Stadtteil"; find_nearby akzeptiert "origin":"object" mit "object_id" aus dem Kontext.',
      'Beispiel: Nutzer "Zeige die Brunnen" -> Antwort: <reasoning>Gefragt ist das Thema Brunnen & Trinkwasser.\nDie Ebene muss eingeblendet werden, daher show_theme.</reasoning> Ich blende die Brunnen ein. <action>{"type":"show_theme","theme":"water"}</action>',
      "Datenquellen: begrenzter OpenStreetMap-Auszug, Baumkataster der Stadt Köln (betreute Einzelbäume, nicht alle Bäume), Sag's uns Köln (Meldungen der letzten 30 Tage), sonst Demo-Daten. Keine Quelle ist ein vollständiger amtlicher Bestand.",
      'Ob eine Baumart essbare Früchte trägt, entscheidest du nicht: GrünAtlas prüft das über eine feste Artenliste; du setzt nur "edible":true bzw. "species". Sage nie, Früchte seien bedenkenlos essbar.',
      "„In meiner Nähe“ braucht den Standort des Nutzers (userLocationAvailable im Kontext). Für Fußrouten darfst du nur open_coolroutes verwenden; GrünAtlas berechnet die Route anschließend serverseitig.",
      `Kontext (JSON): ${JSON.stringify(buildContext(state))}`,
    ].join("\n");
  }

  return {
    ALLOWED_ACTIONS, PLANNED_ACTIONS, EDIBLE_TREE_SPECIES, MIN_RADIUS, MAX_RADIUS,
    validate, run, runActions, parseActionBlocks, remember, localIntent, handleLocal, buildSystemPrompt, buildContext,
    edibleInfo, haversine, parseReasoning, stripModelTags, withoutNumbers, describeAction, buildInterpretPrompt,
  };
})();
