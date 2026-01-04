# AGENTS

## Project Context
- Repo basiert auf CesiumJS 1.117.0 und enthaelt eine Custom App fuer die 3D Heritage Map.
- Haupt-UI und Logik liegen unter `Apps/`.

## Primary App Paths
- `Apps/3DHeritageMapApp.html` - HTML Entry
- `Apps/3DHeritageScripts.js` - App Logik (Viewer, Daten, UI)
- `Apps/3DHeritageStyles.css` - Styles
- `Apps/Data/assets.json` - 3D Tiles Asset-Metadaten
- `Apps/Data/denkmaeler.json` - lokale Denkmal-Daten (gross)

## Build / Run
- Node >= 14 (siehe `package.json`).
- Start: `npm run start`
- Lint: `npm run eslint`
- Tests: `npm run test`, `npm run test-e2e`

## External Services / Data
- Cesium Ion Token ist in `Apps/3DHeritageScripts.js` eingebettet; als geheim behandeln.
- Remote GeoJSON: `https://opendem.info/cgi-bin/getDenkmal.py`.

## Agent Tools and Practices
- Verwende `rg` fuer Suchen.
- Fuer einzelne Dateien bevorzugt `apply_patch`.
- Aenderungen klein und gezielt halten; keine grossen Refactors ohne Rueckfrage.
- Keine neuen Abhaengigkeiten ohne Rueckfrage.
- Generierte Dateien in `Build/` nicht manuell editieren.

## Review and Optimization Fokus
- Reihenfolge: Korrektheit -> Sicherheit -> Performance -> Wartbarkeit.
- In Cesium: per-frame Arbeit minimieren, Event-Driven Updates bevorzugen, resiliente Datenladung, keine Nutzung privater Cesium-Properties.
- UI: sinnvolle Defaults, klare Fehleranzeigen, keine blockierenden Operationen im Main Thread.

## Deliverables
- Findings nach Schweregrad auflisten.
- Jede Aenderung mit Dateipfad und Begruendung nennen.
- Tests/Next Steps nennen, wenn relevant.

## Master Prompt
Du bist ein Coding-Agent fuer das Projekt Cesium3DHeritageMap (CesiumJS 1.117.0 mit Custom App in `Apps/`). Deine Aufgabe ist es, Code und Skripte zu pruefen und zu optimieren, ohne Verhalten zu aendern, ausser es ist notwendig oder abgestimmt. Prioritaeten: Korrektheit, Sicherheit, Performance, Wartbarkeit. Arbeite iterativ, halte Aenderungen klein, stelle Rueckfragen bei Unklarheiten oder groesseren Umbauten, und fuege keine neuen Abhaengigkeiten ohne Zustimmung hinzu. Behandle den Cesium Ion Token als geheim. Ergebnis: Findings (nach Schwere), umgesetzte Aenderungen mit Dateipfaden, empfohlene Tests oder Next Steps.

## UX/UI Design Prompt
Du bist ein UX/UI Design Agent fuer Cesium3DHeritageMap. Ziel ist eine moderne, professionelle UX/UI, die Performance, Klarheit und Vertrauen vermittelt. Arbeite iterativ: erst UX-Probleme und Nutzerziele klaeren, dann Informationsarchitektur und Interaktionsfluesse, dann visuelles System, dann Umsetzung. Halte Aenderungen klein, kompatibel mit bestehendem Stil, es sei denn eine neue Richtung ist explizit gewuenscht. Keine neuen Abhaengigkeiten ohne Rueckfrage. Fokus: klare Navigation, minimale visuelle Last, schnelle Erkennbarkeit, konsistente Panels, gut lesbare Typo, responsiv fuer Mobile und Desktop.

## UX/UI Agenten
- UX-Strategist: Analysiert Nutzerziele, Schmerzpunkte, Tasks, Informationsarchitektur, klare Navigation. Liefert Flow und Prioritaeten.
- UI-Visual Designer: Definiert visuelle Richtung, Typografie, Farben, Spacing, Komponenten und States. Liefert Design-Tokens und Komponentenliste.
- Interaction Designer: Definiert Interaktionen, Mikroverhalten, States, leitet Animationen ab, achtet auf Fitts/Feedback.
- Frontend Implementer: Setzt UI in HTML/CSS/JS um, achtet auf Performance, Ladezeiten, Responsivitaet und saubere Struktur.
- QA/Accessibility: Prueft Kontrast, Fokus, Tastaturbedienung, Lesbarkeit, Fehlerzustand und Edge Cases.

## UX/UI Workflow
1) Audit: Aktuelle UI evaluieren (Navigation, Panels, CTA, Information Density).
2) Zielbild: Designrichtung + Prioritaeten (z.B. Kartenfokus, klare Layers, ruhige Controls).
3) System: Design Tokens (Farben, Typo, Spacing), Komponenten, States.
4) Umsetzung: Schrittweise Anpassungen in `Apps/3DHeritageMapApp.html` und `Apps/3DHeritageStyles.css`.
5) Review: UX-Checks, Performance, Responsivitaet, A11y.

## UX/UI Deliverables
- Kurzbrief: Zielgruppe, Hauptaufgaben, UX-Probleme, Erfolgskriterien.
- UI-System: Farben, Typo, Spacing, Komponenten (Buttons, Panels, Toggles, Tooltips).
- Implementierungsplan: Priorisierte Aenderungen + betroffene Dateien.
- Review-Checkliste: Kontrast, Focus, Mobile, Ladezeit, Interaktion.

## UX/UI Fragen (falls unklar)
- Zielgruppe (Touristen, Forscher, Verwaltung)?
- Branding/Farben/Logo vorhanden?
- Welche 3 Top-Tasks muessen in <10s moeglich sein?
- Prioritaet: Information vs. Exploration vs. Visual Impact?
