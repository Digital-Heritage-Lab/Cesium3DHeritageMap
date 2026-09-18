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
  assert.ok(!html.includes('3DHeritageStyles.css'));
  assert.ok(!html.includes('AIChatStyles.css'));
  assert.ok(!html.includes('user-scalable=no'));
  for (const script of ['GreenAtlasData.js', 'GreenAtlasMap.js', 'GreenAtlas.js', 'GreenAI.js']) {
    assert.ok(html.includes(script));
    assert.ok((await readFile(new URL('../Apps/' + script, import.meta.url), 'utf8')).length > 100);
  }
});
