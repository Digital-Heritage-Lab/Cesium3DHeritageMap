/* global GreenRoutes */
/* Labs workspace. Only Coolroutes is operational; the other labs are explicit previews. */
window.GreenLabs = (() => {
  const labs = [
    { id: "coolroutes", title: "CoolRoutes Cologne", category: "Klima & Gesundheit", icon: "route", image: "Images/labs/coolroutes.png", badge: "Beitrag",
      url: "https://courageous-pudding-391ff7.netlify.app/", subtitle: "Kühle Wege durch Köln", heading: "Komfortablere Wege bei Hitze planen",
      description: "Plant kühlere Wege mit Temperatur-, Schatten-, Wind- und Wasserdaten für Köln.",
      summary: "CoolRoutes Cologne bewertet Wege anhand modellierter Hitze, Schatten, Grün, Wasser und Wind. Persönliche Präferenzen, verschiedene Profile und mehrere Kartenebenen machen klimatisch angenehmere Routen direkt vergleichbar.",
      features: [["route", "Kühlere Routen"], ["sprout", "Schatten und Stadtgrün"], ["water", "Wasser und Wetter"]] },
    { id: "watering", title: "Smart Watering Pilot", category: "Wasser", icon: "water", image: "Images/labs/smart-watering.png",
      description: "Konzeptansicht für Bewässerungsbedarf aus Wetter-, Standort- und Vegetationsdaten." },
    { id: "fountains", title: "Brunnen 3D", category: "Wasser", icon: "cube", image: "Images/labs/brunnen-im-dau.png",
      description: "Erkundet den historischen Brunnen Im Dau in der Kölner Altstadt-Süd als 3D-Modell." },
    { id: "monitoring", title: "Grünflächen-Monitoring", category: "Daten & Monitoring", icon: "chart", image: "Images/labs/gruenflaechen-monitoring.png",
      description: "Vorschau auf nachvollziehbare Zeitvergleiche von Grünflächen." },
    { id: "urban-trees", title: "Cologne Urban Tree Atlas", category: "Daten & Monitoring", icon: "tree", image: "Images/labs/cologne-urban-tree-atlas.png", badge: "Beitrag",
      url: "https://glistening-wisp-367b6e.netlify.app/", subtitle: "Interaktive Baumalterkarte · Bewässerungsmonitor", heading: "Kölns Stadtbäume datenbasiert erkunden",
      description: "Interaktive Baumalterkarte mit Filtern, Datenqualität und Bewässerungsmonitor für Köln.",
      summary: "Der Cologne Urban Tree Atlas verbindet den Kölner Baumbestand mit Altersklassen, Artenfiltern, Datenqualitätsangaben sowie Wetter- und Trockenheitsindikatoren.",
      features: [["tree", "Baumalter und Arten"], ["filter", "Interaktive Filter"], ["water", "Bewässerungsmonitor"]] },
    { id: "lidar", title: "Urban Green LiDAR Map", category: "Daten & Monitoring", icon: "cube", image: "Images/labs/urban-green-lidar-map.png", badge: "Entwurf",
      url: "https://thunderous-cactus-858ad9.netlify.app/", subtitle: "3D-Punktwolken · Vegetationsstrukturen", heading: "Stadtgrün aus der Höhe sichtbar machen",
      description: "Entwurf einer interaktiven 3D-LiDAR-Karte für Vegetation, Baumkronen und Gebäude.",
      summary: "Die Urban Green LiDAR Map macht hochauflösende Höhendaten räumlich erfahrbar. LiDAR-Klassen lassen sich nach Boden, niedriger, mittlerer und hoher Vegetation sowie Gebäuden untersuchen.",
      features: [["cube", "3D-LiDAR-Punktwolken"], ["tree", "Vegetation und Baumkronen"], ["layers", "Filterbare Höhenklassen"]] },
  ];
  let active = "coolroutes";
  let category = "Alle Labs";
  let detailOpen = false;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => GreenAtlas.escape(value);
  const icon = (name) => GreenAtlas.icon(name);
  const minutes = (seconds) => `${Math.max(1, Math.round(seconds / 60))} Min`;
  const distance = (meters) => meters < 1000 ? `${meters} m` : `${(meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`;
  const cardAction = (lab) => lab.url ? "Beitrag ansehen" : lab.id === "fountains" ? "Öffnen" : "Vorschau";

  function card(lab) {
    return `<article class="lab-card${active === lab.id ? " active" : ""}">
      <div class="lab-card-visual lab-${lab.id}"><img src="${esc(lab.image)}" alt="" loading="lazy"><span>${esc(lab.badge || "Experiment")}</span><b>${icon(lab.icon)}</b></div>
      <div class="lab-card-body"><span class="lab-tag">${esc(lab.category)}</span><h3>${esc(lab.title)}</h3>
      <p>${esc(lab.description)}</p><button data-open-lab="${lab.id}" class="lab-open">${cardAction(lab)}${icon("arrow")}</button></div>
    </article>`;
  }
  function renderCatalog() {
    const visible = labs.filter((lab) => category === "Alle Labs" || lab.category === category);
    $("labsCatalog").innerHTML = `<div class="labs-heading"><span class="labs-title-icon">${icon("flask")}</span><div><span class="beta">BETA</span><h1>Heute testen. Morgen gestalten.</h1><p>Digitale Werkzeuge für mehr Grün, Klimaanpassung und Lebensqualität in Köln.</p></div></div>
      <div class="labs-filters">${["Alle Labs", "Klima & Gesundheit", "Wasser", "Daten & Monitoring"].map((item) => `<button data-lab-category="${esc(item)}" aria-pressed="${category === item}">${esc(item)}</button>`).join("")}</div>
      <div class="labs-grid">${visible.map(card).join("")}</div>`;
  }
  function optionList(selected) {
    const options = GreenRoutes.places();
    if (selected && !options.some((item) => item.id === selected.id)) options.unshift(selected);
    return options.map((item) => `<option value="${esc(item.id)}"${selected?.id === item.id ? " selected" : ""}>${esc(item.label)}</option>`).join("");
  }
  function routeResults() {
    if (!GreenRoutes.state.routes.length) return "";
    return `<div class="route-results"><div class="route-summary-grid">${GreenRoutes.state.routes.map((route, index) => `<button data-route-id="${route.id}" class="route-choice${route.id === GreenRoutes.state.activeId ? " active" : ""}"><span>${index + 1}</span><strong>${esc(route.label)}</strong><small>${minutes(route.durationS)} · ${distance(route.distanceM)}</small><b>${route.greenPotentialPct}% Grünpotenzial</b></button>`).join("")}</div>${routeDetail()}</div>`;
  }
  function routeDetail() {
    const route = GreenRoutes.state.routes.find((item) => item.id === GreenRoutes.state.activeId);
    if (!route) return "";
    return `<section class="route-detail"><h3>${esc(route.label)}</h3><div class="route-metrics">
      <div>${icon("clock")}<strong>${minutes(route.durationS)}</strong><span>Gehzeit</span></div>
      <div>${icon("route")}<strong>${distance(route.distanceM)}</strong><span>Strecke</span></div>
      <div>${icon("sprout")}<strong>${route.greenPotentialPct}%</strong><span>Grün-/Schattenpotenzial</span></div>
      <div>${icon("water")}<strong>${route.waterStops.length}</strong><span>Brunnen nahe der Route</span></div>
    </div><p class="route-evidence">Näherungswert aus ${route.evidence.nearbyTrees.toLocaleString("de-DE")} Bäumen und ${route.evidence.greenPlaces} Grünorten im Routenkorridor. Keine amtliche Schattenmessung.</p>
    <button class="primary-button" data-show-route="${route.id}">${icon("map")}Route auf der Karte anzeigen</button></section>`;
  }
  function coolroutePanel() {
    const start = GreenRoutes.state.start || GreenRoutes.place("neumarkt");
    const volksgarten = GreenRoutes.place("volksgarten");
    if (!GreenRoutes.state.start) GreenRoutes.setEndpoint("start", start);
    if (!GreenRoutes.state.end) GreenRoutes.setEndpoint("end", volksgarten || GreenRoutes.places()[1]);
    return `<div class="lab-detail-head"><span>${icon("tree")}</span><div><span class="beta">BETA</span><h2>Coolrouten Köln</h2><p>Angenehmer unterwegs, auch an heißen Tagen.</p></div><button data-close-labs aria-label="Labs schließen">${icon("close")}</button></div>
      <div class="lab-detail-body"><p>Vergleiche Fußwege, die grüne Umgebungen bevorzugen, mit der schnellsten und einer barriereärmeren Verbindung.</p>
      <div class="route-form"><label>Start<select id="routeStart">${optionList(GreenRoutes.state.start)}</select></label><button data-use-location="start" class="icon-button" title="Standort als Start">${icon("locate")}</button>
      <label>Ziel<select id="routeEnd">${optionList(GreenRoutes.state.end)}</select></label><button data-use-location="end" class="icon-button" title="Standort als Ziel">${icon("locate")}</button>
      <button id="calculateRoute" class="primary-button"${GreenRoutes.state.busy ? " disabled" : ""}>${icon("route")}${GreenRoutes.state.busy ? "Routen werden berechnet ..." : "Routen vergleichen"}</button><p id="routeStatus" role="status"></p></div>
      <details class="address-search"><summary>Adresse suchen</summary><div><input id="routeAddress" placeholder="Adresse oder Ort in Köln" maxlength="120"><select id="routeAddressTarget" aria-label="Adresse verwenden als"><option value="start">Als Start</option><option value="end">Als Ziel</option></select><button data-search-address>${icon("search")}Suchen</button></div><div id="routeAddressResults"></div></details>
      ${routeResults()}<p class="lab-disclaimer">Experimentell: Routen basieren auf openrouteservice und OpenStreetMap. Grün- und Schattenpotenzial ist eine lokale Näherung und keine Vor-Ort-Messung.</p></div>`;
  }
  function previewPanel(lab) {
    const details = {
      watering: ["Bedarf sichtbar machen", "Die Vorschau zeigt, wie später Boden-, Wetter- und Vegetationsdaten zusammengeführt werden können. Es sind noch keine Live-Sensoren angebunden."],
      monitoring: ["Veränderungen nachvollziehen", "Die Vorschau beschreibt den geplanten Zeitvergleich. Sie führt derzeit keine automatische Satelliten- oder KI-Auswertung aus."],
    }[lab.id];
    return `<div class="lab-detail-head"><span>${icon(lab.icon)}</span><div><span class="beta">VORSCHAU</span><h2>${esc(lab.title)}</h2><p>${esc(lab.category)}</p></div><button data-close-labs aria-label="Labs schließen">${icon("close")}</button></div><div class="lab-detail-body"><div class="preview-hero lab-${lab.id}">${icon(lab.icon)}</div><h3>${details[0]}</h3><p>${details[1]}</p><div class="preview-state"><strong>Noch kein Live-Betrieb</strong><span>Diese Ansicht zeigt das geplante Nutzungskonzept mit vorhandenen Kölner Gründaten.</span></div><a class="secondary-button lab-feedback" href="https://www.stadt-koeln.de/service/adressen/amt-fuer-landschaftspflege-und-gruenflaechen" target="_blank" rel="noopener noreferrer">Kontakt & Feedback</a></div>`;
  }
  function fountainPanel() {
    return `<div class="lab-detail-head"><span>${icon("cube")}</span><div><span class="beta">3D</span><h2>Brunnen Im Dau</h2><p>Im Dau 9 · Altstadt-Süd · nahe Severinstraße</p></div><button data-close-labs aria-label="Labs schließen">${icon("close")}</button></div>
      <div class="lab-detail-body fountain-detail"><p class="fountain-intro">Der stillgelegte Travertinbrunnen wurde 1914 von Simon Kirschbaum geschaffen. Die häufig als „Alter Fritz“ bezeichnete Anlage erinnert nach der überlieferten Beschreibung tatsächlich an Magdalena Klotz, die das Werk ihres Großvaters Christoph Winter und damit das Kölner Hänneschentheater fortführte.</p><div class="sketchfab-embed-wrapper"><iframe title="3D-Modell des Brunnens Im Dau in Köln" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" loading="lazy" src="https://sketchfab.com/models/e452ea5a9f2545079de0244b6e11f978/embed?ui_theme=dark&dnt=1"></iframe></div><p class="fountain-help">3D über die Wiedergabetaste starten. Danach mit Ziehen drehen, mit dem Mausrad oder zwei Fingern zoomen. Vollbild ist direkt im Viewer verfügbar.</p><p class="fountain-attribution"><a href="https://sketchfab.com/3d-models/2ff13e42b0f74f7281ebaab42fcdb9d1-e452ea5a9f2545079de0244b6e11f978" target="_blank" rel="nofollow noopener noreferrer">3D-Modell</a> von <a href="https://sketchfab.com/ozcanertan" target="_blank" rel="nofollow noopener noreferrer">Digital Heritage Lab</a> auf <a href="https://sketchfab.com" target="_blank" rel="nofollow noopener noreferrer">Sketchfab</a>.</p><figure class="fountain-reference"><img src="https://commons.wikimedia.org/wiki/Special:Redirect/file/K%C3%B6ln-Brunnen-Im-Dau-9.JPG?width=900" alt="Historisches Foto des Brunnens Im Dau in Köln" loading="lazy" referrerpolicy="no-referrer"><figcaption>Referenzfoto: <a href="https://commons.wikimedia.org/wiki/File:K%C3%B6ln-Brunnen-Im-Dau-9.JPG" target="_blank" rel="noopener noreferrer">Willy Horsch (HOWI), CC BY 3.0</a></figcaption></figure><button class="secondary-button" data-preview-fountains>${icon("map")}Brunnenstandorte auf der Karte zeigen</button></div>`;
  }
  function externalAppPanel(lab) {
    return `<div class="lab-detail-head"><span>${icon(lab.icon)}</span><div><span class="beta">${esc(lab.badge || "Beitrag").toUpperCase()}</span><h2>${esc(lab.title)}</h2><p>${esc(lab.subtitle)}</p></div><button data-close-labs aria-label="Labs schließen">${icon("close")}</button></div>
      <div class="lab-detail-body external-lab-detail"><img src="${esc(lab.image)}" alt="Projektansicht von ${esc(lab.title)}"><h3>${esc(lab.heading)}</h3><p>${esc(lab.summary)} Der eigenständige Projektbeitrag öffnet sich in einer neuen Browser-Registerkarte.</p><div class="external-lab-features">${lab.features.map(([featureIcon, label]) => `<span>${icon(featureIcon)}${esc(label)}</span>`).join("")}</div><a class="primary-button external-lab-launch" href="${esc(lab.url)}" target="_blank" rel="noopener noreferrer">${icon("arrow")}Webapp öffnen</a><p class="lab-disclaimer">Externer Labs-Beitrag. Datenstand, Methodik und Verfügbarkeit werden in der verlinkten Anwendung ausgewiesen.</p></div>`;
  }
  function renderDetail() {
    if (matchMedia("(max-width:760px)").matches && !detailOpen) {
      $("labsDetail").replaceChildren();
      return;
    }
    const lab = labs.find((item) => item.id === active) || labs[0];
    $("labsDetail").innerHTML = lab.url ? externalAppPanel(lab) : lab.id === "fountains" ? fountainPanel() : previewPanel(lab);
  }
  function render() { renderCatalog(); renderDetail(); }
  function open(id) {
    active = labs.some((lab) => lab.id === id) ? id : active;
    detailOpen = !matchMedia("(max-width:760px)").matches || Boolean(id);
    $("labsWorkspace").hidden = false;
    document.body.classList.add("labs-open");
    render();
  }
  function close() {
    detailOpen = false;
    $("labsWorkspace").hidden = true;
    document.body.classList.remove("labs-open");
    GreenAtlas.activateAppView("map");
  }
  async function useLocation(kind) {
    if (!navigator.geolocation) return GreenAtlas.toast("Standort wird nicht unterstützt.");
    navigator.geolocation.getCurrentPosition((position) => {
      GreenRoutes.setEndpoint(kind, { id: "location", label: "Mein Standort", coordinates: [position.coords.longitude, position.coords.latitude] });
      renderDetail();
    }, () => GreenAtlas.toast("Standort konnte nicht ermittelt werden."), { timeout: 10000, maximumAge: 60000 });
  }
  async function calculate() {
    const startId = $("routeStart").value;
    const endId = $("routeEnd").value;
    const start = GreenRoutes.place(startId) || (GreenRoutes.state.start?.id === startId ? GreenRoutes.state.start : null);
    const end = GreenRoutes.place(endId) || (GreenRoutes.state.end?.id === endId ? GreenRoutes.state.end : null);
    GreenRoutes.setEndpoint("start", start);
    GreenRoutes.setEndpoint("end", end);
    $("routeStatus").textContent = "Drei Wege werden verglichen ...";
    $("calculateRoute").disabled = true;
    try {
      await GreenRoutes.calculate();
      renderDetail();
    } catch (error) {
      const messages = {
        routing_not_configured: "Routing ist lokal noch nicht konfiguriert. Bitte ORS_API_KEY setzen.",
        route_timeout: "Der Routingdienst hat zu lange gebraucht. Bitte erneut versuchen.",
        routing_unavailable: "Der Routingdienst ist gerade nicht erreichbar.",
      };
      $("routeStatus").textContent = messages[error.message] || "Diese Route konnte nicht berechnet werden.";
      $("calculateRoute").disabled = false;
    }
  }
  async function searchAddress() {
    const container = $("routeAddressResults");
    container.textContent = "Adresse wird gesucht ...";
    try {
      const results = await GreenRoutes.geocode($("routeAddress").value);
      container.innerHTML = results.length ? results.map((item) => `<button data-address-id="${esc(item.id)}" data-address-label="${esc(item.label)}" data-address-coordinates="${item.coordinates.join(",")}">${icon("pin")}<span>${esc(item.label)}</span></button>`).join("") : "Keine passende Adresse in Köln gefunden.";
    } catch (error) {
      container.textContent = error.message === "routing_not_configured" ? "Adresssuche ist noch nicht konfiguriert." : "Adresssuche ist gerade nicht erreichbar.";
    }
  }
  function bind() {
    $("labsWorkspace").addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.openLab) { active = button.dataset.openLab; detailOpen = true; render(); }
      if (button.dataset.labCategory) { category = button.dataset.labCategory; renderCatalog(); }
      if (button.hasAttribute("data-close-labs")) close();
      if (button.dataset.useLocation) void useLocation(button.dataset.useLocation);
      if (button.id === "calculateRoute") void calculate();
      if (button.hasAttribute("data-search-address")) void searchAddress();
      if (button.dataset.addressCoordinates) {
        const coordinates = button.dataset.addressCoordinates.split(",").map(Number);
        GreenRoutes.setEndpoint($("routeAddressTarget").value, { id: button.dataset.addressId, label: button.dataset.addressLabel, coordinates });
        renderDetail();
      }
      if (button.dataset.routeId) { GreenRoutes.select(button.dataset.routeId); renderDetail(); }
      if (button.dataset.showRoute) { GreenRoutes.select(button.dataset.showRoute); close(); }
      if (button.hasAttribute("data-preview-fountains")) { GreenAtlas.showView("water"); close(); GreenAtlas.getMap().zoomTheme("water"); }
    });
  }
  return { bind, open, close, renderDetail, labs };
})();
