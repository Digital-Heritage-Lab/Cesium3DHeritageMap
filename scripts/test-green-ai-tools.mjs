import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { sanitizeMessages } from './chat-guard.mjs';
import { questions } from './green-ai-questions.mjs';

const appFile = (name) => new URL(`../Apps/${name}`, import.meta.url);
const readJson = async (name) => JSON.parse(await readFile(appFile(name), 'utf8'));
const cadastre = await readJson('Data/baumkataster.json');
const snapshot = await readJson('Data/sags-uns-snapshot.json');

const context = vm.createContext({
  window: {}, console, AbortController, setTimeout, clearTimeout,
  fetch: async (url) => {
    const name = url === '/api/sags-uns' ? 'Data/sags-uns-snapshot.json' : url;
    return { ok: true, status: 200, json: async () => readJson(name) };
  },
});
for (const file of ['GreenAtlasData.js', 'GreenTrees.js', 'GreenReports.js', 'GreenAITools.js', 'AIChatBot.js']) {
  vm.runInContext(await readFile(appFile(file), 'utf8'), context);
}
const { GreenData, GreenTrees, GreenReports, GreenAITools } = context.window;
await GreenData.load();
await GreenTrees.load();

const CENTER = [6.93, 50.92, 6.99, 50.96];
const WHOLE_CITY = [6.7, 50.8, 7.25, 51.15];
const inBox = (box, lon, lat) => lon >= box[0] && lon <= box[2] && lat >= box[1] && lat <= box[3];
const de = (n) => n.toLocaleString('de-DE');

// Fake atlas/map facade with the same surface GreenAITools uses on the real GreenAtlas.
function useAtlas({ bounds = CENTER, height = 1500, location = null, selectedId = null } = {}) {
  const calls = [];
  const visible = new Set(['parks', 'trees', 'water']);
  const map = {
    visible, calls, selectedId, treeFilter: null, reportVisible: false,
    reportFilters: { category: 'all', status: 'all', text: '' },
    viewBounds: () => bounds,
    cameraHeight: () => height,
    context: (themeId) => GreenData.collection.features.filter((f) =>
      (!themeId || f.properties.theme === themeId) && visible.has(f.properties.theme) &&
      inBox(bounds, ...f.geometry.coordinates)),
    reportsInView: () => (map.reportVisible ? GreenReports.filter(map.reportFilters.category, map.reportFilters.status, map.reportFilters.text)
      .filter((r) => inBox(bounds, r.coordinates.lng, r.coordinates.lat)) : []),
    setTreeFilter(filter) { map.treeFilter = filter; calls.push(['setTreeFilter', filter?.label ?? null]); },
    setFilter: (id, filters) => calls.push(['setFilter', id, filters]),
    setReportVisibility(show) { map.reportVisible = show; },
    setReportFilters(filters) { map.reportFilters = filters; },
    zoomTheme: () => true, focus: (id) => calls.push(['focus', id]), focusReport: () => {},
    flyToView: (h) => calls.push(['flyToView', h]),
  };
  context.window.GreenAtlas = {
    getMap: () => map, getActiveTheme: () => undefined,
    getUserLocation: () => location, getSelectedId: () => selectedId,
    setThemeVisible: (id, show) => { if (show) visible.add(id); else visible.delete(id); },
    activateAppView: (view) => calls.push(['activateAppView', view]),
    setReports: async (options) => {
      map.setReportVisibility(options.visible);
      map.setReportFilters({ category: options.category ?? map.reportFilters.category,
        status: options.status ?? map.reportFilters.status, text: options.text ?? map.reportFilters.text });
      await GreenReports.load();
      return true;
    },
    loadReports: () => GreenReports.load(),
    showObject: (id) => calls.push(['showObject', id]),
  };
  return map;
}
await GreenReports.load();

const cadastreRowsIn = (box) => cadastre.trees.filter((row) => inBox(box, row[1], row[2]));
const osmTreesIn = (box) => GreenData.collection.features.filter((f) => f.properties.theme === 'trees' && inBox(box, ...f.geometry.coordinates));

