# Grün-Atlas-Daten

Der aktuelle Projektstand enthält **993 Kölner OSM-Orte** in `Apps/Data/green-atlas.geojson`, mit OSM-Datenstand `2026-09-18T10:54:21Z`. Ein kurzer Testdatensatz wurde vor diesem Abruf entfernt. Die App zeigt die 24 Demo-Orte nur, wenn die echte Datendatei nicht vorhanden ist.

## OpenStreetMap / Overpass Turbo

Der automatische Abruf läuft über `npm run data:refresh`. Er fragt mit [`scripts/cologne-green.overpassql`](scripts/cologne-green.overpassql) genau einmal den öffentlichen Overpass-Dienst ab, prüft die Antwort und ersetzt anschließend den lokalen Datensatz. Bei einer fehlgeschlagenen Antwort bleibt der bisherige Stand erhalten; ein zweiter Abruf am selben Tag endete mit HTTP 504 und hat die gültige Datei nicht ersetzt. Nach einem späteren Aktualisieren folgen `npm run test:atlas`, `npm run lint:atlas` und eine Browserprüfung.

Alternativ kann ein eigener [Overpass-Turbo](https://overpass-turbo.eu/)-Export (Rohdaten → JSON) mit `node scripts/import-overpass.mjs <exportdatei.json>` eingelesen werden.

Der Import nimmt Parks, Spielplätze, Hundeauslauf, Gärten, Friedhöfe, Brunnen/Trinkwasserstellen und **benannte** Bäume auf. Zur Kartenleistung beschränkt er jeden Bereich auf 30–250 Einträge; dies ist keine Vollerhebung. Die Overpass-Abfrage beschränkt sich auf das Kölner Verwaltungsgebiet, während die Importvalidierung zusätzlich grobe Koordinatengrenzen prüft. Bei Flächen ist der Mittelpunkt des OSM-Umgrenzungsrechtecks ein Kartenanker, kein Eingang. Ohne `name` zeigt die App eine sachliche Gattungsbezeichnung mit OSM-ID. Nicht belegte Angaben zu Baumzustand, Alter, Ausstattung und Barrierefreiheit werden nicht erzeugt. Öffentlich zugängliche Orte können nicht allein aus ihrer OSM-Kategorie abgeleitet werden.

Jeder importierte Datensatz behält OSM-Typ/ID als stabile Kennung, einen direkten OSM-Link, ODbL-Angabe, den Zeitstempel der OSM-Datenbank und bei vorhandenem `wikidata=Q…` einen Wikidata-Link. Der Herkunftshinweis erscheint in der Ortskarte. [OpenStreetMap-Daten und Lizenz](https://www.openstreetmap.org/copyright), [Overpass API und Nutzungsgrenzen](https://wiki.openstreetmap.org/wiki/Overpass_API).

## Ortsbilder aus Wikimedia Commons

45 der 993 Ortskarten zeigen ein Bild aus Wikimedia Commons. Die Zuordnung erfolgt ausschließlich über die Wikidata-ID am jeweiligen OSM-Objekt und dessen Bild-Eigenschaft P18; ein ähnlicher Ortsname allein reicht nicht. Der Abruf prüft die Commons-Metadaten, speichert eine verkleinerte Bilddatei lokal und schreibt Urheber, Bildlizenz und Commons-Dateiseite in `Apps/Data/green-photos.json`. Diese Angaben sind im jeweiligen Popup verlinkt. Vier bei der Sichtprüfung unpassende P18-Motive sind dauerhaft vom Import ausgeschlossen. Orte ohne geprüftes Bild behalten die schematische Illustration.

Nach einer Aktualisierung der OSM-Daten erzeugt `npm run photos:refresh` die Bildauswahl neu. Der Bildbestand gehört genau zum im Manifest vermerkten Datenstand; bei einem abweichenden OSM-Datenstand zeigt die App keine veralteten Zuordnungen. Die Bilder haben unterschiedliche freie Lizenzen, die jeweils im Popup stehen. [Wikidata P18](https://www.wikidata.org/wiki/Property:P18), [Commons-Nutzung und Namensnennung](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en).

## Städtisches Baumkataster

Die Baum-Ebene ergänzt den OSM-Auszug um **107.853 Einzelbäume** aus dem [Baumkataster der Stadt Köln bei Open.NRW](https://open.nrw/dataset/e02ad618-ab42-48b5-8551-849aa936bb99). Quelle ist der dort verlinkte öffentliche WFS des Amts für Landschaftspflege und Grünflächen; Lizenz: [Datenlizenz Deutschland – Zero – Version 2.0](https://www.govdata.de/dl-de/zero-2-0). Der lokale Schnappschuss `Apps/Data/baumkataster.json` wurde am 18. September 2026 abgerufen. `npm run trees:refresh` fragt den WFS seitenweise mit stabiler Sortierung ab, prüft Anzahl, IDs und Koordinaten und ersetzt die Datei erst nach vollständigem Erfolg.

Der WFS liefert Punkte im Koordinatensystem EPSG:25832; der Import wandelt sie für die Karte in WGS84 um. Er übernimmt nur veröffentlichte Attribute wie deutschen/botanischen Namen, Baumnummer, Straße, Stadtteil und vorhandene Maße. Fehlende Angaben bleiben leer. Auf der Karte werden bei naher Ansicht nur Bäume im aktuellen Ausschnitt als anklickbare, gruppierte Marker dargestellt; Suche und Ortskarte können den gesamten lokalen Schnappschuss nutzen. Die 13 benannten OSM-Bäume bleiben als klar gekennzeichnete, getrennte Quelle erhalten.

Das Kataster umfasst nur von der Stadt verwaltete und betreute Einzelbäume im Straßenland und auf bebauten städtischen Objekten, nicht alle Bäume Kölns. Der Anbieter aktualisiert den Dienst täglich; der mitgelieferte Schnappschuss aktualisiert sich erst mit `npm run trees:refresh` und einer neuen Veröffentlichung. Die Stadt übernimmt keine Gewähr für eine exakte Lage; die Punkte ersetzen keinen amtlichen Lageplan.

## Weitere Quellen

Ein [Grünflächenkataster](https://www.offenedaten-koeln.de/) bleibt eine mögliche spätere Fachquelle und ist noch nicht eingebunden. Wikidata dient derzeit nur zur Bildzuordnung; weitere Sachdaten werden nicht importiert. Für „Klima & Umwelt“ liegen in der Karte weiterhin keine Messwerte vor.
