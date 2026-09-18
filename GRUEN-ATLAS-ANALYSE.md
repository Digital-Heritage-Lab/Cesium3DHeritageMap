# Grün Atlas Köln – Bestandsanalyse und Umbauplan

Stand: 18. September 2026. Phase 1: Quellcodeanalyse; Phase 2: vorgeschlagener Umbauplan. Die Anwendung wurde noch nicht umgebaut.

## Ergebnis

Die bestehende Cesium-Anwendung ist eine geeignete Grundlage. Ein neues Projekt, ein Framework-Wechsel oder eine zusätzliche Kartenbibliothek sind nicht erforderlich. Die fachliche Erweiterung sollte in kleinen Modulen unter `Apps/` erfolgen. Cesium-Engine, bestehende Denkmaldaten, Datenbankansicht und 3D-Funktionen bleiben erhalten.

Der Workspace enthält das eigentliche Repository im Unterordner `Cesium3DHeritageMap-main`. Es ist eine CesiumJS-Distribution mit eigener Fachanwendung, keine React-/Next.js-App. Deshalb dürfen Bibliotheksquellen, Paketname und generierte Dateien nicht pauschal auf das neue Produkt umbenannt werden.

## Technischer Bestand

| Bereich | Befund / Einstieg |
| --- | --- |
| Framework | Klassisches HTML, CSS und JavaScript; CesiumJS 1.117.0; keine UI-Framework-Abhängigkeit |
| Hauptseite | `Apps/3DHeritageMapApp.html`; lädt Cesium, beide Stylesheets, `AIChatBot.js` und `3DHeritageScripts.js` |
| Karte | `Apps/3DHeritageScripts.js:1859`, `initViewer()`; ein zentraler Cesium Viewer |
| Kartenfunktionen | Zoom, Pan, Neigen, Home, Cesium-Geocoder, Grundkartenwechsel, Objektselektion, Cluster, Kamera-Flüge, 3D Tiles |
| Grundkarten | Katalog ab `Apps/3DHeritageScripts.js:244`; Luftbild, OSM, optionale Mapbox-/Libre-Varianten und Google Photorealistic; Verfügbarkeit abhängig von Konfiguration und externen Diensten |
| Daten | GeoJSON-Ladepfad ab `Apps/3DHeritageScripts.js:1541`; Remote-Anfrage mit lokalem Fallback; separate 3D-Asset-Metadaten |
| Objektinformationen | `Apps/3DHeritageScripts.js:1991`, `showEntityInfo()`; eigenes Informationspanel statt Cesium-Attributfenster |
| Navigation | Linker Button-Dock mit Filter, Story Map, Grundkarte, Datenbank und Projektlink; noch keine fachliche Themen-Sidebar |
| Panels | `Apps/3DHeritageScripts.js:2102`; zentrales Öffnen/Schließen und `aria-expanded`; Informationen können neben Story Map bzw. KI bleiben |
| State | Globale Variablen, DOM-Zustand, Cesium-Datenquellen, Maps und zwischengespeicherte Promises; kein zentraler fachlicher Store |
| GEO AI | `Apps/AIChatBot.js`; Klasse `HeritageAIChat`, Command Registry, Chatverlauf, lokale Denkmal-Suche, LLM-Aktionen und Offline-Fallback |
| KI-Kontext | `Apps/AIChatBot.js:400`; aktuelle Grundkarte, Markerfilter, Gebäudelayer und Kameraposition; lokale Suchtreffer werden ebenfalls übermittelt |
| KI-Backend | `/api/chat`, lokal in `server.js`, produktiv in `netlify/functions/chat.mjs`; OpenRouter, serverseitiger Schlüssel, Größenlimits, Timeout und Modell-Fallback |
| Styles | `Apps/3DHeritageStyles.css`; Design Tokens, lokale Schriftdateien, Panels, Buttons, Fokuszustände, Breakpoints bei 768/480 px |
| Chat-Styles | `Apps/AIChatStyles.css`; separater responsiver Chat |
| Weitere Fachseite | `DBApp/dbapp.html`, `script.js`, `styles.css`: Denkmal-Suche, Tabelle, Bilder und Kartenverknüpfungen |
| Routing | Statische HTML-Seiten, kein SPA-Router; Karten-Deep-Links über `lat`/`lon`; Netlify leitet `/` auf die Hauptseite |
| Lokaler Server | Node/Express in `server.js`; statische Dateien und Chat-/Kartenproxy |
| Build | Gulp/esbuild; `npm run build`; `npm run build:netlify` baut und erstellt `dist` |
| Deployment-Paket | `scripts/prepare-netlify-dist.js`; kopiert direkte Laufzeitdateien unter `Apps/`, dazu Data, Images, Build/Cesium und DBApp |
| Tests | Jasmine/Karma und Playwright vorhanden; die vorhandenen E2E-Dateien konzentrieren sich auf Cesium, Viewer, Picking, Modelle und Sandcastle |
| Bibliotheksbestand | `Source/`, `packages/`, `Specs/`, `ThirdParty/`, `Build/`; nicht Bestandteil eines pauschalen Produkt-Refactorings |

