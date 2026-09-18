# Grün Atlas Köln – Umsetzungs- und Prüfstand

## Umsetzung

Die primäre Oberfläche ist vollständig neu gestaltet: eigene Waldgrün-/Salbei-Tokens, lokale Typografie, Logo, helle Kopfzeile, Themen-Navigation, Entdecken-Karten, gemeinsame Ortskarten, Floating Controls und mobile Bottom Sheets. Die alte CSS-Oberfläche wird auf der Hauptseite nicht mehr geladen.

Technisch bleiben Cesium, Kartenanbieter, serverseitige Proxys und die bisherige Chat-Basisklasse erhalten. Die ursprüngliche Fachanwendung ist unter `Apps/HeritageMap.html` separat erreichbar. Ihre GeoJSON-Dateien wurden nicht verändert.

Neue Fachlogik ist getrennt nach Daten, Kartenadapter, UI und GrünAI. Der bestehende Deployment-Kopierer erfasst die neuen Dateien direkt unter `Apps/`. Zusätzliche Laufzeit-Abhängigkeiten waren nicht erforderlich.

## Erfolgreiche Prüfungen

- `npm run build`: vollständiger Cesium-Release-Build erfolgreich.
- `npm run test:atlas`: sechs Tests erfolgreich; Datenintegrität, Themen, Suchnormalisierung, Mehrwortsuche, Kategorien, kombinierte Filter und Laufzeitdateien.
- `npm run lint:atlas`: keine Fehler in den neuen Modulen und dem angepassten Karten-Bootstrap.
- `npm run prepare-netlify-dist`: Laufzeitpaket erstellt; neue Module, eigene Styles und Logo enthalten.
- Bereinigtes Laufzeitpaket separat ohne Zugangsschlüssel geprüft: automatische OpenStreetMap-Ausweichkarte rendert 13 anfänglich aktive Demo-Orte. Ein simulierter 503-Status für den nicht konfigurierten Chat zeigt den passenden Hinweis; anschließend findet die lokale Baumaktion weiterhin alle fünf Demo-Bäume.
- Desktop: Suchbeispiel Melaten → Ortskarte → Kartenfokus; Kartenklick auf Blücherpark → passende Ortskarte.
- Baumfilter „Linde“ zeigt Winter- und Sommer-Linde; Spielplatzfilter „6–12 Jahre“ zeigt den Beispiel-Spielplatz im Rheinpark.
- Ebenenschalter: Ausblenden der fünf Bäume reduziert den sichtbaren Demo-Bestand im Gesamtblick von 13 auf 8.
- Merkliste bleibt nach Neuladen erhalten.
- GrünAI: Baumkontext liefert die tatsächlich erfassten Baumarten Linde, Eiche, Platane und Ahorn und kennzeichnet die Demo-Grenze.
- Responsive Ansichten im echten Chromium-Browser: 1920 px und 1440 px Desktop, 1024 × 768 Tablet, 390 × 844 und 320 × 568 Smartphone. Keine horizontale Seitenüberschreitung bei den geprüften Breiten. Ortskarte und Chat auf kleinen Bildschirmen bedienbar.
- Kartenattribution bleibt sichtbar; Suchfeld, Filter und Schließen-Aktionen sind beschriftet. Escape und Fokus-Rückgabe sind implementiert. Browser-Zoom ist nicht mehr deaktiviert.

## Grenzen und Befunde

- Freie KI-Fragen: Die vorhandene externe Anbindung lieferte im Test keine Antwort. Der Fehlerzustand wurde geprüft; lokale GrünAI-Aktionen bleiben verfügbar. Eine erfolgreiche LLM-Antwort wird nicht behauptet.
- Alle 24 Grün-Objekte sind illustrative Demo-Daten, keine amtlichen Bestände. Keine Live-Pflegedaten, Routen, stadtweite Adresssuche oder Temperaturmessungen.
- Geolocation-Erfolg hängt von der Browserfreigabe und Geräteposition ab; im Browser wurde keine persönliche Standortfreigabe erteilt. Fehlerbehandlung ist implementiert, ein echter Gerätestandort wurde nicht verifiziert.
- Browser-Erweiterungen erzeugten vereinzelt „message channel closed“-Meldungen. Während der fertigen App-Prüfung wurde kein Fehler in den neuen Anwendungsmodulen festgestellt. Ein Zwischenaufruf während des laufenden Cesium-Builds traf auf eine noch nicht fertig erzeugte Bibliotheksdatei; nach Buildabschluss wurde neu geladen und weiter geprüft.
- Die Übernahme enthielt leere Verzeichnisse statt der zwei npm-Workspace-Verknüpfungen für `@cesium/engine` und `@cesium/widgets`. Diese wurden lokal als Junctions auf die vorhandenen Pakete repariert. Der Build lief anschließend erfolgreich. Die nicht vorhandene ESLint-Elternkonfiguration wurde durch eine gültige App-Konfiguration ersetzt.
- Keine vollständige WCAG-Zertifizierung, kein Test sämtlicher Cesium-Bibliotheksfunktionen und kein Produktions-Hosting behauptet.

## Dateien und Begründung

| Datei | Änderung |
| --- | --- |
| `Apps/3DHeritageMapApp.html`, `Apps/GreenAtlas.css`, `Apps/Images/gruen-atlas.svg` | Neue sichtbare Produktidentität und Responsive Navigation |
| `Apps/GreenAtlasData.js` | Erweiterbarer Themenkatalog und explizite Demo-Daten |
| `Apps/GreenAtlasMap.js` | Eigenständige Grün-Datenquellen im vorhandenen Cesium Viewer |
| `Apps/GreenAtlas.js` | Themen, Suche, Cards, Favoriten und Kartenbedienung |
| `Apps/GreenAI.js` | Neue Assistenten-Oberfläche mit ehrlichem lokalem/externem Betriebsmodus |
| `Apps/3DHeritageScripts.js` | Kleiner Produktmodus im vorhandenen Bootstrap; bestehender Modus bleibt erhalten |
| `Apps/HeritageMap.html` | Erhält die ursprüngliche Fachanwendung |
| `Apps/.eslintrc.json`, `scripts/test-green-atlas.mjs`, `package.json` | Reproduzierbare Produktprüfungen |
| `index.html`, `scripts/prepare-netlify-dist.js` | Neuer Einstieg und korrekte Produktbezeichnung im Paket |
| `README.md`, `README-HERITAGE.md`, `PROJEKTSTATUS.md` | Aktuelle Dokumentation mit erhaltener Herkunft |

Der separate lokale Veröffentlichungs-Checkout liegt unter `../github-publish/repo`. Dort werden projektspezifische Zugangstokens vor dem GitHub-Upload entfernt. Der ursprüngliche Checkout behält seine vorhandene lokale Konfiguration.