// Independent copy of the agreed whitelist, used to audit what the predicate lets through.
const ALLOWED_BOTANICAL = new Set(['Malus domestica', 'Pyrus communis', 'Prunus avium', 'Prunus domestica', 'Prunus domestica italica',
  'Prunus domestica syriaca', 'Prunus armeniaca', 'Prunus dulcis', 'Prunus dulcis dulcis Dürkheimer Krachmandel', 'Juglans regia',
  'Castanea sativa', 'Corylus avellana']);
const ALLOWED_PAIRS = new Set(['Apfel|Malus', 'Birne|Pyrus', 'Kirsche|Prunus', 'Hasel|Corylus', 'Marone, Eßkastanie|Castanea']);
const auditEdible = (row) => ALLOWED_BOTANICAL.has(row[4]) || ALLOWED_PAIRS.has(`${row[3]}|${row[4]}`);

test('1. "Zeige mir die Brunnen." blendet das Thema water ein', async () => {
  const map = useAtlas();
  map.visible.delete('water');
  const result = await GreenAITools.handleLocal('Zeige mir die Brunnen.');
  assert.equal(result.action.type, 'show_theme');
  assert.equal(result.action.theme, 'water');
  assert.ok(map.visible.has('water'));
  assert.match(result.message, /Brunnen & Trinkwasser ist eingeblendet/);
});

test('2. "Zeige Spielplätze." blendet das Thema play ein', async () => {
  const map = useAtlas();
  const result = await GreenAITools.handleLocal('Zeige Spielplätze.');
  assert.equal(result.action.theme, 'play');
  assert.ok(map.visible.has('play'));
});

