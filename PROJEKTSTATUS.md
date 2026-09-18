# Grün Atlas Köln

Entwickelt von der Stadt Köln, Amt für Landschaftspflege und Grünflächen.

Das visuelle und UX-Redesign ist implementiert. Die primäre Seite ist `Apps/3DHeritageMapApp.html`; die ursprüngliche Denkmal-Anwendung bleibt unter `Apps/HeritageMap.html` erhalten.

Die Grün-Ansicht verwendet 993 Kölner OSM-Objekte (Datenstand 18. September 2026) in acht Themen; für Klima liegen keine Messwerte vor. Die 24 gekennzeichneten Demo-Objekte werden nur ohne echte Datendatei geladen. Die App enthält Suche, Kontextfilter, Ebenenoptionen, Merkliste, Ortskarten und GrünAI. Freie KI-Fragen benötigen einen erreichbaren, konfigurierten Serverdienst; lokale Kartenaktionen funktionieren unabhängig davon.

Zusätzlich ist ein vollständiger Schnappschuss des städtischen Baumkatasters mit 107.853 Bäumen (Abruf 18. September 2026) eingebunden. Die Baum-Ebene zeigt bei nahem Zoom gruppierte Einzelmarker; die Suche findet Baumnummern, Arten und Straßen stadtweit. Popups zeigen nur vorhandene Fachattribute und verlinken die Open.NRW-Quelle. Der WFS kann mit `npm run trees:refresh` erneut abgefragt werden.

45 Ortskarten enthalten zugeordnete, lokal gespeicherte Wikimedia-Commons-Bilder. Jeder Bild-Popup zeigt Urheber, Lizenz und Originaldatei. Die übrigen Orte behalten eine Illustration. Die Bilddaten werden über OSM-Wikidata-IDs und Wikidata P18 mit `npm run photos:refresh` aktualisiert.

Ein automatischer, reproduzierbarer Overpass-Abruf und Import für einen begrenzten Kölner OSM-Auszug ist implementiert. Der echte Abruf und die Kartenanzeige wurden lokal geprüft. Ein weiterer Aktualisierungsversuch endete mit HTTP 504; die gültige Datei blieb erhalten. Die Quellenanleitung steht in [DATENQUELLEN.md](DATENQUELLEN.md).

Details: [README.md](README.md) und [REDESIGN-REVIEW.md](REDESIGN-REVIEW.md).

Die historische [Bestandsanalyse](GRUEN-ATLAS-ANALYSE.md) dokumentiert den Ausgangsstand vor dem Umbau und ist kein aktueller Funktionsbericht.

Basis: Digital-Heritage-Lab/Cesium3DHeritageMap, ursprünglicher Import aus Commit `8bf2ecf`. Lizenz und Urheberhinweise bleiben erhalten. Der GitHub-Import enthält weder die alte Git-Historie noch lokale `.env`-Dateien oder projektspezifische Cesium-Zugangstokens.

Ein GitHub-Upload allein veröffentlicht noch keine laufende Website. Die Netlify-Konfiguration mit Build `npm run build:netlify` und Publish-Verzeichnis `dist` ist vorhanden.
