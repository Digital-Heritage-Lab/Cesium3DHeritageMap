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
  ];
  // Recognised but not implemented yet (Phase 2); they are rejected with a clear message.
  const PLANNED_ACTIONS = ["calculate_route", "spatial_analysis", "compare_areas"];
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
      names: [["kirsche", "prunus"]], aliases: ["kirsche", "kirschbaum", "kirschbaume"] },
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
          break;
        case "find_nearby":
          action.theme = themeParam(raw.theme);
          action.radius_m = int(raw.radius_m, MIN_RADIUS, MAX_RADIUS, 1000);
          action.origin = raw.origin === undefined ? "user" : ["user", "selected"].includes(raw.origin) ? raw.origin : fail("Ungültiger Ausgangspunkt.");
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
  function gather({ themeId, area = {}, tree = null, center, keep = 0, groupBy = null }) {
    const out = { total: 0, cadastre: 0, osm: 0, nameOnly: 0, byTheme: new Map(), groups: new Map(), items: [] };
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
      const info = theme === "trees" && groupBy ? featureInfo(feature.properties) : null;
      const label = tree?.edible && groupBy ? info?.edible?.entry.label : feature.properties.species || "ohne Artangabe";
      take(theme, lon, lat, "osm", label, info?.edible, feature);
    }
    if ((!themeId || themeId === "trees") && trees().ready) {
      const visit = (row) => {
        if (tree && !tree.row(row)) return true;
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
    if (action.origin === "selected") {
      const id = atlas().getSelectedId();
      const feature = id && findFeature(id);
      if (!feature) return { message: "Wähle zuerst einen Ort auf der Karte aus, dann kann ich die Umgebung dieses Punkts durchsuchen." };
      const [lon, lat] = feature.geometry?.coordinates || [feature.coordinates.lng, feature.coordinates.lat];
      return { center: { lon, lat }, name: `„${feature.properties?.name || `Meldung #${feature.id}`}“` };
    }
    const location = atlas().getUserLocation();
    if (!location) return { message: "Für eine Suche in deiner Nähe benötige ich deinen Standort. Nutze dafür den Standort Button im GrünAtlas." };
    return { center: { lon: location.lon, lat: location.lat }, name: "deinen Standort" };
  }

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
        const total = gather({ themeId: "trees", tree: spec });
        const zoomed = trees().ready && map0.cameraHeight() > TREE_RENDER_HEIGHT;
        if (zoomed) map0.flyToView(TREE_ZOOM_HEIGHT);
        return {
          kind: "map",
          message: joinParts(
            `Auf der Karte werden nur noch ${spec.label} gezeigt.`,
            `Im bisherigen Kartenausschnitt: ${number(inView.total)}, im geladenen Datensatz insgesamt: ${number(total.total)}.`,
            spec.edible && total.nameOnly ? `${number(total.nameOnly)} davon sind nur über den Katasternamen zugeordnet (Art nicht näher bestimmt).` : "",
            zoomed ? "Ich habe näher herangezoomt, damit einzelne Bäume sichtbar werden." : "",
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
      const result = gather({ themeId: action.theme, area: areaFor(action.scope), tree: spec });
      const subject = spec ? spec.label : action.theme === "trees" ? "Bäume"
        : action.theme ? `Orte der Kategorie „${data().theme(action.theme).name}“` : "Orte";
      const parts = [`${upFirst(subject)} ${scopeText(action.scope)}: ${number(result.total)}.`];
      if (action.theme === "trees" || (!action.theme && result.cadastre)) {
        parts.push(`Davon Baumkataster ${number(result.cadastre)}, OpenStreetMap ${number(result.osm)}.`);
      }
      if (!action.theme) {
        const rows = [...result.byTheme.entries()].map(([id, count]) => `• ${data().theme(id).name}: ${number(count)}`);
        parts.push(rows.join("\n"));
      }
      if (spec?.edible && result.nameOnly) parts.push(`${number(result.nameOnly)} davon nur über den Katasternamen zugeordnet (Art nicht näher bestimmt).`);
      parts.push(visibilityNote(action.theme), sourceNote(action.theme), spec?.edible ? EDIBLE_NOTE : "");
      return { kind: "query", message: parts.filter(Boolean).join("\n") };
    },
    async list_features(action) {
      if (action.theme === REPORTS) return reportQuery(action, true);
      const spec = treeSpec(action);
      const grouped = action.group_by === "species";
      const result = gather({ themeId: action.theme, area: areaFor(action.scope), tree: spec, keep: grouped ? 0 : action.limit, groupBy: grouped ? "species" : null });
      const subject = spec ? spec.label : data().theme(action.theme).name;
      let body;
      if (!result.total) body = [`Für „${subject}“ gibt es ${scopeText(action.scope)} keine Treffer.`];
      else if (grouped) body = [`${spec?.edible ? "Essbare Baumarten" : "Baumarten"} ${scopeText(action.scope)} (${number(result.total)} Bäume):`, ...groupLines(result)];
      else {
        const items = result.items.map((item) => ({ ...item, showDistance: false }));
        body = [`${plural(result.total, "Treffer", "Treffer")} für „${subject}“ ${scopeText(action.scope)}${result.total > items.length ? `, die ${items.length} nächsten zur Kartenmitte` : ""}:`, ...items.map(line)];
      }
      if (grouped && spec?.edible && result.nameOnly) body.push(`${number(result.nameOnly)} davon nur über den Katasternamen zugeordnet (Art nicht näher bestimmt).`);
      return { kind: "query", message: [...body, joinParts(visibilityNote(action.theme), sourceNote(action.theme), spec?.edible ? EDIBLE_NOTE : "")].join("\n") };
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
  function localIntent(text) {
    const q = norm(text).replace(/[?!.,;:'’"„“]+/g, " ").replace(/\s+/g, " ").trim();
    if (!q) return null;
    const theme = detectTheme(q);
    const view = /sehe|gerade|hier|ausschnitt|karte|sichtbar|diesem bereich/.test(q);
    const scope = view ? "viewport" : "all_loaded";
    const count = /wie viele|wieviele|anzahl/.test(q);
    const list = /welche|liste|auflisten|nenne/.test(q);
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
      return {
        action: {
          type: "find_nearby", theme: target, radius_m: detectRadius(q) ?? (near ? MAX_RADIUS : 1000),
          origin: /diese[mnrs]? (ort|punkt|park|baum|brunnen|objekt|stelle)|von hier/.test(q) ? "selected" : "user",
          limit: near ? 3 : 5, ...tree,
        },
      };
    }
    if (count) return { action: { type: "count_features", theme: target, scope, ...tree } };
    if (list) {
      const groupBy = target === "trees" && /baumart|\barten\b|sorten|welche arten/.test(q) ? { group_by: "species" } : {};
      return { action: { type: "list_features", theme: target, scope, limit: 10, ...groupBy, ...tree } };
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

  async function handleLocal(text) {
    const intent = localIntent(text);
    if (!intent) return null;
    log("local intent", intent.action?.type || intent.answer);
    if (intent.answer === "climate") return { ok: true, kind: "query", message: CLIMATE_ANSWER };
    if (intent.answer === "world") return { ok: true, kind: "query", message: worldAnswer(intent.theme) };
    return { ...(await run(intent.action)), action: intent.action };
  }

  /* ---------- language model support ---------- */
  function buildContext() {
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
      features,
    };
    while (JSON.stringify(context).length > 4000 && context.features.length) context.features.pop();
    return context;
  }

  function buildSystemPrompt() {
    const themes = data().themes.map((theme) => `${theme.id}=${theme.name}`).join(", ");
    const services = reports().services.map((service) => `${service.code}=${service.name}`).join(", ");
    return [
      "Du bist GrünAI, der GeoAI-Assistent des GrünAtlas Köln (Stadt Köln, Amt für Landschaftspflege und Grünflächen).",
      "Du darfst ausschließlich die unten definierten GrünAtlas-Actions anfordern. Du führst selbst keine GIS-Berechnungen durch und erfindest keine Objekte, Entfernungen, Mengen oder Eigenschaften. Du nutzt nur Informationen aus dem Kontext oder aus Action-Ergebnissen. Fehlen Daten, sagst du das klar.",
      "Antworte kurz auf Deutsch, höchstens ein Satz, und nenne keine Zahlen: Zahlen, Listen und Entfernungen liefert GrünAtlas selbst nach der Action.",
      "Eine Action steht am Ende deiner Antwort als <action>{JSON}</action>, höchstens eine pro Antwort. Erfinde keine Action, die nicht in dieser Liste steht. Der Nutzer sieht den Action-Block nicht.",
      `Themen (theme): ${themes}. Sonderwert "reports" = Sag's uns Köln Grünmeldungen (nur bei count_features und list_features).`,
      "Jede Action ist ein JSON-Objekt und MUSS das Feld \"type\" enthalten. Actions (ID = eine Theme-ID):",
      '{"type":"show_theme","theme":ID}  {"type":"hide_theme","theme":ID}  {"type":"zoom_to_theme","theme":ID}',
      '{"type":"show_object","id":ID}  {"type":"zoom_to_object","id":ID}  (nur IDs aus dem Kontext)',
      '{"type":"search_features","query":"Text","theme":ID,"limit":10}  (theme optional)',
      '{"type":"filter_features","theme":"trees","edible":true,"edible_category":"fruit|nut","species":"Apfel"}  oder  {"type":"filter_features","theme":ID,"filters":{"kind":"Wert"}}  oder  {"type":"filter_features","theme":ID,"clear":true}',
      '{"type":"count_features","theme":ID|"reports","scope":"viewport|all_loaded","edible":true,"species":"Walnuss","status":"open|in_progress|closed"}  (alles außer type optional)',
      '{"type":"list_features","theme":ID|"reports","scope":"viewport|all_loaded","limit":10,"group_by":"species"}  (group_by nur bei trees)',
      '{"type":"find_nearby","theme":ID,"radius_m":1000,"origin":"user|selected","limit":5,"edible":true}  (radius 50-10000)',
      '{"type":"show_reports","visible":true}',
      `{"type":"filter_reports","status":"all|open|in_progress|closed","category":"all|${reports().services.map((s) => s.code).join("|")}","text":"Stichwort"}  (${services})`,
      '{"type":"get_map_context"}',
      'Beispiel: Nutzer "Zeige die Brunnen" -> Antwort: Ich blende die Brunnen ein. <action>{"type":"show_theme","theme":"water"}</action>',
      "Datenquellen: begrenzter OpenStreetMap-Auszug, Baumkataster der Stadt Köln (betreute Einzelbäume, nicht alle Bäume), Sag's uns Köln (Meldungen der letzten 30 Tage), sonst Demo-Daten. Keine Quelle ist ein vollständiger amtlicher Bestand.",
      'Ob eine Baumart essbare Früchte trägt, entscheidest du nicht: GrünAtlas prüft das über eine feste Artenliste; du setzt nur "edible":true bzw. "species". Sage nie, Früchte seien bedenkenlos essbar.',
      "„In meiner Nähe“ braucht den Standort des Nutzers (userLocationAvailable im Kontext). Routing gibt es nicht.",
      `Kontext (JSON): ${JSON.stringify(buildContext())}`,
    ].join("\n");
  }

  return {
    ALLOWED_ACTIONS, PLANNED_ACTIONS, EDIBLE_TREE_SPECIES, MIN_RADIUS, MAX_RADIUS,
    validate, run, localIntent, handleLocal, buildSystemPrompt, buildContext,
    edibleInfo, haversine,
  };
})();