test('3. Baumarten im Ausschnitt stammen aus den sichtbaren Daten', async () => {
  useAtlas();
  const counts = new Map();
  for (const row of cadastreRowsIn(CENTER)) counts.set(row[3] || row[4], (counts.get(row[3] || row[4]) || 0) + 1);
  for (const f of osmTreesIn(CENTER)) counts.set(f.properties.species || 'ohne Artangabe', (counts.get(f.properties.species || 'ohne Artangabe') || 0) + 1);
  const [top, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const result = await GreenAITools.handleLocal('Welche Baumarten sehe ich gerade?');
  assert.equal(result.action.group_by, 'species');
  assert.ok(result.message.includes(`• ${top}: ${de(topCount)}`), result.message);
});

test('4. "Wie viele Bäume sehe ich?" ist lokal berechnet', async () => {
  useAtlas();
  const expected = cadastreRowsIn(CENTER).length + osmTreesIn(CENTER).length;
  const result = await GreenAITools.handleLocal('Wie viele Bäume sehe ich?');
  assert.equal(result.action.type, 'count_features');
  assert.ok(result.message.split('\n')[0].endsWith(`: ${de(expected)}.`), result.message);
  assert.ok(!result.message.includes('Ob Früchte vor Ort'), 'Essbar-Hinweis nur bei essbaren Bäumen');
});

test('5. "Zeige essbare Bäume." nutzt nur die kontrollierte Whitelist', async () => {
  const map = useAtlas();
  const result = await GreenAITools.handleLocal('Zeige essbare Bäume.');
  assert.equal(result.action.type, 'filter_features');
  const { row } = map.treeFilter;
  let matches = 0;
  for (const tree of cadastre.trees) {
    if (row(tree)) {
      matches += 1;
      assert.ok(auditEdible(tree), `${tree[3]} | ${tree[4]} darf nicht essbar sein`);
    } else {
      assert.ok(!auditEdible(tree), `${tree[3]} | ${tree[4]} fehlt in der Whitelist`);
    }
  }
  assert.ok(matches > 1000);
  for (const [german, botanical] of [['Roßkastanie'], ['Kastanie'], ['Zierapfel'], ['Zier-Birne'], ['Japanische Nelken-Kirsche'],
    ['Blut-Pflaume'], ['Baumhasel'], ['Eberesche, Mehlbeere, Vogelbeerbaum'], ['Felsenbirne']]) {
    const sample = cadastre.trees.find((t) => t[3] === german);
    if (sample) assert.equal(row(sample), false, `${german} ${botanical ?? ''}`);
  }
  assert.match(result.message, /Ob Früchte vor Ort zur Ernte freigegeben/);
});

test('5b. Bei großer Kamerahöhe zoomt "Zeige essbare Bäume" näher heran', async () => {
  const map = useAtlas({ height: 6000 });
  await GreenAITools.handleLocal('Zeige essbare Bäume');
  assert.deepEqual(map.calls.find((call) => call[0] === 'flyToView'), ['flyToView', 1800]);
});

test('6. Essbare Baumarten im Ausschnitt kommen aus den sichtbaren Bäumen', async () => {
  useAtlas();
  const result = await GreenAITools.handleLocal('Welche essbaren Baumarten sehe ich?');
  const groups = new Map();
  for (const row of cadastreRowsIn(CENTER)) {
    if (!auditEdible(row)) continue;
    const label = row[4] === 'Corylus avellana' || row[3] === 'Hasel' ? 'Hasel' : row[4].startsWith('Prunus avium') || row[3] === 'Kirsche' ? 'Kirsche'
      : row[4].startsWith('Malus') ? 'Apfel' : row[4].startsWith('Pyrus') ? 'Birne' : row[4].startsWith('Juglans') ? 'Walnuss'
        : row[4].startsWith('Castanea') ? 'Esskastanie' : row[4].startsWith('Prunus domestica') ? 'Pflaume' : row[4].startsWith('Prunus armeniaca') ? 'Aprikose' : 'Mandel';
    groups.set(label, (groups.get(label) || 0) + 1);
  }
  assert.ok(groups.size > 0);
  for (const [label, count] of groups) assert.ok(result.message.includes(`• ${label}: ${de(count)}`), `${label} ${count}\n${result.message}`);
  assert.match(result.message, /Ob Früchte vor Ort/);
});

test('7. "Zeige Apfelbäume." filtert auf die Art Apfel', async () => {
  const map = useAtlas();
  const result = await GreenAITools.handleLocal('Zeige Apfelbäume.');
  assert.equal(result.action.species, 'Apfel');
  const { row, label } = map.treeFilter;
  assert.equal(label, 'Apfel-Bäume');
  assert.equal(row([0, 0, 0, 'Apfel', 'Malus']), true);
  assert.equal(row([0, 0, 0, '', 'Malus domestica']), true);
  assert.equal(row([0, 0, 0, 'Birne', 'Pyrus']), false);
  assert.equal(row([0, 0, 0, 'Zierapfel', 'Malus tschonoskii']), false);
  assert.equal(row([0, 0, 0, 'Apfel Street Parade', 'Malus baccata Street Parade']), false);
});

test('8. "Zeige Grünmeldungen." blendet die Meldungsebene ein', async () => {
  const map = useAtlas({ bounds: WHOLE_CITY });
  const result = await GreenAITools.handleLocal('Zeige Grünmeldungen.');
  assert.equal(result.action.type, 'show_reports');
  assert.equal(map.reportVisible, true);
  assert.match(result.message, /Meldungen/);
  assert.match(result.message, /Sag's uns Köln/);
});

test('9. Offene Grünmeldungen werden lokal gezählt', async () => {
  useAtlas({ bounds: WHOLE_CITY });
  const expected = snapshot.reports.filter((r) => r.status === 'open' && inBox(WHOLE_CITY, r.coordinates.lng, r.coordinates.lat)).length;
  const result = await GreenAITools.handleLocal('Wie viele offene Grünmeldungen sehe ich?');
  assert.equal(result.action.status, 'open');
  assert.ok(result.message.includes(`im aktuellen Kartenausschnitt: ${de(expected)} (`), result.message);
});

test('10. Nearby: ohne Standort Hinweis auf den Button, mit Standort sortierte Luftlinie', async () => {
  useAtlas();
  const without = await GreenAITools.handleLocal('Welche Spielplätze sind in meiner Nähe?');
  assert.match(without.message, /Standort Button/);

  const playground = GreenData.collection.features.find((f) => f.properties.theme === 'play').geometry.coordinates;
  const here = { lon: playground[0] + 0.001, lat: playground[1] };
  useAtlas({ location: here });
  const withLocation = await GreenAITools.handleLocal('Welche Spielplätze sind in meiner Nähe?');
  assert.equal(withLocation.action.type, 'find_nearby');
  const meters = [...withLocation.message.matchAll(/· (\d+(?:,\d)?) (m|km) ·/g)]
    .map(([, value, unit]) => parseFloat(value.replace(',', '.')) * (unit === 'km' ? 1000 : 1));
  assert.ok(meters.length > 0 && meters.every((d) => d <= 1000), withLocation.message);
  assert.deepEqual([...meters].sort((a, b) => a - b), meters);
  assert.match(withLocation.message, /Luftlinie, keine Route/);
});

test('10b. Radius wird auf 50 bis 10000 Meter begrenzt', () => {
  useAtlas();
  const small = GreenAITools.validate({ type: 'find_nearby', theme: 'parks', radius_m: 5 });
  const big = GreenAITools.validate({ type: 'find_nearby', theme: 'parks', radius_m: 999999 });
  assert.equal(small.action.radius_m, GreenAITools.MIN_RADIUS);
  assert.equal(big.action.radius_m, GreenAITools.MAX_RADIUS);
  assert.equal(GreenAITools.localIntent('Zeige Parks im Umkreis von 1 km').action.radius_m, 1000);
  assert.equal(GreenAITools.localIntent('Brunnen 500 Meter von diesem Punkt entfernt').action.origin, 'selected');
});

test('10c. Coolrouten öffnet nur die kontrollierte Routingoberfläche', async () => {
  const map = useAtlas();
  const result = await GreenAITools.handleLocal('Zeige mir eine kühle Route');
  assert.equal(result.ok, true);
  assert.equal(result.action.type, 'open_coolroutes');
  assert.deepEqual(map.calls.at(-1), ['activateAppView', 'labs']);
  assert.match(result.message, /Coolrouten Köln/);
});

test('11. Weltweite Fragen erzeugen keine Vollständigkeitsbehauptung', async () => {
  useAtlas();
  const result = await GreenAITools.handleLocal('Wie viele Brunnen gibt es auf der ganzen Welt?');
  assert.match(result.message, /begrenzten Kölner Datensatz/);
  assert.match(result.message, /kein vollständiger Bestand/);
  assert.ok(!/gibt es (auf|weltweit)/.test(result.message));
});

test('12. Ungültige oder unbekannte Modell-Actions werden verworfen', async () => {
  const map = useAtlas();
  const before = JSON.stringify(map.calls);
  for (const raw of [
    { type: 'delete_database' }, { type: 'eval', code: 'alert(1)' }, { type: 'show_theme', theme: '../../evil' },
    { type: 'show_theme' }, { type: 'filter_features', theme: 'trees', filters: { __proto__: 'x', constructor: 'y' } },
    { type: 'filter_features', theme: 'water', edible: true }, { type: 'show_object', id: 'nicht-vorhanden' },
    { type: 'count_features', theme: 'water', scope: 'weltweit' }, 'show_theme', null, [], 42,
  ]) {
    const result = await GreenAITools.run(raw);
    assert.equal(result.ok, false, JSON.stringify(raw));
    assert.ok(result.message);
  }
  assert.equal(JSON.stringify(map.calls), before, 'verworfene Actions dürfen die Karte nicht verändern');
  const route = await GreenAITools.run({ type: 'calculate_route', from: 'a', to: 'b' });
  assert.equal(route.ok, false);
  assert.match(route.message, /noch nicht verfügbar/);
});

test('Nur bekannte Felder überleben die Validierung', () => {
  useAtlas();
  const checked = GreenAITools.validate({ type: 'show_theme', theme: 'water', code: 'alert(1)', selector: '#x' });
  assert.deepEqual(JSON.parse(JSON.stringify(checked.action)), { type: 'show_theme', theme: 'water' });
  assert.equal(GreenAITools.ALLOWED_ACTIONS.length, 16);
});

test('Der <action>-Block wird aus dem sichtbaren Text entfernt', () => {
  const extract = vm.runInContext('HeritageAIChat', context).prototype.extractAction;
  const parsed = extract.call({}, 'Ich zeige dir die Brunnen.\n\n<action>{"type":"show_theme","theme":"water"}</action>');
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.action)), { type: 'show_theme', theme: 'water' });
  assert.equal(parsed.displayText, 'Ich zeige dir die Brunnen.');
});

