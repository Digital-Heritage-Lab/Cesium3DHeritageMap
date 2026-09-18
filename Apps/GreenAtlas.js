/* Product UI. The existing Cesium bootstrap mounts this controller once ready. */
window.GreenAtlas = (() => {
  const paths = {
    tree:
      "M12 22v-6M7 17a4 4 0 0 1-2-7 5 5 0 1 1 14 0 4 4 0 0 1-2 7ZM12 13l-3-3m3 5 3-3",
    park: "m8 3-5 8h3l-4 6h12l-4-6h3Zm0 14v5m8-15 5 8h-3l4 6H12m4-14v15",
    play: "M3 21 7 3h10l4 18M7 3l10 18M7 9h10M11 9v7m-3 0h6",
    dog: "M8 10 4 7l-2 5 4 2v6m2-10h7l3-5 4 3-3 5v7m-13-6h13M8 10V6m7 14v-6",
    sprout:
      "M12 22V12m0 3C3 15 2 9 3 5c6 0 9 4 9 10Zm0-3c0-8 4-10 9-10 1 6-3 10-9 10Z",
    arch: "M5 21V10a7 7 0 0 1 14 0v11M3 21h18M12 8v8m-3-5h6",
    flower:
      "M12 9c-7-10-11-1-6 3-7 6 1 12 6 4 5 8 13 2 6-4 5-4 1-13-6-3Z M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
    water: "M12 2S5 10 5 14a7 7 0 0 0 14 0c0-4-7-12-7-12ZM8 15a4 4 0 0 0 4 4",
    sun:
      "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
    compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-2 6-6 2 2-6Z",
    layers: "m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5",
    heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 2 11 8 16 6-5 13-11 8-16Z",
    info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 11v6m0-10v.2",
    search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6",
    pin:
      "M12 22S4 14 4 9a8 8 0 0 1 16 0c0 5-8 13-8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    chevron: "m8 10 4 4 4-4",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    close: "m6 6 12 12M6 18 18 6",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    locate: "M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M12 2v5m0 10v5M2 12h5m10 0h5",
    expand: "M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6",
    sparkles:
      "m12 3 2.5 7 7 2.5-7 2.5-2.5 7-2.5-7L2 12.5l7.5-2.5ZM20 2v5m-2.5-2.5h5",
    map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16",
    send: "m3 3 19 9-19 9 4-9Zm4 9h15",
    report: "M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7l-9-4Zm0 5v6m0 3v.2",
  };
  const icon = (name) =>
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${
      paths[name] || paths.sprout
    }"/></svg>`;
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  const $ = (id) => document.getElementById(id);
  let map,
    currentView = "explore",
    activeTheme,
    ai,
    favorites = new Set(),
    toastTimer,
    lastTrigger,
    viewOnly = false,
    reportLoading = false,
    reportError = false;
  const panel = () => $("contentPanel");
  const isMobile = () => matchMedia("(max-width:760px)").matches;
  const isRealData = () => GreenData.dataMode === "osm";
  const dataLabel = () => isRealData() ? "OSM-Orte" : "Demo-Orte";
  const themeTotal = (id) => GreenData.search("", id).length + (id === "trees" ? GreenTrees.count : 0);
  const art = () =>
    `<div class="garden-art" aria-hidden="true"><svg viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice"><path d="M0 104Q100 36 206 86T400 60V140H0" fill="#e6edda"/><path d="M0 134Q136 60 259 112T420 84V150H0" fill="#cadbb5"/><path d="M200 140q80-25 22-46t60-40" fill="none" stroke="#f8faef" stroke-width="12"/><path d="M0 130q50-12 95 10" fill="none" stroke="#b3c7a0" stroke-width="22"/><g fill="#71945e"><ellipse cx="80" cy="62" rx="24" ry="32"/><ellipse cx="307" cy="44" rx="20" ry="30"/><ellipse cx="351" cy="86" rx="20" ry="26"/></g><g fill="#3b6847"><ellipse cx="128" cy="84" rx="22" ry="28"/><ellipse cx="270" cy="77" rx="18" ry="24"/></g><g stroke="#385a35" stroke-width="2" fill="none"><path d="M80 65v50m0-23-10-12m10 1 10-12M128 82v49m0-27-8-10M307 43v62m0-26 9-14M351 85v41M270 79v38"/></g><path d="M166 97h29m-29 5h29m-25 0v10m20-10v10" stroke="#8d9f72" stroke-width="3"/><g fill="#fafbf7"><circle cx="41" cy="103" r="2"/><circle cx="48" cy="108" r="2"/><circle cx="373" cy="116" r="2"/></g></svg></div>`;
  function hydrateIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach((el) => {
      el.innerHTML = icon(el.dataset.icon);
    });
  }
  function toast(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").hidden = false;
    toastTimer = setTimeout(() => {
      $("toast").hidden = true;
    }, 5000);
  }
  function header(label) {
    return `<div class="panel-header"><span class="eyebrow">${escape(
      label
    )}</span><button class="icon-button" data-action="close-panel" aria-label="Panel schließen">${icon(
      "close"
    )}</button></div>`;
  }
  function resultCard(f) {
    const t = GreenData.theme(f.properties.theme);
    return `<button class="result-card" data-object="${escape(
      f.id
    )}"><span class="result-icon" style="color:${t.color}">${icon(
      t.icon
    )}</span><span><strong>${escape(f.properties.name)}</strong><small>${escape(
      f.properties.place
    )} · ${f.properties.sourceKind === "cadastre" ? "Baumkataster Stadt Köln" : isRealData() ? "OpenStreetMap" : "Demo"}</small></span>${icon("arrow")}</button>`;
  }
  function renderExplore() {
    const cards = [
      ["trees", "Bäume entdecken"],
      ["parks", "Parks & Grün"],
      ["play", "Spiel & Freizeit"],
      ["dogs", "Mit Hund unterwegs"],
      ["gardens", "Gärten & Natur"],
      ["cemeteries", "Stille Orte"],
    ];
    panel().innerHTML =
      header("RAUS INS GRÜNE") +
      `<div class="welcome"><span class="kicker">${icon(
        "sprout"
      )} Deine nächste Auszeit ist ganz nah.</span><h1>Köln wird<br><em>grüner.</em></h1><p>Entdecke das Grün deiner Stadt.<br>Parks, Bäume und kleine Lieblingsorte –<br>alles auf einer Karte.</p>${art()}</div><div class="explore-grid">${cards
        .map(([id, label]) => {
          const t = GreenData.theme(id);
          return `<button class="explore-tile" data-theme="${id}">${icon(
            t.icon
          )}<span class="tile-arrow">↗</span><strong>${label}</strong><small>${
            themeTotal(id).toLocaleString("de-DE")
          } ${id === "trees" && GreenTrees.ready ? "Bäume · Stadt Köln + OSM" : dataLabel()}</small></button>`;
        })
        .join(
          ""
        )}</div><div class="explore-foot"><span>Dein Grün. Auf einen Blick.</span><button data-view="themes">Alle Themen →</button></div>${(() => {
          const featured = GreenData.search("", "parks").find((f) => f.properties.name === "Rheinpark") || GreenData.search("", "parks")[0];
          return featured ? `<button class="feature-card" data-object="${escape(featured.id)}"><div class="mini-landscape">${art()}</div><div class="feature-caption"><span><small>ENTDECKERTIPP · ${isRealData() ? "OSM" : "DEMO"}</small><strong>${escape(featured.properties.name)}</strong></span>${icon("arrow")}</div></button>` : "";
        })()}`;
  }
  function renderTheme(id) {
    const t = GreenData.theme(id),
      filters = map.filters[id] || {},
      municipalTrees = id === "trees" && GreenTrees.ready ? map.visibleTreeFeatures.slice(0, 40) : [],
      matches = municipalTrees.concat(GreenData.filtered(id, filters)),
      resultLabel = id === "trees" && GreenTrees.ready
        ? `${GreenData.filtered(id, filters).length} OSM + ${municipalTrees.length} Stadtbäume im Ausschnitt`
        : `${matches.length} ${dataLabel()}`;
    panel().innerHTML =
      header("THEMEN ENTDECKEN") +
      `<div class="panel-body"><div class="theme-symbol" style="color:${
        t.color
      }">${icon(t.icon)}</div><h2>${t.title}</h2><p>${
        t.description
      }</p>${id === "trees" && GreenTrees.ready ? `<p class="demo-note">${GreenTrees.count.toLocaleString("de-DE")} Bäume im <a href="https://open.nrw/dataset/e02ad618-ab42-48b5-8551-849aa936bb99" target="_blank" rel="noopener noreferrer">städtischen Baumkataster</a>. Zoome nahe heran, um die Bäume auf der Karte zu sehen. Hier erscheinen bis zu 40 Bäume aus dem Ausschnitt; die Suche findet auch Bäume außerhalb davon.</p>` : ""}<button class="primary-button" data-toggle-theme="${id}" aria-pressed="${map.visible.has(
        id
      )}" title="${
        map.visible.has(id) ? "Ebene ausblenden" : "Ebene einblenden"
      }">${icon(t.icon)}${
        map.visible.has(id)
          ? "Auf der Karte eingeblendet"
          : t.layer + " anzeigen"
      }</button><div class="filter-grid">${(id === "trees" && GreenTrees.ready ? [] : Object.entries(t.filters)).filter(([key]) => GreenData.search("", id).some((f) => f.properties[key]))
        .map(
          ([key, label]) =>
            `<label>${label}<select data-filter="${key}" aria-label="${label}"><option value="">Alle</option>${[
              ...new Set(
                GreenData.search("", id)
                  .map((f) => f.properties[key])
                  .filter(Boolean)
              ),
            ]
              .sort()
              .map(
                (value) =>
                  `<option value="${escape(value)}" ${
                    filters[key] === value ? "selected" : ""
                  }>${escape(value)}</option>`
              )
              .join("")}</select></label>`
        )
        .join(
          ""
        )}</div><button class="secondary-button" data-action="view-results" aria-pressed="${viewOnly}">${icon(
        "locate"
      )} Nur in diesem Kartenausschnitt</button><div class="section-label"><strong>Orte entdecken</strong><span id="themeResultCount">${
        resultLabel
      }</span></div><div id="themeResults">${
        matches.length
          ? matches.map(resultCard).join("")
          : `<p class="empty-state">${GreenData.search("", id).length ? "Keine Orte für diese Filter.<br>Wähle „Alle“, um mehr zu entdecken." : "Für dieses Thema sind noch keine Orte im Datensatz erfasst."}</p>`
      }</div><p class="demo-note">${id === "trees" && GreenTrees.ready ? "Stadt Köln: verwaltete Einzelbäume, kein vollständiger Stadtbaumbestand. Positionen sind keine amtliche Lagevermessung. Weitere benannte Bäume stammen aus OpenStreetMap." : isRealData() ? "OpenStreetMap-Auszug: benannte Bäume und eine begrenzte Auswahl je Thema. Flächenmarker zeigen den Mittelpunkt eines Umgrenzungsrechtecks, keinen Eingang. Angaben vor Ort prüfen." : "Demo: Positionen und Eigenschaften dienen der Vorschau. Kein amtliches Kataster."}</p><button class="text-button" data-view="layers">Weitere Kartenebenen →</button></div>`;
  }
  function renderLayers() {
    panel().innerHTML =
      header("DEINE KARTENANSICHT") +
      `<div class="panel-body"><h2>So grün, wie du willst.</h2><p>Wähle, was du auf der Karte entdecken möchtest.</p>${GreenData.themes
        .map(
          (t) =>
            `<div class="layer-row"><div class="layer-top" style="color:${
              t.color
            }">${icon(t.icon)}<span class="layer-title"><strong>${
              t.layer
            }</strong><small>${
              themeTotal(t.id).toLocaleString("de-DE")
            } Orte · ${t.id === "trees" && GreenTrees.ready ? "Stadt Köln + OSM" : isRealData() ? "OSM-Auszug" : "Demo"}</small></span><button class="switch" role="switch" aria-label="${
              t.layer
            }" aria-checked="${map.visible.has(t.id)}" data-layer="${
              t.id
            }"></button></div><details><summary>Darstellung & Informationen</summary><p>${
              t.description
            }</p><div class="layer-key"><i class="legend-dot" style="background:${
              t.color
            }"></i>${
              t.name
            } · Punktstandorte</div><label>Deckkraft <input type="range" min="10" max="100" value="${Math.round(
              (map.opacity[t.id] ?? 1) * 100
            )}" data-opacity="${t.id}" aria-label="Deckkraft ${
              t.layer
            }"></label><button class="text-button" data-zoom-theme="${
              t.id
            }">Alle Orte auf der Karte zeigen ↗</button><p>${isRealData() ? "Quelle: © OpenStreetMap-Mitwirkende · ODbL 1.0 · Auszug, kein amtliches Register." : "Quelle: Grün Atlas UX-Demo. Keine amtlichen Daten."}</p></details></div>`
        )
        .join(
          ""
        )}<h3 class="report-section-title">Bürgerinformationen · Meldungen</h3>${renderReportLayer()}</div>`;
  }
  function renderReportLayer() {
    const count = GreenReports.filter(map.reportFilters.category, map.reportFilters.status).length;
    const categories = GreenReports.services.map((service) => '<option value="' + escape(service.code) + '"' +
      (map.reportFilters.category === service.code ? ' selected' : '') + '>' + escape(service.name) + '</option>').join('');
    return `<div class="layer-row report-layer"><div class="layer-top" style="color:#8a6840">${icon('report')}<span class="layer-title"><strong>Sag's uns Köln</strong><small>Grünmeldungen · ${GreenReports.snapshot ? 'Archivstand' : 'letzte 30 Tage'} · ${GreenReports.reports.length.toLocaleString('de-DE')} geladen</small></span><button class="switch" role="switch" aria-label="Sag's uns Köln, Grünmeldungen" aria-checked="${map.reportVisible}" data-report-layer></button></div>${map.reportVisible ? `<div class="report-layer-controls"><p class="demo-note">Bürgerinformationen zu Kölner Grün und Spiel- und Bolzplätzen. Quelle: <a href="https://sags-uns.stadt-koeln.de/requests" target="_blank" rel="noopener noreferrer">Sag's uns Köln</a>.</p><div class="filter-grid"><label>Kategorie<select data-report-filter="category"><option value="all"${map.reportFilters.category === 'all' ? ' selected' : ''}>Alle Grünmeldungen</option>${categories}</select></label><label>Status<select data-report-filter="status"><option value="all"${map.reportFilters.status === 'all' ? ' selected' : ''}>Alle</option><option value="open"${map.reportFilters.status === 'open' ? ' selected' : ''}>Offen</option><option value="in_progress"${map.reportFilters.status === 'in_progress' ? ' selected' : ''}>In Bearbeitung</option><option value="closed"${map.reportFilters.status === 'closed' ? ' selected' : ''}>Abgeschlossen</option></select></label></div><p class="report-layer-state" role="status">${reportLoading ? 'Aktuelle Grünmeldungen werden geladen …' : reportError ? 'Grünmeldungen konnten momentan nicht geladen werden.' : `${count.toLocaleString('de-DE')} Meldungen für diese Filter${GreenReports.fetchedAt ? ` · ${GreenReports.snapshot ? 'Archivstand' : 'Abruf'} ${escape(new Date(GreenReports.fetchedAt).toLocaleString('de-DE'))}` : ''}`}</p><button class="text-button" data-report-refresh${reportLoading ? ' disabled' : ''}>Aktualisieren ↻</button></div>` : ''}</div>`;
  }
  function showView(view) {
    lastTrigger = document.activeElement;
    currentView = view;
    activeTheme = GreenData.theme(view) ? view : undefined;
    viewOnly = false;
    panel().hidden = false;
    panel().setAttribute(
      "aria-label",
      activeTheme
        ? GreenData.theme(view).name
        : view === "layers"
        ? "Kartenebenen"
        : "Entdecken"
    );
    $("objectPanel").hidden = true;
    if (isMobile()) closeAI();
    if (activeTheme) {
      map.setVisibility(view, true);
      renderTheme(view);
    } else if (view === "explore") renderExplore();
    else if (view === "layers") renderLayers();
    else if (view === "themes")
      panel().innerHTML =
        header("KÖLN HAT VIELE GRÜNE SEITEN") +
        `<div class="panel-body"><h2>Was zieht dich raus?</h2>${GreenData.themes
          .map(
            (t) =>
              `<button class="result-card" data-theme="${
                t.id
              }"><span class="result-icon">${icon(
                t.icon
              )}</span><span><strong>${t.name}</strong><small>${
                themeTotal(t.id).toLocaleString("de-DE")
              } ${t.id === "trees" && GreenTrees.ready ? "Bäume entdecken" : dataLabel() + " entdecken"}</small></span>${icon("arrow")}</button>`
          )
          .join("")}</div>`;
    else if (view === "favorites") {
      const saved = GreenData.collection.features.filter((f) => favorites.has(f.id))
        .concat([...favorites].map((id) => GreenTrees.get(id)).filter(Boolean));
      panel().innerHTML =
        header("DEIN PERSÖNLICHES KÖLN") +
        `<div class="panel-body"><h2>Meine grünen Orte.</h2><p>Deine Merkliste, gespeichert in diesem Browser.</p>${
          saved.length
            ? saved.map(resultCard).join("")
            : `<div class="empty-state">${icon(
                "heart"
              )}Noch kein Lieblingsort?<br>Öffne einen Ort und tippe auf „Merken“.</div>`
        }</div>`;
    } else if (view === "about")
      panel().innerHTML =
        header("STADTGRÜN NEU ENTDECKEN") +
        `<div class="panel-body"><div class="theme-symbol">${icon(
          "sprout"
        )}</div><h2>Grün Atlas Köln</h2><p>Das digitale Grün der Stadt entdecken, verstehen und intelligent nutzen.</p><p>Eine interaktive Vorschau für das grüne Köln: Themen erkunden, Lieblingsorte merken und die Karte mit GrünAI entdecken.</p><p class="publisher-credit">Entwickelt von der <a href="https://www.stadt-koeln.de/service/adressen/amt-fuer-landschaftspflege-und-gruenflaechen" target="_blank" rel="noopener noreferrer">Stadt Köln, Amt für Landschaftspflege und Grünflächen</a>.</p>${GreenTrees.ready ? `<p>${GreenTrees.count.toLocaleString("de-DE")} betreute Einzelbäume stammen zusätzlich aus dem <a href="https://open.nrw/dataset/e02ad618-ab42-48b5-8551-849aa936bb99" target="_blank" rel="noopener noreferrer">städtischen Baumkataster</a> (Abruf ${escape(GreenTrees.dataAsOf)}). Auf der Karte werden bei naher Ansicht nur Bäume im Ausschnitt gerendert.</p>` : ""}<h3>Ein ehrlicher Anfang.</h3><p class="demo-note">Alle ${
          GreenData.collection.features.length
        } ${isRealData() ? `Orte stammen aus einem begrenzten OpenStreetMap-Auszug (Datenstand ${escape(GreenData.collection.dataAsOf)}). Nur benannte Bäume und bis zu 250 Orte je Thema wurden übernommen. OSM kann unvollständig sein. Flächenpunkte zeigen Mittelpunkte der Umgrenzungsrechtecke, keine Eingänge. Zugang und Nutzungsregeln vor Ort prüfen. Einige Ortskarten zeigen passend zugeordnete Wikimedia-Commons-Bilder mit Urheber- und Lizenzangaben; die übrigen zeigen Illustrationen. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap-Mitwirkende</a> · <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">ODbL 1.0 ↗</a>` : "Fachobjekte sind Demo-Daten. Standorte sind illustrativ, Eigenschaften synthetisch."} Der OSM-Auszug ist kein amtliches Kataster; die Baumkataster-Punkte ersetzen keinen amtlichen Lageplan. Keine Grundlage für Pflege-, Zugänglichkeits- oder Sicherheitsentscheidungen.</p><h3>Technik & Herkunft</h3><p>CesiumJS · OpenStreetMap<br>Auf Basis von Cesium3DHeritageMap und der Arbeit von Digital Heritage Lab, Ertan Özcan und OK Lab Köln.</p><h3>GrünAI</h3><p>Die Kartenaktionen werten die angezeigten Orte lokal aus. Freie KI-Fragen können optional über den vorhandenen Serverdienst beantwortet werden. Ohne konfigurierten Dienst bleibt die Kartensuche verfügbar.</p><p>Deine Merkliste bleibt lokal im Browser. Ein Standort wird nur auf deinen Wunsch abgefragt.</p></div>`;
    if (view === "themes")
      panel()
        .querySelector(".panel-body")
        .insertAdjacentHTML(
          "beforeend",
          '<div class="mobile-more"><button class="secondary-button" data-view="layers">Kartenebenen</button><button class="secondary-button" data-view="favorites">Meine Orte</button><button class="secondary-button" data-view="about">Über Grün Atlas</button></div>'
        );
    panel().scrollTop = 0;
    document.querySelectorAll(".nav-item,.mobile-nav button").forEach((btn) => {
      const active = (btn.dataset.view || btn.dataset.theme) === view;
      btn.classList.toggle("active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    if (ai) ai.updatePrompts();
    updateContext();
  }
  function closePanel() {
    panel().hidden = true;
    if (lastTrigger?.isConnected) lastTrigger.focus();
  }
  function showObject(id, fly = true) {
    if (id.startsWith('report-')) return showReport(id, fly);
    const f = GreenData.collection.features.find((item) => item.id === id) || GreenTrees.get(id);
    if (!f) return;
    lastTrigger = document.activeElement;
    if (fly) map.focus(id);
    map.select(id);
    if (activeTheme && !panel().hidden) renderTheme(activeTheme);
    const p = f.properties,
      t = GreenData.theme(p.theme),
      object = $("objectPanel"),
      photo = GreenData.photo(id);
    const labels = {
      species: "Baumart",
      botanical: "Botanischer Name",
      treeNumber: "Baumnummer",
      street: "Straße",
      neighborhood: "Stadtteil",
      plantingYear: "Pflanzjahr",
      trunkDiameter: "Stammdurchmesser",
      crownDiameter: "Kronendurchmesser",
      ownership: "Eigentum",
      condition: "Zustand",
      height: "Höhe",
      trunk: "Stammumfang",
      age: "Alter",
      district: "Stadtbezirk",
      ageGroup: "Altersgruppe",
      equipment: "Ausstattung",
      access: "Barrierefreiheit",
      kind: "Art",
    };
    object.innerHTML = `<div class="object-visual${photo ? " has-photo" : ""}">${art()}${photo ? `<img class="object-photo" src="${escape(photo.path)}" alt="Bild zu ${escape(p.name)}" loading="lazy" decoding="async">` : ""}<button class="icon-button" data-action="close-object" aria-label="Ortdetails schließen">${icon(
      "close"
    )}</button></div><div class="object-body"><span class="chip">${icon(
      t.icon
    )}${t.name} · ${p.sourceKind === "cadastre" ? "Stadt Köln" : isRealData() ? "OSM" : "Demo"}</span><h2>${escape(p.name)}</h2><p class="place">${icon(
      "pin"
    )}${escape(p.place)}</p>${photo ? `<p class="photo-credit">Bildzuschnitt: ${escape(photo.artist)} · <a href="${escape(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(photo.license)}</a> · <a href="${escape(photo.filePage)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></p>` : ""}${
      p.description ? `<p>${escape(p.description)}</p>` : ""
    }<dl class="object-facts">${Object.entries(labels)
      .filter(([key]) => p[key])
      .map(
        ([key, label]) =>
          `<div><dt>${label}</dt><dd>${escape(p[key])}</dd></div>`
      )
      .join(
        ""
      )}</dl><div class="object-actions"><button class="primary-button" data-focus="${escape(
      id
    )}">${icon(
      "locate"
    )}Auf Karte</button><button class="secondary-button" data-save="${escape(
      id
    )}" aria-pressed="${favorites.has(id)}">${icon("heart")}${
      favorites.has(id) ? "Gemerkt" : "Merken"
    }</button></div><details><summary>Details & Datenherkunft</summary><p>Objekt-ID: ${escape(
      id
    )}<br>${escape(
      p.source
    )}<br><span class="photo-depiction">${photo ? "Darstellung: Bildausschnitt aus Wikimedia Commons." : "Darstellung: schematische Illustration, kein Ortsfoto."}</span>${p.dataAsOf ? `<br>Datenstand: ${escape(p.dataAsOf)}` : ""}${p.license ? `<br>Lizenz: ${escape(p.license)}` : ""}${p.positionNote ? `<br>${escape(p.positionNote)}` : ""}</p>${p.sourceUrl ? `<p><a href="${escape(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${p.sourceKind === "cadastre" ? "Baumkataster öffnen ↗" : "OSM-Objekt öffnen ↗"}</a>${p.wikidataUrl ? ` · <a href="${escape(p.wikidataUrl)}" target="_blank" rel="noopener noreferrer">Wikidata ↗</a>` : ""}</p>` : ""}<p class="demo-note">${p.sourceKind === "cadastre" ? "Das Kataster umfasst betreute Einzelbäume der Stadt Köln, nicht alle Bäume. Standort und Merkmale können unvollständig sein; kein Ersatz für einen amtlichen Lageplan." : isRealData() ? "OpenStreetMap ist ein offener, möglicherweise unvollständiger Datenbestand. Zustand, Ausstattung und Zugänglichkeit sind hier nicht verifiziert." : "Beispielhafte Position und Attribute. Keine bestätigten Angaben zu Zustand, Ausstattung oder Zugänglichkeit."}</p></details></div>`;
    object.querySelector(".object-photo")?.addEventListener("error", (event) => {
      event.currentTarget.hidden = true;
      object.querySelector(".photo-credit").hidden = true;
      object.querySelector(".photo-depiction").textContent = "Darstellung: schematische Illustration, kein Ortsfoto.";
    });
    object.hidden = false;
    if (isMobile()) {
      panel().hidden = true;
      closeAI();
    }
    hideSearch();
    object.querySelector("button").focus();
    updateContext();
  }
  function showReport(id, fly = true) {
    const report = GreenReports.get(id);
    if (!report) return;
    lastTrigger = document.activeElement;
    if (fly) map.focusReport(report);
    map.select(id);
    const object = $('objectPanel');
    object.innerHTML = `<div class="object-visual">${art()}<button class="icon-button" data-action="close-object" aria-label="Ortdetails schließen">${icon('close')}</button></div><div class="object-body"></div>`;
    const body = object.querySelector('.object-body');
    const add = (tag, content, className) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      node.textContent = content;
      body.appendChild(node);
      return node;
    };
    const names = { open: 'Neu / Offen', in_progress: 'In Bearbeitung', closed: 'Abgeschlossen', other: 'Status unbekannt' };
    add('span', `${report.category} · Sag's uns Köln`, 'chip');
    add('h2', `#${report.id}`);
    if (report.address) add('p', report.address, 'place');
    const facts = document.createElement('dl');
    facts.className = 'object-facts';
    for (const [label, value] of [['Status', names[report.status] || names.other],
      ['Kategorie', report.category], ['Gemeldet', new Date(report.createdAt).toLocaleString('de-DE')]]) {
      const row = document.createElement('div');
      const term = document.createElement('dt'); term.textContent = label;
      const detail = document.createElement('dd'); detail.textContent = value;
      row.append(term, detail); facts.appendChild(row);
    }
    body.appendChild(facts);
    if (report.description) add('p', report.description, 'report-description');
    const actions = document.createElement('div');
    actions.className = 'object-actions';
    const focus = document.createElement('button');
    focus.className = 'primary-button'; focus.textContent = 'Auf Karte';
    focus.addEventListener('click', () => map.focusReport(report));
    actions.appendChild(focus);
    if (/^https:\/\/sags-uns\.stadt-koeln\.de\/requests\/\d+-\d{4}$/.test(report.sourceUrl)) {
      const link = document.createElement('a');
      link.className = 'secondary-button'; link.href = report.sourceUrl;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Meldung öffnen ↗';
      actions.appendChild(link);
    }
    body.appendChild(actions);
    if (report.imageUrl && /^https:\/\/sags-uns\.stadt-koeln\.de\/system\/files\//.test(report.imageUrl)) {
      const image = document.createElement('img');
      image.className = 'report-photo'; image.src = report.imageUrl;
      image.alt = `Bild zur Meldung #${report.id}`; image.loading = 'lazy';
      image.addEventListener('error', () => image.remove());
      body.appendChild(image);
    }
    add('p', "Quelle: Sag's uns Köln · öffentliche Meldung; Inhalt und Status können sich ändern.", 'demo-note');
    object.hidden = false;
    hideSearch();
    object.querySelector('button').focus();
  }
  function updateContext() {
    if (!map) return;
    $("visibleCount").textContent = `${
      map.context().length + map.reportsInView().length
    } ${GreenTrees.ready ? "Orte" : dataLabel()} im Ausschnitt`;
    $("layerCount").textContent = map.visible.size + Number(map.reportVisible);
    $("favoriteCount").textContent = favorites.size;
    if (activeTheme === "trees" && GreenTrees.ready && !viewOnly && !panel().hidden)
      renderTheme("trees");
    if (viewOnly && activeTheme && $("themeResults")) {
      const matches = map.context(activeTheme).slice(0, 50);
      $("themeResults").innerHTML = matches.length
        ? matches.map(resultCard).join("")
        : '<p class="empty-state">Keine passenden Orte in diesem Ausschnitt. Zoome heraus oder ändere die Filter.</p>';
      $("themeResultCount").textContent = `${matches.length} im Ausschnitt`;
    }
    $("mapLegend").innerHTML =
      [...map.visible]
        .map((id) => {
          const t = GreenData.theme(id);
          return `<span><i class="legend-dot" style="background:${
            t.color
          }"></i>${t.name.split(" &")[0]}</span>`;
        })
        .join("") + (map.reportVisible ? '<span><i class="legend-dot" style="background:#8a6840"></i>Grünmeldungen</span>' : '') || "<span>Keine Themen eingeblendet</span>";
  }
  async function refreshReports(force = false) {
    reportLoading = true;
    reportError = false;
    if (currentView === 'layers' && !panel().hidden) renderLayers();
    try {
      const reports = await GreenReports.load(force);
      map.setReportData(reports);
    } catch {
      reportError = true;
    } finally {
      reportLoading = false;
      if (currentView === 'layers' && !panel().hidden) renderLayers();
    }
  }
  function search() {
    const value = $("greenSearch").value.trim(),
      results = $("searchResults");
    results.hidden = false;
    $("greenSearch").setAttribute("aria-expanded", "true");
    if (!value) {
      results.innerHTML = `<h3>Schnell entdecken</h3><div class="quick-searches">${GreenData.themes
        .map(
          (t) =>
            `<button class="chip" data-theme="${t.id}">${icon(t.icon)}${
              t.name
            }</button>`
        )
        .join("")}</div><p class="demo-note">Suche in ${
        GreenData.collection.features.length
      } ${dataLabel()}${GreenTrees.ready ? ` und ${GreenTrees.count.toLocaleString("de-DE")} städtischen Bäumen` : ""}. Probiere „Park“, „Baum“ oder „Brunnen“. Eine stadtweite Adresssuche ist noch nicht angebunden.</p>`;
      return;
    }
    const matches = GreenData.search(value);
    const cityMatches = GreenTrees.search(value, 8);
    results.innerHTML =
      `<h3>${matches.length + cityMatches.length} Treffer ${GreenTrees.ready ? "in OSM und Baumkataster (max. 8 Stadtbäume)" : isRealData() ? "im OSM-Auszug" : "in den Demo-Daten"}</h3>` +
      (matches.length
        ? GreenData.themes
            .map((t) => {
              const group = matches.filter((f) => f.properties.theme === t.id);
              return group.length
                ? `<div class="search-group">${t.name}</div>${group
                    .map(resultCard)
                    .join("")}`
                : "";
            })
            .join("")
        : cityMatches.length ? "" : '<p class="empty-state">Hier ist noch kein Ort erfasst.<br>Probiere „Park“, „Linde“ oder „Melaten“.</p>') +
      (cityMatches.length ? `<div class="search-group">Städtisches Baumkataster</div>${cityMatches.map(resultCard).join("")}` : "");
  }
  function hideSearch() {
    $("searchResults").hidden = true;
    $("greenSearch").setAttribute("aria-expanded", "false");
  }
  function openAI() {
    if (!ai) ai = new GreenAI(map.viewer);
    if (isMobile()) {
      panel().hidden = true;
      $("objectPanel").hidden = true;
    }
    ai.chatPanel.hidden = false;
    $("greenAIButton").setAttribute("aria-expanded", "true");
    ai.inputField.focus();
  }
  function closeAI() {
    if (ai) ai.chatPanel.hidden = true;
    $("greenAIButton").setAttribute("aria-expanded", "false");
  }
  function aiLocal(text) {
    const q = GreenData.normalize(text);
    if (/klima|hitze|schatten/.test(q))
      return "Bäume und Grünflächen können Schatten und Verdunstungskühle bieten. Für diesen Ausschnitt liegen keine Mess- oder Simulationsdaten vor.";
    if (/was sehe|kartenansicht|karte gerade/.test(q)) {
      const features = map.context();
      return `Im aktuellen Kartenausschnitt sind ${
        features.length
      } eingeblendete ${dataLabel()}: ${
        features
          .slice(0, 8)
          .map((f) => f.properties.name)
          .join(", ") || "keine"
      }. Verschiebe die Karte oder blende ein Thema ein.`;
    }
    const pairs = [
      ["trees", /baum|baume|linde|eiche/],
      ["play", /spiel|freizeit/],
      ["dogs", /hund/],
      ["parks", /park|grunflach/],
      ["gardens", /garten|gartenprojekt/],
      ["cemeteries", /friedhof|friedhofe|melaten/],
      ["botanical", /botani|flora/],
      ["water", /brunnen|wasser/],
    ];
    const id = pairs.find(([, pattern]) => pattern.test(q))?.[0];
    if (!id) return null;
    map.setVisibility(id, true);
    updateContext();
    const features = map.context(id);
    if (/baumart/.test(q))
      return `In diesem Kartenausschnitt sind folgende Baumarten ${isRealData() ? "im OSM-Auszug" : "in den Demo-Daten"} erfasst: ${
        [...new Set(features.map((f) => f.properties.species))].join(", ") ||
        "keine"
      }. Dies ist keine vollständige Bestandsaufnahme.`;
    if (/nachst/.test(q))
      return "Für eine verlässliche Entfernung brauche ich deinen Standort. Nutze den Standort-Button und wähle anschließend einen Ort auf der Karte. Eine Routen- oder Nächster-Park-Berechnung ist noch nicht angebunden.";
    return `${GreenData.theme(id).layer} ist eingeblendet. ${
      features.length
    } passende ${dataLabel()} liegen im aktuellen Kartenausschnitt${
      features.length
        ? ": " + features.slice(0, 6).map((f) => f.properties.name).join(", ") + (features.length > 6 ? ` und ${features.length - 6} weitere.` : ".")
        : ". Zoome heraus, um weitere Orte zu entdecken."
    } ${isRealData() ? "Der OSM-Auszug ist unvollständig und kein amtliches Register." : "Die Angaben sind illustrativ, keine amtlichen Daten."}`;
  }
  async function changeBasemap(id) {
    const status = $("basemapStatus");
    status.textContent = "Grundkarte wird geladen …";
    document.querySelectorAll("[data-basemap]").forEach((b) => {
      b.disabled = true;
    });
    try {
      const provider =
        id === "osm"
          ? await createOsmImageryProvider()
          : id === "basemap-libre"
          ? await createBasemapLibreProvider()
          : new Cesium.UrlTemplateImageryProvider({
              // NRW's WMTS matrix 00 starts at Web Mercator zoom 5.
              url: "https://www.wmts.nrw.de/geobasis/wmts_nw_dop/tiles/nw_dop/EPSG_3857_16/{matrix}/{x}/{y}",
              minimumLevel: 5,
              maximumLevel: 20,
              rectangle: Cesium.Rectangle.fromDegrees(5.7, 50.3, 9.7, 52.6),
              customTags: {
                matrix: (_provider, _x, _y, level) => String(level - 5).padStart(2, "0"),
              },
              credit: new Cesium.Credit('© <a href="https://www.bezreg-koeln.nrw.de/geobasis-nrw">Geobasis NRW</a>', true),
            });
      const layer = new Cesium.ImageryLayer(provider);
      if (id === "osm") {
        layer.saturation = 0.32;
        layer.brightness = 1.06;
      }
      map.viewer.imageryLayers.removeAll(true);
      map.viewer.imageryLayers.add(layer);
      $("basemapName").textContent =
        id === "osm"
          ? "Detailkarte"
          : id === "basemap-libre"
          ? "Helle Stadtkarte"
          : "Luftbild";
      status.textContent = "";
      document
        .querySelectorAll("[data-basemap]")
        .forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.basemap === id))
        );
      map.viewer.scene.requestRender();
    } catch {
      status.textContent =
        "Diese Grundkarte ist aktuell nicht verfügbar. Die bisherige Karte bleibt erhalten.";
    } finally {
      document.querySelectorAll("[data-basemap]").forEach((b) => {
        b.disabled = false;
      });
    }
  }
  function bind() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!event.target.closest(".search-wrap")) hideSearch();
      if (!event.target.closest(".basemap-panel, #basemapButton"))
        $("basemapPanel").hidden = true;
      if (!button) return;
      if (button.dataset.theme) {
        showView(button.dataset.theme);
        hideSearch();
      }
      if (button.dataset.view) showView(button.dataset.view);
      if (button.dataset.object) showObject(button.dataset.object);
      if (button.dataset.focus) map.focus(button.dataset.focus);
      if (button.dataset.layer) {
        map.setVisibility(
          button.dataset.layer,
          !map.visible.has(button.dataset.layer)
        );
        button.setAttribute(
          "aria-checked",
          String(map.visible.has(button.dataset.layer))
        );
      }
      if (button.hasAttribute('data-report-layer')) {
        map.setReportVisibility(!map.reportVisible);
        renderLayers();
        if (map.reportVisible) void refreshReports();
      }
      if (button.hasAttribute('data-report-refresh')) void refreshReports(true);
      if (button.dataset.toggleTheme) {
        const id = button.dataset.toggleTheme;
        map.setVisibility(id, !map.visible.has(id));
        renderTheme(id);
      }
      if (button.dataset.zoomTheme) {
        if (!map.zoomTheme(button.dataset.zoomTheme))
          toast("Keine Orte für die aktuellen Filter.");
        renderLayers();
      }
      if (button.dataset.basemap) void changeBasemap(button.dataset.basemap);
      if (button.dataset.save) {
        const id = button.dataset.save;
        if (favorites.has(id)) favorites.delete(id);
        else favorites.add(id);
        try {
          localStorage.setItem(
            "gruen-atlas:favorites",
            JSON.stringify([...favorites])
          );
        } catch {
          toast(
            "Merkliste kann in diesem Browser nicht dauerhaft gespeichert werden."
          );
        }
        button.setAttribute("aria-pressed", String(favorites.has(id)));
        button.innerHTML =
          icon("heart") + (favorites.has(id) ? "Gemerkt" : "Merken");
        updateContext();
        if (currentView === "favorites") {
          const visible = !panel().hidden;
          showView("favorites");
          panel().hidden = !visible;
          showObject(id, false);
        }
      }
      if (button.dataset.action === "close-panel") closePanel();
      if (button.dataset.action === "close-object") {
        $("objectPanel").hidden = true;
        if (lastTrigger?.isConnected) lastTrigger.focus();
      }
      if (button.dataset.action === "view-results") {
        viewOnly = !viewOnly;
        if (!viewOnly) renderTheme(activeTheme);
        const toggle = panel().querySelector('[data-action="view-results"]');
        toggle.setAttribute("aria-pressed", String(viewOnly));
        toggle.focus();
        updateContext();
      }
    });
    document.addEventListener("change", (event) => {
      if (event.target.dataset.reportFilter) {
        const key = event.target.dataset.reportFilter;
        map.setReportFilters({ ...map.reportFilters, [key]: event.target.value });
        renderLayers();
        panel().querySelector(`[data-report-filter="${key}"]`).focus();
      }
      if (event.target.dataset.filter) {
        const key = event.target.dataset.filter;
        map.setFilter(activeTheme, {
          ...map.filters[activeTheme],
          [key]: event.target.value,
        });
        renderTheme(activeTheme);
        panel().querySelector(`[data-filter="${key}"]`).focus();
        updateContext();
      }
    });
    document.addEventListener("input", (event) => {
      if (event.target.dataset.opacity)
        map.setOpacity(
          event.target.dataset.opacity,
          Number(event.target.value) / 100
        );
    });
    $("greenSearch").addEventListener("input", search);
    $("greenSearch").addEventListener("focus", search);
    $("greenSearch").addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        $("searchResults").querySelector("button")?.focus();
        e.preventDefault();
      }
      if (e.key === "Enter") {
        const first = $("searchResults").querySelector("[data-object]");
        if (first) showObject(first.dataset.object);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideSearch();
        $("objectPanel").hidden = true;
        $("basemapPanel").hidden = true;
        closeAI();
        closePanel();
      }
      if (
        e.key === "/" &&
        !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
      ) {
        e.preventDefault();
        $("greenSearch").focus();
      }
    });
    $("zoomIn").onclick = () =>
      map.viewer.camera.zoomIn(
        map.viewer.camera.positionCartographic.height * 0.35
      );
    $("zoomOut").onclick = () =>
      map.viewer.camera.zoomOut(
        map.viewer.camera.positionCartographic.height * 0.45
      );
    $("cityHome").onclick = () => map.home();
    $("basemapButton").onclick = () => {
      $("basemapPanel").hidden = !$("basemapPanel").hidden;
    };
    $("greenAIButton").onclick = () =>
      ai && !ai.chatPanel.hidden ? closeAI() : openAI();
    $("mobileAI").onclick = openAI;
    $("mobileMap").onclick = () => {
      closePanel();
      closeAI();
      $("objectPanel").hidden = true;
    };
    $("mobileSearch").onclick = () => {
      $("greenSearch").focus();
    };
    $("mapMode").onclick = () => {
      const tilted = $("mapMode").textContent === "2D";
      map.viewer.camera.flyTo({
        destination: map.viewer.camera.positionWC,
        orientation: {
          heading: 0,
          pitch: tilted ? -Math.PI / 2 : -Math.PI / 3,
          roll: 0,
        },
        duration: 0.7,
      });
      $("mapMode").textContent = tilted ? "3D" : "2D";
      $("mapMode").setAttribute(
        "aria-label",
        tilted ? "3D-Ansicht aktivieren" : "2D-Ansicht aktivieren"
      );
    };
    $("fullscreen").onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        toast("Vollbild wird von diesem Browser nicht unterstützt.");
      }
    };
    $("locateMe").onclick = () => {
      if (!navigator.geolocation) {
        toast("Standort wird von diesem Browser nicht unterstützt.");
        return;
      }
      $("locateMe").disabled = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          $("locateMe").disabled = false;
          const { longitude, latitude } = position.coords;
          map.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              longitude,
              latitude,
              2400
            ),
            orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
            duration: 1,
          });
          toast(`Dein Standort wird angezeigt. Die ${dataLabel()} liegen in Köln.`);
        },
        () => {
          $("locateMe").disabled = false;
          toast(
            "Standort nicht verfügbar. Du kannst Köln weiter auf der Karte entdecken."
          );
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };
  }
  async function mount(viewer) {
    hydrateIcons();
    await GreenData.load();
    const treeLoad = GreenTrees.load().catch(() => false);
    const statusPill = document.querySelector(".demo-pill");
    if (statusPill && isRealData()) statusPill.innerHTML = "<i></i> OSM-Auszug";
    try {
      const stored = JSON.parse(
        localStorage.getItem("gruen-atlas:favorites") || "[]"
      );
      if (Array.isArray(stored))
        favorites = new Set(
          stored.filter((id) =>
            GreenData.collection.features.some((f) => f.id === id) || id.startsWith("citytree-")
          )
        );
    } catch {
      /* Storage is optional. */
    }
    $("themeNavigation").innerHTML = GreenData.themes
      .map(
        (t) =>
          `<button class="nav-item" data-theme="${t.id}" title="${
            t.name
          }">${icon(t.icon)}${t.name}</button>`
      )
      .join("");
    map = new GreenMap(viewer, (id) => showObject(id, false), updateContext);
    $("basemapName").textContent =
      currentBaseMapId === "basemap-libre" ? "Helle Stadtkarte" : "Detailkarte";
    document
      .querySelectorAll("[data-basemap]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.basemap === currentBaseMapId)
        )
      );
    await map.load();
    bind();
    showView("explore");
    void treeLoad.then((ready) => {
      if (!ready) return;
      if (statusPill) statusPill.innerHTML = "<i></i> OSM + Stadt Köln";
      map.refreshTrees();
      if (!panel().hidden && ["explore", "trees", "layers", "themes", "about"].includes(currentView))
        showView(currentView);
      updateContext();
    });
  }
  return {
    mount,
    icon,
    escape,
    art,
    showView,
    showObject,
    toast,
    openAI,
    closeAI,
    aiLocal,
    getActiveTheme: () => activeTheme,
    getContext: () => (map ? map.context() : []),
    getReportContext: () => (map ? map.reportsInView() : []),
    showError: (message) => {
      $("loadingScreen").textContent = message;
      $("loadingScreen").style.display = "flex";
    },
  };
})();