## Datenbestand

`Apps/Data/denkmaeler.json` ist eine GeoJSON FeatureCollection mit 361 Features. Die Eigenschaften betreffen Denkmalnummer, Adresse, Stadtbezirk, Kategorie, Bezeichnung, Baujahr, Unterschutzstellung sowie Foto-, Wikipedia-, OSM- und Modellverknüpfungen.

`Apps/Data/denkmaeler_old.json` und `Apps/Data/assets.json` bleiben erhalten. Die Anwendung verwendet zusätzlich den konfigurierten OpenDEM-Endpunkt und Cesium-Ion-Assets. Deren aktuelle Erreichbarkeit wurde in dieser Analyse nicht geprüft.

Es gibt im untersuchten Fach-Datenverzeichnis noch keine Datensätze für Baumkataster, Spielplätze, Friedhöfe oder andere Grün-Themen. Dafür sind separate, ausdrücklich gekennzeichnete Demo-Daten erforderlich, bis echte Quellen angeschlossen werden. Aus bestehenden Denkmaldaten dürfen keine fachlich ungeprüften Grün-Daten abgeleitet werden.

## Befunde nach Priorität

### [IMPORTANT] Fachliche Logik ist fest an Denkmäler gebunden

Filter, Suchfelder, Popups, Touren und KI-Aktionen beziehen sich auf das Denkmal-Schema. Ein reines Umbenennen wäre unzureichend. Ein gemeinsames Grün-Objektmodell und eine Layer-Konfiguration müssen neben dem Bestand ergänzt werden.

Betroffen: `Apps/3DHeritageScripts.js:1238`, `:1375`, `:1991`; `Apps/AIChatBot.js:370`, `:715`.

Prüfung nach Änderung: Denkmalfilter und Bestands-Popups weiter testen; neue Grün-Objekte müssen unabhängig davon sichtbar, suchbar und auswählbar sein.

### [IMPORTANT] Mehrere Konfigurationsstände

Die Hauptdatei enthält eine aktive Inline-Konfiguration. Daneben existiert `Apps/config.js`, das die Hauptseite nicht als Modul lädt. Eine Änderung nur dieser separaten Datei würde das Verhalten der Hauptseite nicht aktualisieren. Beide enthalten Token-Konfiguration; Werte werden hier nicht wiedergegeben. Der OpenRouter-Schlüssel wird dagegen serverseitig gelesen.

Betroffen: `Apps/3DHeritageScripts.js:6`, `Apps/config.js`, `Apps/3DHeritageMapApp.html`.

Prüfung nach Änderung: genau einen wirksamen Konfigurationspfad verwenden; keine Schlüssel in neue Daten-/UI-Module kopieren; Kartenstart lokal und im Deployment prüfen.

### [IMPORTANT] Mobile Oberfläche ist noch kein Themen-Drawer

Die mobile Navigation verwendet fünf Buttons in einer Reihe und überlagernde Panels. Acht Grün-Kategorien passen nicht sinnvoll in dieses Muster. Außerdem deaktiviert der HTML-Viewport derzeit Benutzer-Zoom.

Betroffen: `Apps/3DHeritageStyles.css:854`, `Apps/3DHeritageMapApp.html:7`.

Prüfung nach Änderung: mobile Themen als Drawer/Bottom Sheet, erreichbare Schließen-Aktion, Fokus-Rückgabe, Escape, Browser-Zoom und sichtbare Kartenattribution testen.

### [IMPORTANT] KI-Kontext ist noch kein Kartenausschnitt-Filter

Die KI erhält Kameraposition und Layerzustände. Das ist noch keine räumliche Auswertung aller sichtbaren Grün-Objekte. Aussagen wie „Bäume in diesem Bereich“ benötigen eine echte Berechnung anhand des sichtbaren Kartenausschnitts. Neue fachliche Antworten dürfen nicht allein aus Prompt-Text entstehen.

Betroffen: `Apps/AIChatBot.js:400`, `:436`, `:550`.

Prüfung nach Änderung: räumliche Treffer gegen einen bekannten Demo-Datensatz prüfen; keine Treffer, nicht konfigurierte KI und fehlende Quellen klar unterscheiden.

### [IMPORTANT] Neue Unterordner benötigen eine Anpassung des Deployment-Kopierers

`discoverRuntimeFiles()` kopiert direkte Dateien in `Apps/`, aber nicht automatisch neue Unterordner wie `Apps/layers/` oder `Apps/services/`. Ohne Anpassung würden neue Module lokal funktionieren und im Deployment fehlen.

Betroffen: `scripts/prepare-netlify-dist.js`, Funktion `discoverRuntimeFiles()`.

Prüfung nach Änderung: erzeugtes `dist` auf alle Imports und Datenpfade prüfen; Laufzeittest aus dem fertigen Paket.

### [SUGGESTION] Vorhandene Komponenten gezielt erweitern

Panel-Manager, Chat-UI, Button-Stile, Design Tokens, Objekt-Panel, Kamerafunktionen und GeoJSON-Lader sind wiederverwendbar. Die bestehende dunkle, türkise Gestaltung kann über Tokens ruhiger und grün akzentuiert werden. Eine zweite unabhängige Karten- oder Panel-Infrastruktur wäre unnötig.