test('Systemprompt und Kontext: kompakt, ohne Standortkoordinaten, ohne alte Einschränkung', async () => {
  useAtlas({ location: { lon: 6.9583, lat: 50.9413 } });
  const prompt = GreenAITools.buildSystemPrompt();
  for (const theme of GreenData.themes) assert.ok(prompt.includes(`${theme.id}=`));
  for (const action of GreenAITools.ALLOWED_ACTIONS) assert.ok(prompt.includes(action), action);
  assert.ok(!prompt.includes('keine Kartenaktionen'));
  assert.ok(!prompt.includes('6.9583') && !prompt.includes('50.9413'));
  assert.equal(GreenAITools.buildContext().userLocationAvailable, true);
  assert.ok(GreenAITools.buildContext().features.length <= 25);
  assert.ok(sanitizeMessages([{ role: 'system', content: prompt }, { role: 'user', content: 'Hallo' }]), `Prompt zu lang: ${prompt.length}`);
});

test('Lokale Erkennung: eindeutige Befehle brauchen kein LLM, Unklares geht weiter', () => {
  useAtlas();
  for (const text of ['Zeige Brunnen', 'Zeige Spielplätze', 'Was sehe ich auf der Karte?', 'Zeige Friedhöfe', 'Zeige Botanischer Garten']) {
    assert.ok(GreenAITools.localIntent(text), text);
  }
  assert.equal(GreenAITools.localIntent('Zeige Botanischer Garten').action.theme, 'botanical');
  assert.equal(GreenAITools.localIntent('Zeige Kastanien'), null, 'Kastanie allein ist nicht eindeutig essbar');
  assert.equal(GreenAITools.localIntent('Wo kann ich picknicken?'), null);
  assert.equal(GreenAITools.localIntent('Zeige Zierkirschen'), null);
});

