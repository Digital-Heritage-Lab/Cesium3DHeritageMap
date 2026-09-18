# Grün Atlas Köln

**Das digitale Grün der Stadt entdecken, verstehen und intelligent nutzen.**

Entwickelt von der **Stadt Köln, Amt für Landschaftspflege und Grünflächen**.

Eine eigenständige Urban-Green-Oberfläche auf der vorhandenen CesiumJS-Anwendung: helle Karte, Themen-Navigation, Smart Search, Ortskarten und GrünAI. Die technische Basis und Bestandsdaten bleiben erhalten.

## Lokal starten

```sh
npm ci
npm run build
npm run start
```

Öffnen: http://localhost:8080/Apps/3DHeritageMapApp.html

Die vorhandene Denkmal-/3D-Anwendung bleibt unter `/Apps/HeritageMap.html` erreichbar. Ihre ursprüngliche Dokumentation steht in [README-HERITAGE.md](README-HERITAGE.md).

## Enthalten

- Neun Grün-Themen mit 993 Kölner OSM-Orten (Datenstand 18. September 2026) und ausdrücklich gekennzeichnetem Demo-Fallback.
- 107.853 städtische Einzelbäume aus dem Kölner Baumkataster als suchbare, bei nahem Zoom anklickbare Baum-Ebene.
- Responsive Themen-Navigation, Entdecken-Karten und mobile Bottom Sheets.
- Suche über Namen, Kategorien und Attribute; keine vorgetäuschte stadtweite Adresssuche.
- Kontextfilter, Ebenenschalter, Deckkraft, Legende, Zoom zum Thema und anklickbare Kartenmarker.
- Gemeinsame Ortskarten für Suchtreffer und Kartenobjekte; lokale Merkliste.
- 45 zugeordnete Commons-Ortsbilder mit Urheber, Lizenz und Bildquelle direkt im Popup.
- Helle CARTO-Grundkarte über bestehenden Serverproxy; OpenStreetMap als Fallback; optionales Ion-Luftbild.
- Zoom, Standort mit Fehleranzeige, geneigte 3D-Ansicht und Vollbild.
- GrünAI mit lokalen, regelbasierten Kartenaktionen und echten Treffern im Kartenausschnitt. Freie KI-Fragen sind optional über den vorhandenen Chat-Proxy verfügbar.

## Daten und Grenzen

Die App lädt den begrenzten OpenStreetMap-Auszug aus `Apps/Data/green-atlas.geojson` und den separaten Schnappschuss des städtischen Baumkatasters aus `Apps/Data/baumkataster.json`. Sie zeigt Quelle, Datenstand und Lizenz je Ort. Die Demo-Orte sind nur noch ein gekennzeichneter Fallback für Installationen ohne OSM-Datei. Der OSM-Auszug ist keine Vollerhebung: je Thema sind höchstens 30–250 Orte enthalten, OSM-Bäume nur mit Namen. Auch das städtische Kataster umfasst nicht alle Bäume. Flächenpunkte liegen am Mittelpunkt des OSM-Umgrenzungsrechtecks und sind keine Eingänge. Anleitung und Grenzen: [DATENQUELLEN.md](DATENQUELLEN.md). Ein Teil der Ortskarten zeigt zugeordnete Commons-Bilder; die übrigen Illustrationen sind keine Ortsfotos. Es gibt noch keine Routenberechnung, Messdaten oder flächendeckende Adresssuche. Aussagen über Betrieb, Trinkwasserqualität, Leinenregeln oder Pflegezustände werden daraus nicht abgeleitet.

Die 361 vorhandenen Denkmalobjekte und 3D-Metadaten bleiben unverändert. Der neue Kartenadapter verwendet denselben Cesium Viewer und separate Datenquellen. Neue Fachquellen können später an den Adapter angeschlossen werden; nicht implementierte WFS-/WMS-/PostGIS-Dienste werden nicht simuliert.

## Architektur

| Datei | Aufgabe |
| --- | --- |
| `Apps/3DHeritageMapApp.html` | Neue Produkthülle, Navigation und Metadaten |
| `Apps/GreenAtlas.css` | Eigenständige Design Tokens, Layout und Responsive Styles |
| `Apps/GreenAtlasData.js` | Themenkatalog, Datensatzwechsel, Suche und Filter |
| `Apps/GreenTrees.js` | Baumkataster-Leser, Bereichsindex und stadtweite Baumsuche |
| `scripts/import-overpass.mjs` | Import aus einem exportierten Overpass-JSON ohne Netzwerkanfragen |
| `scripts/fetch-green-data.mjs` | Einmaliger Overpass-Abruf mit Größenlimit und Prüfung vor dem Ersetzen |
| `scripts/update-green-photos.mjs` | Wikidata-P18-/Commons-Abruf mit Bildattribution und lokaler Vorschau |
| `scripts/update-tree-cadastre.mjs` | Vollständiger WFS-Abruf und Koordinatentransformation des Baumkatasters |
| `Apps/GreenAtlasMap.js` | Cesium-Datenquellen, Marker, Auswahl und räumlicher Kontext |
| `Apps/GreenAtlas.js` | UI, wiederverwendbare Ortskarten, Merkliste und Navigation |
| `Apps/GreenAI.js` | Neue Chat-Oberfläche, lokale Aktionen, optionale Serveranbindung |
| `Apps/3DHeritageScripts.js` | Bestehende Karteninitialisierung mit separatem Grün-Atlas-Modus |
| `Apps/AIChatBot.js` | Wiederverwendeter Chat-Lebenszyklus und Bestandsassistent |
| `netlify/functions/` | Bestehende Chat- und Grundkarten-Proxys |

Die Dateien bleiben direkt unter `Apps/`, passend zum bestehenden Deployment-Kopierer. Keine neue Bibliothek wurde ergänzt. Der Paketname `cesium` bleibt für die eingebettete Cesium-Distribution erhalten.

## Konfiguration

Lokale Serverkonfiguration liegt in der ignorierten `.env`; in Netlify werden entsprechende Umgebungsvariablen gesetzt:

- `CARTO_BASEMAP_API_KEY`: optional für die helle Grundkarte. Ohne Konfiguration startet OpenStreetMap.
- `OPENROUTER_API_KEY`: optional für freie KI-Fragen; ausschließlich serverseitig.
- `OPENROUTER_MODEL`: optionaler Modellname für den bestehenden Chat-Proxy.

Die lokale Merkliste verwendet `gruen-atlas:favorites` im Browser. Geolocation wird nur durch den Standort-Button angefordert. Freie KI-Fragen senden nach Aktivierung den Fragetext, Gesprächsverlauf und bis zu 30 sichtbare Orte mit Quellenangabe an den Server.

## Prüfen und veröffentlichen

```sh
npm run test:atlas
npm run lint:atlas
npm run build:netlify
```

Netlify: Build `npm run build:netlify`, Publish-Verzeichnis `dist`. Der Root-Pfad leitet auf die App. Die separate Produktprüfung deckt Demo-Daten, Suchnormalisierung, Filter und Laufzeitdateien ab; Cesiums bestehende Tests bleiben verfügbar.

Siehe [REDESIGN-REVIEW.md](REDESIGN-REVIEW.md) für Prüfstand und Grenzen. Lizenz und Attribution der Cesium-Basis sowie Digital Heritage Lab, Ertan Özcan und OK Lab Köln bleiben erhalten.
