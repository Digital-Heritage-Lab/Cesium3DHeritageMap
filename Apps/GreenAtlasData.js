/* Grün Atlas catalog. Demo data is used until a validated OSM export is available. */
window.GreenData = (() => {
  const themes = [
    {
      id: "trees",
      name: "Bäume",
      title: "Bäume in Köln",
      icon: "tree",
      color: "#378060",
      description:
        "Von der Linde am Straßenrand bis zum alten Parkbaum. Lerne die grünen Nachbarn deiner Stadt kennen.",
      layer: "Erfasste Bäume",
      filters: {
        species: "Baumart",
        condition: "Zustand",
        age: "Alter",
        district: "Stadtteil",
      },
      prompts: ["Welche Baumarten gibt es hier?", "Essbare Bäume zeigen", "Bäume in diesem Bereich"],
    },
    {
      id: "parks",
      name: "Grünflächen & Parks",
      title: "Ein Stück Grün für dich.",
      icon: "park",
      color: "#51854c",
      description:
        "Eine Pause am Weiher, eine Runde durch den Grüngürtel. Entdecke Kölns grüne Freiräume.",
      layer: "Parks & Grünflächen",
      filters: { district: "Stadtteil" },
      prompts: ["Grünflächen in diesem Bereich", "Wo ist der nächste Park?"],
    },
    {
      id: "play",
      name: "Spiel & Freizeit",
      title: "Draußen ist mehr drin.",
      icon: "play",
      color: "#bf8040",
      description:
        "Kleine Abenteuer, große Bewegung. Finde Orte zum Spielen und Aktivsein.",
      layer: "Spielplätze",
      filters: {
        ageGroup: "Altersgruppe",
        equipment: "Ausstattung",
        access: "Barrierefreiheit",
      },
      prompts: ["Spielplätze in diesem Bereich", "Spielplätze in der Nähe"],
    },
    {
      id: "dogs",
      name: "Hunde",
      title: "Zusammen raus.",
      icon: "dog",
      color: "#a17857",
      description:
        "Entdecke erfasste Hundeauslaufflächen. Regeln und Beschilderung vor Ort beachten.",
      layer: "Hundeauslaufflächen",
      filters: { district: "Stadtteil" },
      prompts: ["Hundeauslauf in diesem Bereich"],
    },
    {
      id: "gardens",
      name: "Gärten & Natur",
      title: "Hier wächst Gemeinschaft.",
      icon: "sprout",
      color: "#799043",
      description:
        "Erfasste Gärten und Naturorte. Nicht jeder Ort ist öffentlich zugänglich.",
      layer: "Gärten & Naturorte",
      filters: { kind: "Gartenform" },
      prompts: ["Gärten in diesem Bereich"],
    },
    {
      id: "cemeteries",
      name: "Friedhöfe",
      title: "Grüne Orte der Erinnerung.",
      icon: "arch",
      color: "#817f99",
      description:
        "Stille Wege, alte Bäume und Stadtgeschichte. Entdecke Friedhöfe aus einem neuen Blickwinkel.",
      layer: "Friedhöfe",
      filters: { district: "Stadtteil" },
      prompts: ["Friedhöfe in diesem Bereich"],
    },
    {
      id: "botanical",
      name: "Botanischer Garten",
      title: "Eine Welt voller Pflanzen.",
      icon: "flower",
      color: "#ad708b",
      description:
        "Botanisches Grün mitten in Köln. Ein Einstieg in die Vielfalt der Pflanzenwelt.",
      layer: "Botanische Orte",
      filters: {},
      prompts: ["Botanische Orte anzeigen"],
    },
    {
      id: "water",
      name: "Brunnen & Wasser",
      title: "Köln am Wasser.",
      icon: "water",
      color: "#538c9d",
      description:
        "Brunnen und erfasste Trinkwasserstellen. Betrieb und Wasserqualität vor Ort prüfen.",
      layer: "Brunnen & Trinkwasser",
      filters: { kind: "Art" },
      prompts: ["Brunnen in diesem Bereich"],
    },
    {
      id: "climate",
      name: "Klima & Umwelt",
      title: "Grün tut der Stadt gut.",
      icon: "sun",
      color: "#b59242",
      description:
        "Stadtgrün kann Schatten spenden und Aufenthaltsräume angenehmer machen. Messdaten sind noch nicht angebunden.",
      layer: "Grüne Klimaorte",
      filters: {},
      prompts: ["Grün und Stadtklima"],
    },
  ];
  const feature = (id, theme, name, lon, lat, place, properties = {}) => ({
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {
      theme,
      name,
      place,
      isDemo: true,
      source: "Grün Atlas · UX-Demodatensatz",
      ...properties,
    },
  });
  let collection = {
    type: "FeatureCollection",
    features: [
      feature(
        "park-1",
        "parks",
        "Aachener Weiher",
        6.9203,
        50.9356,
        "Innerer Grüngürtel · Innenstadt",
        {
          district: "Innenstadt",
          kind: "Park am Wasser",
          highlight: "Eine kleine Auszeit am Weiher",
          description:
            "Grün und Wasser ganz nah am Stadtleben. Entdecke diesen Ort in unserer Beispielkarte.",
        }
      ),
      feature(
        "park-2",
        "parks",
        "Rheinpark",
        6.9811,
        50.95,
        "Am Rhein · Mülheim",
        {
          district: "Mülheim",
          kind: "Park",
          highlight: "Weite Wiesen, weiter Blick",
        }
      ),
      feature(
        "park-3",
        "parks",
        "Volksgarten",
        6.94,
        50.9196,
        "Südstadt · Innenstadt",
        { district: "Innenstadt", kind: "Park" }
      ),
      feature("park-4", "parks", "Stadtwald", 6.897, 50.927, "Lindenthal", {
        district: "Lindenthal",
        kind: "Stadtwald",
      }),
      feature(
        "park-5",
        "parks",
        "Blücherpark",
        6.924,
        50.969,
        "Bilderstöckchen · Nippes",
        { district: "Nippes", kind: "Park" }
      ),
      feature(
        "tree-1",
        "trees",
        "Winter-Linde",
        6.922,
        50.949,
        "Innere Kanalstraße · Ehrenfeld",
        {
          species: "Linde",
          condition: "Gut",
          age: "30–60 Jahre",
          district: "Ehrenfeld",
          height: "14,2 m",
          trunk: "185 cm",
        }
      ),
      feature(
        "tree-2",
        "trees",
        "Stiel-Eiche",
        6.916,
        50.932,
        "Universitätswiese · Lindenthal",
        {
          species: "Eiche",
          condition: "Gut",
          age: "Über 60 Jahre",
          district: "Lindenthal",
          height: "21 m",
          trunk: "240 cm",
        }
      ),
      feature(
        "tree-3",
        "trees",
        "Platane am Rheinufer",
        6.969,
        50.94,
        "Rheingarten · Innenstadt",
        {
          species: "Platane",
          condition: "Beobachtung",
          age: "Über 60 Jahre",
          district: "Innenstadt",
          height: "19 m",
          trunk: "220 cm",
        }
      ),
      feature(
        "tree-4",
        "trees",
        "Feld-Ahorn",
        6.955,
        50.961,
        "Neusser Wall · Innenstadt",
        {
          species: "Ahorn",
          condition: "Gut",
          age: "Unter 30 Jahre",
          district: "Innenstadt",
          height: "9 m",
          trunk: "90 cm",
        }
      ),
      feature(
        "tree-5",
        "trees",
        "Sommer-Linde",
        6.949,
        50.924,
        "Vorgebirgstraße · Innenstadt",
        {
          species: "Linde",
          condition: "Gut",
          age: "30–60 Jahre",
          district: "Innenstadt",
          height: "16 m",
          trunk: "175 cm",
        }
      ),
      feature(
        "play-1",
        "play",
        "Spielplatz im Grüngürtel",
        6.927,
        50.942,
        "Innerer Grüngürtel · Innenstadt",
        {
          ageGroup: "3–6 Jahre",
          equipment: "Klettern",
          access: "Teilweise zugänglich",
        }
      ),
      feature(
        "play-2",
        "play",
        "Spielplatz im Rheinpark",
        6.981,
        50.953,
        "Rheinpark · Mülheim",
        { ageGroup: "6–12 Jahre", equipment: "Schaukeln", access: "Zugänglich" }
      ),
      feature(
        "play-3",
        "play",
        "Spielort im Volksgarten",
        6.938,
        50.918,
        "Volksgarten · Innenstadt",
        {
          ageGroup: "3–6 Jahre",
          equipment: "Sandspiel",
          access: "Nicht erfasst",
        }
      ),
      feature(
        "dog-1",
        "dogs",
        "Hunderunde im Grüngürtel",
        6.925,
        50.954,
        "Innerer Grüngürtel · Ehrenfeld",
        {
          district: "Ehrenfeld",
          kind: "Beispielfläche",
          description:
            "Keine bestätigte Freilauffläche. Regeln und Leinenpflicht vor Ort prüfen.",
        }
      ),
      feature(
        "dog-2",
        "dogs",
        "Hunderunde am Poller Rheinufer",
        6.99,
        50.92,
        "Poll · Porz",
        {
          district: "Porz",
          kind: "Beispielfläche",
          description:
            "Keine bestätigte Freilauffläche. Regeln und Leinenpflicht vor Ort prüfen.",
        }
      ),
      feature(
        "garden-1",
        "gardens",
        "Gemeinschaftsgarten Ehrenfeld",
        6.918,
        50.957,
        "Ehrenfeld",
        {
          kind: "Gemeinschaftsgarten",
          description:
            "Illustrativer Gartenstandort zum Erproben der Anwendung.",
        }
      ),
      feature(
        "garden-2",
        "gardens",
        "Gartenprojekt in der Südstadt",
        6.951,
        50.916,
        "Südstadt",
        {
          kind: "Urban Gardening",
          description:
            "Illustrativer Gartenstandort zum Erproben der Anwendung.",
        }
      ),
      feature(
        "cemetery-1",
        "cemeteries",
        "Melaten",
        6.916,
        50.942,
        "Aachener Straße · Lindenthal",
        {
          district: "Lindenthal",
          kind: "Friedhof",
          highlight: "Stadtgeschichte unter alten Bäumen",
        }
      ),
      feature(
        "cemetery-2",
        "cemeteries",
        "Südfriedhof",
        6.94,
        50.899,
        "Zollstock · Rodenkirchen",
        { district: "Rodenkirchen", kind: "Friedhof" }
      ),
      feature(
        "botanical-1",
        "botanical",
        "Flora & Botanischer Garten",
        6.971,
        50.9608,
        "Riehl · Nippes",
        { kind: "Botanischer Garten", highlight: "Köln blüht auf" }
      ),
      feature(
        "water-1",
        "water",
        "Heinzelmännchenbrunnen",
        6.957,
        50.9403,
        "Am Hof · Innenstadt",
        {
          kind: "Zierbrunnen",
          description:
            "Als Beispiel erfasst. Keine Aussage zu Betrieb oder Trinkwasserqualität.",
        }
      ),
      feature(
        "water-2",
        "water",
        "Weiher im Volksgarten",
        6.939,
        50.92,
        "Volksgarten · Innenstadt",
        { kind: "Gewässer" }
      ),
      feature(
        "water-3",
        "water",
        "Brunnen am Ebertplatz",
        6.957,
        50.9505,
        "Ebertplatz · Innenstadt",
        {
          kind: "Zierbrunnen",
          description:
            "Als Beispiel erfasst. Keine Aussage zu Betrieb oder Trinkwasserqualität.",
        }
      ),
      feature(
        "climate-1",
        "climate",
        "Schatten im Stadtgarten",
        6.936,
        50.945,
        "Stadtgarten · Innenstadt",
        {
          kind: "Grüner Klimaort",
          description:
            "Beispiel für einen grünen Aufenthaltsraum. Keine Temperatur- oder Schattenmessung vorhanden.",
        }
      ),
    ],
  };
  const normalize = (value) =>
    String(value)
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss");
  const theme = (id) => themes.find((item) => item.id === id);
  let dataMode = "demo";
  let photos = {};
  async function load() {
    const response = await fetch("Data/green-atlas.geojson");
    if (response.status === 404) return false;
    if (!response.ok) throw new Error("Grün-Datensatz konnte nicht geladen werden.");
    const candidate = await response.json();
    if (candidate.type !== "FeatureCollection" || !Array.isArray(candidate.features) || !candidate.features.length ||
      candidate.features.some((f) => !theme(f.properties?.theme) || !f.id || f.properties.isDemo !== false ||
        !/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/.test(f.properties.sourceUrl) ||
        (f.properties.wikidataUrl && !/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/.test(f.properties.wikidataUrl)) ||
        !f.properties.dataAsOf || f.geometry?.type !== "Point" ||
        !Array.isArray(f.geometry.coordinates) || !f.geometry.coordinates.every(Number.isFinite))) {
      throw new Error("Grün-Datensatz ist unvollständig oder ungültig.");
    }
    collection = candidate;
    dataMode = "osm";
    try {
      const photoResponse = await fetch("Data/green-photos.json");
      if (photoResponse.ok) {
        const manifest = await photoResponse.json();
        if (manifest.sourceDataAsOf === collection.dataAsOf && manifest.items && typeof manifest.items === "object") {
          const known = new Set(collection.features.map((f) => f.id));
          photos = Object.fromEntries(Object.entries(manifest.items).filter(([id, item]) =>
            known.has(id) && item && typeof item === "object" &&
            item.path === `Images/places/${id}.${item.path?.split(".").pop()}` &&
            /\.(jpg|png|webp)$/.test(item.path) &&
            /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(item.filePage) &&
            /^https:\/\/(?:creativecommons\.org|www\.creativecommons\.org|commons\.wikimedia\.org)\//.test(item.licenseUrl) &&
            typeof item.artist === "string" && typeof item.license === "string"
          ));
        }
      }
    } catch {
      /* A failed photo manifest does not prevent the map from loading. */
    }
    return true;
  }
  function search(query, themeId) {
    const words = normalize(query).trim().split(/\s+/).filter(Boolean);
    return collection.features.filter(
      (f) =>
        (!themeId || f.properties.theme === themeId) &&
        words.every((word) =>
          normalize(
            [
              f.properties.name,
              f.properties.place,
              theme(f.properties.theme).name,
              ...Object.values(f.properties),
            ].join(" ")
          ).includes(word)
        )
    );
  }
  function filtered(themeId, filters = {}) {
    return search("", themeId).filter((f) =>
      Object.entries(filters).every(
        ([key, value]) => !value || f.properties[key] === value
      )
    );
  }
  return { themes, get collection() { return collection; }, get dataMode() { return dataMode; }, load, theme, search, filtered, normalize, photo: (id) => photos[id] };
})();