test('Performance: Essbar-Auswertung und Ausschnitt-Zählung bleiben schnell', async () => {
  useAtlas({ bounds: WHOLE_CITY });
  let start = performance.now();
  await GreenAITools.run({ type: 'count_features', theme: 'trees', scope: 'all_loaded', edible: true });
  const cold = performance.now() - start;
  start = performance.now();
  await GreenAITools.run({ type: 'count_features', theme: 'trees', scope: 'viewport', edible: true });
  const viewport = performance.now() - start;
  console.log(`edible all_loaded ${cold.toFixed(0)} ms, viewport(city) ${viewport.toFixed(0)} ms`);
  assert.ok(cold < 1500 && viewport < 1500);
});

test('Fragenkatalog: 50 bis 100 lokale Formulierungen wählen passende Actions', () => {
  useAtlas();
  assert.ok(questions.length >= 50 && questions.length <= 100, questions.length);
  for (const item of questions) {
    const intent = GreenAITools.localIntent(item.text);
    assert.ok(intent, item.text);
    const actions = intent.actions || [intent.action];
    assert.ok(actions.every(Boolean), item.text);
    if (item.types) assert.deepEqual(JSON.parse(JSON.stringify(actions.map((a) => a.type))), item.types, item.text);
    if (item.type) assert.equal(actions[0].type, item.type, item.text);
    if (item.theme) assert.equal(actions[0].theme, item.theme, item.text);
    if (item.metric) assert.equal(actions[0].metric, item.metric, item.text);
    if (item.origin) assert.equal(actions[0].origin, item.origin, item.text);
    if (item.district) assert.ok(actions[0].district, item.text);
  }
});