## Kurzer Umbauplan

1. **Produkt und Oberfläche:** Name, Untertitel, deutsche Bedienbeschriftungen und grüne Design Tokens in bestehendem HTML/CSS aktualisieren. Vorhandene Projekt-/Datenquellenhinweise bleiben nachvollziehbar. Karte und Dock-/Panel-Grundprinzip bleiben bestehen.
2. **Daten und Layer:** `Apps/layers/greenLayers.js` als deklarativen Katalog und `Apps/Data/green-demo.geojson` ergänzen. Jeder Layer bekommt ID, Thema, Beschreibung, Quelle, Demostatus, Stil, Legende, Popup-Typ und optionale Filter. Demo-Fachattribute und ungeprüfte Positionen ausdrücklich kennzeichnen.
3. **Kartenadapter:** `Apps/map/greenMapAdapter.js` ergänzt eigene Cesium-Datenquellen. Sichtbarkeit, Transparenz, Zoom und Auswahl nutzen den bestehenden Viewer. Bestehende Denkmaldaten bleiben getrennt und weiterhin erreichbar.
4. **Themen und Kontext:** `Apps/components/GreenSidebar.js` stellt die acht Themen mit aufklappbaren Layerdetails dar. `Apps/greenState.js` hält aktives Thema, Layerzustände, Filter und Auswahl; Änderungen werden ereignisgesteuert weitergegeben. Ein neues State-Framework ist nicht nötig.
5. **Suche und Cards:** `Apps/services/greenSearch.js` durchsucht die geladenen Grün-Objekte mit Kategorien. `Apps/components/GreenObjectCard.js` dient Suche, Entdecken und Detailansicht. Entfernung nur mit verfügbarer Referenzposition; keine erfundenen Bilder oder Attribute.
6. **GrünAI:** bestehende Klasse und Chat-Oberfläche erweitern; Begrüßung, deutsche Quick Actions und fachliche Aktionen aktualisieren. Ein Kartenkontext-Adapter liefert sichtbare Grenzen, aktive Layer und tatsächliche Treffer. Lokale Aktionen klar von verfügbaren LLM-Antworten unterscheiden.
7. **Responsive und Kartenkomfort:** mobile Themen-/Filteransicht als Drawer oder Bottom Sheet; GrünAI als Floating Button. Geolocation mit Fehlerzuständen, Legende und leicht erreichbare Kartenaktionen ergänzen. Grundkarten- und 3D-Funktionen weiterverwenden.
8. **Verifikation:** Suchtreffer → Karte → Details, Layer-Schalter/Transparenz/Zoom, Themenfilter, mobile Panels und GrünAI mit/ohne Backend testen. Danach Build, Lint und gezielte Browserprüfungen ausführen.

Die kleinen neuen Module sind erforderlich, damit Grün-Daten, Darstellung und KI-Kontext nicht weiter in der bereits über 2.200 Zeilen langen Hauptdatei vermischt werden. Bestehende Funktionen werden dabei nicht großflächig verschoben. Für neue Modulunterordner wird der Deployment-Kopierer im gleichen Schritt angepasst.

## Erweiterungsverträge

- Fachobjekt: `id`, `layerId`, `name`, `category`, `geometry`, `properties`, `source`, `isDemo`, optional `image` mit Attribution.
- Layer: `id`, `category`, `name`, `description`, `source`, `defaultVisible`, `style`, `legend`, `popup`, `filters`.
- Kartenadapter: `loadLayer`, `setVisibility`, `setOpacity`, `focusObject`, `getViewContext`.
- Kontext: aktives Thema, sichtbare Grenzen, aktive Layer, Filter und ausgewähltes Objekt. In 3D nicht verfügbare Grenzen explizit behandeln.
- Zunächst nur vorhandene Daten und GeoJSON tatsächlich implementieren. WFS, WMS, REST, Vector Tiles, 3D Tiles und Modelle später über passende Adapter ergänzen. PostGIS-Zugriff bleibt serverseitig; QGIS ist kein Browser-Datenformat.

## Prüfstatus dieser Analyse

- Quellcode von Hauptseite, Karteninitialisierung, Datenladepfaden, Panel-Steuerung, Chat, Styles, Datenbankansicht, Server und Deployment-Konfiguration untersucht.
- Lokale GeoJSON-Datei erfolgreich eingelesen; 361 Features und das vorhandene Schema festgestellt.
- `node --check` für `Apps/3DHeritageScripts.js`, `Apps/AIChatBot.js`, `server.js` und `netlify/functions/chat.mjs` erfolgreich.
- Noch kein Build, Browser-/WebGL-Test oder Live-Test externer Dienste ausgeführt. Responsive Verhalten ist anhand der Styles analysiert, nicht visuell bestätigt. Bestehende Funktionalität ist damit noch nicht vollständig verifiziert.
- Keine Anwendungsdateien oder Datensätze verändert; lediglich dieses Analyse-Dokument ergänzt.
