/* Labs workspace with external contributions, project proposals and explicit previews. */
window.GreenLabs = (() => {
  const labs = [
    { id: "coolroutes", title: "CoolRoutes Cologne", category: "Klima & Gesundheit", icon: "route", image: "Images/labs/coolroutes-960.webp", badge: "Beitrag",
      url: "https://courageous-pudding-391ff7.netlify.app/", subtitle: "Kühle Wege durch Köln", heading: "Komfortablere Wege bei Hitze planen",
      description: "Plant kühlere Wege mit Temperatur-, Schatten-, Wind- und Wasserdaten für Köln.",
      summary: "CoolRoutes Cologne bewertet Wege anhand modellierter Hitze, Schatten, Grün, Wasser und Wind. Persönliche Präferenzen, verschiedene Profile und mehrere Kartenebenen machen klimatisch angenehmere Routen direkt vergleichbar.",
      features: [["route", "Kühlere Routen"], ["sprout", "Schatten und Stadtgrün"], ["water", "Wasser und Wetter"]] },
    { id: "watering", title: "Smart Watering Pilot", category: "Wasser", icon: "water", image: "Images/labs/smart-watering-960.webp",
      description: "Konzeptansicht für Bewässerungsbedarf aus Wetter-, Standort- und Vegetationsdaten." },
    { id: "fountains", title: "Brunnen 3D", category: "Wasser", icon: "cube", image: "Images/labs/brunnen-im-dau-960.webp",
      description: "Erkundet den historischen Brunnen Im Dau in der Kölner Altstadt-Süd als 3D-Modell." },
    { id: "monitoring", title: "Grünflächen-Monitoring", category: "Daten & Monitoring", icon: "chart", image: "Images/labs/gruenflaechen-monitoring-960.webp",
      description: "Vorschau auf nachvollziehbare Zeitvergleiche von Grünflächen." },
    { id: "urban-trees", title: "Cologne Urban Tree Atlas", category: "Daten & Monitoring", icon: "tree", image: "Images/labs/cologne-urban-tree-atlas-960.webp", badge: "Beitrag",
      url: "https://glistening-wisp-367b6e.netlify.app/", subtitle: "Interaktive Baumalterkarte · Bewässerungsmonitor", heading: "Kölns Stadtbäume datenbasiert erkunden",
      description: "Interaktive Baumalterkarte mit Filtern, Datenqualität und Bewässerungsmonitor für Köln.",
      summary: "Der Cologne Urban Tree Atlas verbindet den Kölner Baumbestand mit Altersklassen, Artenfiltern, Datenqualitätsangaben sowie Wetter- und Trockenheitsindikatoren.",
      features: [["tree", "Baumalter und Arten"], ["filter", "Interaktive Filter"], ["water", "Bewässerungsmonitor"]] },
    { id: "lidar", title: "Urban Green LiDAR Map", category: "Daten & Monitoring", icon: "cube", image: "Images/labs/urban-green-lidar-map-960.webp", badge: "Entwurf",
      url: "https://thunderous-cactus-858ad9.netlify.app/", subtitle: "3D-Punktwolken · Vegetationsstrukturen", heading: "Stadtgrün aus der Höhe sichtbar machen",
      description: "Entwurf einer interaktiven 3D-LiDAR-Karte für Vegetation, Baumkronen und Gebäude.",
      summary: "Die Urban Green LiDAR Map macht hochauflösende Höhendaten räumlich erfahrbar. LiDAR-Klassen lassen sich nach Boden, niedriger, mittlerer und hoher Vegetation sowie Gebäuden untersuchen.",
      features: [["cube", "3D-LiDAR-Punktwolken"], ["tree", "Vegetation und Baumkronen"], ["layers", "Filterbare Höhenklassen"]] },
    { id: "gruendaten", title: "GrünDaten Katalog", category: "Daten & Monitoring", icon: "chart", image: "Images/labs/gruendaten-katalog-960.webp", badge: "MVP",
      url: "https://jocular-churros-804908.netlify.app/", subtitle: "Arbeitscockpit · Amt 67", heading: "Gründaten verlässlich steuern und nutzen",
      description: "MVP für Datenkatalog, Pflegeanalyse, WebGIS, Zuständigkeiten und Datenqualität.",
      summary: "Der GrünDaten Katalog bündelt räumliche Datensätze, Metadaten, Qualitätsstatus, Zuständigkeiten und erreichbare Dienste in einem gemeinsamen Arbeitscockpit für das Grünflächenamt.",
      features: [["chart", "Datenkatalog und Qualität"], ["map", "WebGIS und Fachdaten"], ["user", "Zuständigkeiten und Governance"]] },
    { id: "digifried", title: "digiFried 2.0", category: "Daten & Monitoring", icon: "cube", image: "Images/labs/digifried-2-960.webp", badge: "Vorhaben", project: true,
      subtitle: "Digitale Zwillinge für Kölner Friedhöfe", heading: "Friedhöfe intelligent und effizient digitalisieren",
      description: "Projektvorhaben für digitale Friedhofsverwaltung mit KI, Drohnen und Remote Sensing.",
      summary: "digiFried 2.0 entwickelt den Digitalisierungsprozess der Kölner Friedhöfe weiter. Drohnen, KI, Remote Sensing, GIS und 3D-Daten schaffen qualitätsgesicherte digitale Zwillinge für Erfassung, Verwaltung, Analyse und Planung. So werden Grabstätten, Vegetation, Wege, Geländemodelle und freie Flächen datenbasiert aktuell gehalten und effizient nutzbar.",
      features: [["cube", "Digitale Zwillinge und 3D"], ["sparkles", "KI und automatisierte Auswertung"], ["map", "Drohnen, GIS und Remote Sensing"]],
      subprojects: [{ title: "Friedhofsmanagement Melaten", badge: "Unterprojekt", image: "Images/labs/digifried-cemetery-management-960.webp",
        url: "https://ertanoz.github.io/Cemetery-Management-System/dist/index.html",
        description: "Interaktive Fachanwendung für digitalisierte Flurflächen, Belegung, Fristen, Aufgaben und Analysen am Melaten-Friedhof." }] },
  ];
  let active = "coolroutes";
  let category = "Alle Labs";
  let detailOpen = false;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => GreenAtlas.escape(value);
  const icon = (name) => GreenAtlas.icon(name);
  const cardAction = (lab) => lab.project ? "Vorhaben ansehen" : lab.url ? "Beitrag ansehen" : lab.id === "fountains" ? "Öffnen" : "Vorschau";

  function card(lab) {
    return `<article class="lab-card${active === lab.id ? " active" : ""}">
      <div class="lab-card-visual lab-${lab.id}"><img src="${esc(lab.image)}" alt="" width="960" height="540" loading="lazy" decoding="async"><span>${esc(lab.badge || "Experiment")}</span><b>${icon(lab.icon)}</b></div>
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
    const action = lab.url
      ? `<a class="primary-button external-lab-launch" href="${esc(lab.url)}" target="_blank" rel="noopener noreferrer">${icon("arrow")}Webapp öffnen</a>`
      : `<div class="preview-state"><strong>Projektvorhaben</strong><span>Konzept für die fachliche und technische Weiterentwicklung der digitalen Friedhofsverwaltung.</span></div>`;
    const note = lab.project ? "Vorhaben: Umfang, Datenmodelle und Betriebsprozesse werden im weiteren Projektverlauf konkretisiert." : "Externer Labs-Beitrag. Datenstand, Methodik und Verfügbarkeit werden in der verlinkten Anwendung ausgewiesen.";
    const subprojects = lab.subprojects?.length ? `<section class="lab-subprojects" aria-labelledby="lab-subprojects-title"><span class="lab-section-label">digiFried 2.0 · Unterprojekte</span><h3 id="lab-subprojects-title">Digitale Fachanwendungen</h3>${lab.subprojects.map((subproject) => `<article class="lab-subproject"><img src="${esc(subproject.image)}" alt="Projektansicht von ${esc(subproject.title)}" width="960" height="628" loading="lazy" decoding="async"><div><span class="beta">${esc(subproject.badge).toUpperCase()}</span><h4>${esc(subproject.title)}</h4><p>${esc(subproject.description)}</p><a class="secondary-button" href="${esc(subproject.url)}" target="_blank" rel="noopener noreferrer">${icon("arrow")}Anwendung öffnen</a></div></article>`).join("")}</section>` : "";
    return `<div class="lab-detail-head"><span>${icon(lab.icon)}</span><div><span class="beta">${esc(lab.badge || "Beitrag").toUpperCase()}</span><h2>${esc(lab.title)}</h2><p>${esc(lab.subtitle)}</p></div><button data-close-labs aria-label="Labs schließen">${icon("close")}</button></div>
      <div class="lab-detail-body external-lab-detail"><img src="${esc(lab.image)}" alt="Projektansicht von ${esc(lab.title)}" width="960" height="540" decoding="async"><h3>${esc(lab.heading)}</h3><p>${esc(lab.summary)}${lab.url ? " Der eigenständige Projektbeitrag öffnet sich in einer neuen Browser-Registerkarte." : ""}</p><div class="external-lab-features">${lab.features.map(([featureIcon, label]) => `<span>${icon(featureIcon)}${esc(label)}</span>`).join("")}</div>${subprojects}${action}<p class="lab-disclaimer">${esc(note)}</p></div>`;
  }
  function renderDetail() {
    if (matchMedia("(max-width:760px)").matches && !detailOpen) {
      $("labsDetail").replaceChildren();
      return;
    }
    const lab = labs.find((item) => item.id === active) || labs[0];
    $("labsDetail").innerHTML = lab.url || lab.project ? externalAppPanel(lab) : lab.id === "fountains" ? fountainPanel() : previewPanel(lab);
    if (matchMedia("(max-width:760px)").matches) $("labsDetail").querySelector("[data-close-labs]")?.focus();
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
    $("mobileMap")?.focus();
  }
  function bind() {
    $("labsWorkspace").addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.openLab) { active = button.dataset.openLab; detailOpen = true; render(); }
      if (button.dataset.labCategory) { category = button.dataset.labCategory; renderCatalog(); }
      if (button.hasAttribute("data-close-labs")) close();
      if (button.hasAttribute("data-preview-fountains")) { GreenAtlas.showView("water"); close(); GreenAtlas.getMap().zoomTheme("water"); }
    });
  }
  return { bind, open, close, renderDetail, labs };
})();