test('Stadtteil, Baumrang und benannter Ausgangsort liefern Datenantworten', async () => {
  useAtlas();
  const playgrounds = await GreenAITools.handleLocal('Spielplätze in Ehrenfeld');
  assert.equal(playgrounds.action.type, 'list_features');
  assert.match(playgrounds.message, /Stadtteil: Ehrenfeld/);
  const oldest = await GreenAITools.handleLocal('Die ältesten Bäume hier');
  assert.match(oldest.message, /erfasstem Pflanzjahr/);
  assert.match(oldest.message, /Datensätze mit Wert ausgewertet/);
  const ranking = await GreenAITools.handleLocal('Welcher Stadtteil hat die meisten Bäume?');
  assert.equal(ranking.action.type, 'rank_districts');
  assert.match(ranking.message, /Baumkataster Stadt Köln/);
  const near = await GreenAITools.handleLocal('Brunnen in der Nähe vom Melatenfriedhof');
  assert.equal(near.action.origin, 'object');
  assert.equal(near.action.theme, 'water');
  assert.match(near.message, /Melaten/);
});

test('Folgefragen und mehrere Actions nutzen nur erfolgreich validierten Zustand', async () => {
  const map = useAtlas();
  const state = {};
  const first = await GreenAITools.handleLocal('Zeige essbare Bäume', state);
  assert.equal(first.ok, true);
  const follow = await GreenAITools.handleLocal('und davon nur Kirschen', state);
  assert.equal(follow.action.species, 'Kirsche');
  assert.equal(state.lastAction.species, 'Kirsche');
  const combined = await GreenAITools.handleLocal('Zeige Bäume und Meldungen', state);
  assert.deepEqual(JSON.parse(JSON.stringify(combined.actions.map((a) => a.type))), ['show_theme', 'show_reports']);
  const before = map.calls.length;
  const rejected = await GreenAITools.runActions([{ type: 'show_theme', theme: 'water' }, { type: 'eval' }]);
  assert.equal(rejected.ok, false);
  assert.equal(map.calls.length, before, 'prevalidation must prevent partial changes');
  assert.equal((await GreenAITools.runActions(Array(4).fill({ type: 'get_map_context' }))).ok, false);
});

test('Mehrdeutige und fehlende Ortsnamen ändern die Karte nicht', async () => {
  const map = useAtlas();
  const before = JSON.stringify(map.calls);
  const ambiguous = await GreenAITools.handleLocal('Brunnen in der Nähe vom Park');
  assert.match(ambiguous.message, /Mehrere Orte passen/);
  const missing = await GreenAITools.handleLocal('Brunnen in der Nähe vom Fantasieort');
  assert.match(missing.message, /nicht eindeutig gefunden/);
  assert.equal(JSON.stringify(map.calls), before);
});

test('Modellblöcke werden vollständig gelesen und Fehler stoppen Action-Folgen', async () => {
  const map = useAtlas();
  const blocks = GreenAITools.parseActionBlocks('Text <action>{"type":"show_theme","theme":"trees"}</action> <action>{"type":"show_reports","visible":true}</action>');
  assert.equal(blocks.length, 2);
  assert.equal(GreenAITools.parseActionBlocks('<action>{bad}</action>'), null);
  const state = {};
  const partial = await GreenAITools.runActions([
    { type: 'show_theme', theme: 'trees' },
    { type: 'filter_features', theme: 'play', filters: { ageGroup: 'unbekannter Wert' } },
    { type: 'show_theme', theme: 'water' },
  ]);
  assert.equal(partial.ok, false);
  assert.equal(partial.actions.length, 1);
  assert.match(partial.message, /Nach 1 Aktion/);
  assert.equal(map.calls.some((call) => call[0] === 'setFilter' && call[1] === 'water'), false);
  GreenAITools.remember(state, partial);
  assert.equal(state.lastAction.theme, 'trees');
});
