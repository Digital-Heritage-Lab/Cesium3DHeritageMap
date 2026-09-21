import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../Apps/GreenAtlasData.js', import.meta.url), 'utf8'), context);
const data = context.window.GreenData;

test('Every demo feature has a unique ID, valid position and declared category', () => {
  const ids = new Set();
  for (const feature of data.collection.features) {
    assert.ok(!ids.has(feature.id));
    ids.add(feature.id);
    assert.ok(data.theme(feature.properties.theme));
    assert.equal(feature.properties.isDemo, true);
    assert.ok(feature.properties.source);
    assert.ok(feature.geometry.coordinates.every(Number.isFinite));
    const [lon, lat] = feature.geometry.coordinates;
    assert.ok(lon >= 6.7 && lon <= 7.2 && lat >= 50.8 && lat <= 51.1);
  }
});

test('All nine themes have records and filter values', () => {
  assert.equal(data.themes.length, 9);
  for (const theme of data.themes) {
    const features = data.search('', theme.id);
    assert.ok(features.length);
    for (const key of Object.keys(theme.filters)) {
      assert.ok(features.every(feature => typeof feature.properties[key] === 'string'));
    }
  }
});

test('Search supports accents, mixed case and multiple words', () => {
  assert.equal(data.search('  MELATEN  ')[0].id, 'cemetery-1');
  assert.equal(data.search('aachener weiher')[0].id, 'park-1');
  assert.equal(data.search('baume', 'trees').length, 5);
  assert.equal(data.search('baume').length, data.search('Bäume').length);
  assert.ok(data.search('Linde').some(feature => feature.id === 'tree-5'));
  assert.equal(data.search('Winter-Linde')[0].id, 'tree-1');
});

test('Search category scope excludes unrelated objects', () => {
  assert.equal(data.search('Winter-Linde', 'trees').length, 1);
  assert.equal(data.search('Melaten', 'trees').length, 0);
  assert.equal(data.search('<script>alert(1)</script>').length, 0);
});

test('Combined filters narrow results; clearing values restores them', () => {
  assert.equal(data.filtered('trees', { species: 'Linde' }).length, 2);
  assert.equal(data.filtered('trees', { species: 'Linde', district: 'Ehrenfeld' })[0].id, 'tree-1');
  assert.equal(data.filtered('trees', { species: 'Linde', condition: 'Beobachtung' }).length, 0);
  assert.equal(data.filtered('trees', { species: '', condition: '' }).length, 5);
});

test('The main page uses only the new product styles and retains the Cesium engine', async () => {
  const html = await readFile(new URL('../Apps/3DHeritageMapApp.html', import.meta.url), 'utf8');
  assert.ok(html.includes('GreenAtlas.css'));
  assert.ok(html.includes('../Build/Cesium/Cesium.js'));
  assert.ok(html.includes('https://www.stadt-koeln.de/images/x22/logo-stadt-koeln.svg'));
  assert.ok(html.includes('sidebarReportMeta'));
  assert.ok(html.includes('Amt für Landschaftspflege und Grünflächen'));
  assert.ok(!html.includes('3DHeritageStyles.css'));
  assert.ok(!html.includes('AIChatStyles.css'));
  assert.ok(!html.includes('user-scalable=no'));
  for (const script of ['GreenAtlasData.js', 'GreenAtlasMap.js', 'GreenAtlas.js', 'GreenAI.js']) {
    assert.ok(html.includes(script));
    assert.ok((await readFile(new URL('../Apps/' + script, import.meta.url), 'utf8')).length > 100);
  }
});

test('Brunnen 3D embeds the attributed Sketchfab model', async () => {
  const labs = await readFile(new URL('../Apps/GreenLabs.js', import.meta.url), 'utf8');
  assert.ok(labs.includes('https://sketchfab.com/models/e452ea5a9f2545079de0244b6e11f978/embed'));
  assert.ok(labs.includes('Digital Heritage Lab'));
  assert.ok(labs.includes('K%C3%B6ln-Brunnen-Im-Dau-9.JPG'));
  assert.ok(labs.includes('Willy Horsch (HOWI), CC BY 3.0'));
  for (const image of ['coolroutes.png', 'smart-watering.png', 'brunnen-im-dau.png', 'gruenflaechen-monitoring.png', 'cologne-urban-tree-atlas.png', 'urban-green-lidar-map.png']) {
    assert.ok(labs.includes(`Images/labs/${image}`));
  }
  assert.ok(labs.includes('allowfullscreen'));
});

test('Labs includes the external Cologne Urban Tree Atlas contribution', async () => {
  const labs = await readFile(new URL('../Apps/GreenLabs.js', import.meta.url), 'utf8');
  assert.ok(labs.includes('Cologne Urban Tree Atlas'));
  assert.ok(labs.includes('https://glistening-wisp-367b6e.netlify.app/'));
  assert.ok(labs.includes('rel="noopener noreferrer"'));
  assert.ok(labs.includes('Bewässerungsmonitor'));
});

test('Labs prioritizes the external CoolRoutes Cologne contribution', async () => {
  const labs = await readFile(new URL('../Apps/GreenLabs.js', import.meta.url), 'utf8');
  assert.ok(labs.includes('CoolRoutes Cologne'));
  assert.ok(labs.includes('https://courageous-pudding-391ff7.netlify.app/'));
  assert.ok(labs.includes('Temperatur-, Schatten-, Wind- und Wasserdaten'));
});

test('Labs includes the Urban Green LiDAR Map draft contribution', async () => {
  const labs = await readFile(new URL('../Apps/GreenLabs.js', import.meta.url), 'utf8');
  assert.ok(labs.includes('Urban Green LiDAR Map'));
  assert.ok(labs.includes('https://thunderous-cactus-858ad9.netlify.app/'));
  assert.ok(labs.includes('3D-LiDAR-Punktwolken'));
  assert.ok(labs.includes('badge: "Entwurf"'));
});
