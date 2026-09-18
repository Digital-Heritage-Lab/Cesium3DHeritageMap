import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertOverpass } from './import-overpass.mjs';
import { fetchGreenData } from './fetch-green-data.mjs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('Overpass import preserves verifiable origin and excludes unsupported or misplaced records', () => {
  const data = convertOverpass({ osm3s: { timestamp_osm_base: '2026-09-18T10:00:00Z' }, elements: [
    { type: 'way', id: 123, center: { lon: 6.98, lat: 50.95 }, tags: { leisure: 'park', name: 'Rheinpark', wikidata: 'Q123' } },
    { type: 'node', id: 124, lon: 6.94, lat: 50.93, tags: { leisure: 'playground' } },
    { type: 'node', id: 125, lon: 6.94, lat: 50.93, tags: { natural: 'tree', name: 'Alte Linde', species: 'Tilia cordata' } },
    { type: 'node', id: 126, lon: 9, lat: 52, tags: { leisure: 'park', name: 'Outside' } },
    { type: 'node', id: 127, lon: 6.94, lat: 50.93, tags: { natural: 'tree' } },
  ] });
  assert.equal(data.features.length, 3);
  assert.equal(data.features[0].properties.species, 'Tilia cordata');
  const park = data.features.find(feature => feature.id === 'osm-way-123');
  assert.deepEqual(park.geometry.coordinates, [6.98, 50.95]);
  assert.equal(park.properties.positionNote, 'Mittelpunkt des OSM-Umgrenzungsrechtecks; kein Eingang');
  assert.equal(park.properties.wikidataUrl, 'https://www.wikidata.org/wiki/Q123');
  assert.equal(park.properties.sourceUrl, 'https://www.openstreetmap.org/way/123');
  assert.equal(park.properties.isDemo, false);
  assert.equal(park.properties.dataAsOf, data.dataAsOf);
});

test('An invalid export cannot silently replace the demo data', () => {
  assert.throws(() => convertOverpass({ elements: [] }), /timestamp/);
  assert.throws(() => convertOverpass({ osm3s: { timestamp_osm_base: 'today' }, elements: [] }), /No supported/);
});

test('Named places are retained before unnamed places at the selection limit', () => {
  const elements = Array.from({ length: 251 }, (_, index) => ({
    type: 'node', id: index + 1, lon: 6.9, lat: 50.9,
    tags: { leisure: 'park', ...(index === 250 ? { name: 'Named Park' } : {}) },
  }));
  const data = convertOverpass({ osm3s: { timestamp_osm_base: '2026-09-18T10:00:00Z' }, elements });
  assert.equal(data.features.filter(f => f.properties.theme === 'parks').length, 250);
  assert.ok(data.features.some(f => f.properties.name === 'Named Park'));
});

test('The app switches to validated OSM data and search uses that collection', async () => {
  const dataset = convertOverpass({ osm3s: { timestamp_osm_base: '2026-09-18T10:00:00Z' }, elements: [
    { type: 'way', id: 123, center: { lon: 6.98, lat: 50.95 }, tags: { leisure: 'park', name: 'Rheinpark' } },
  ] });
  const context = vm.createContext({ window: {}, fetch: async () => ({ ok: true, json: async () => dataset }) });
  vm.runInContext(await readFile(new URL('../Apps/GreenAtlasData.js', import.meta.url), 'utf8'), context);
  assert.equal(context.window.GreenData.dataMode, 'demo');
  assert.equal(await context.window.GreenData.load(), true);
  assert.equal(context.window.GreenData.dataMode, 'osm');
  assert.equal(context.window.GreenData.search('Rheinpark').length, 1);
  assert.equal(context.window.GreenData.search('Aachener Weiher').length, 0);
});

test('The refresh command requests Overpass once and validates the response before writing', async () => {
  let calls = 0;
  const result = await fetchGreenData(async (url, options) => {
    calls++;
    assert.equal(url, 'https://overpass-api.de/api/interpreter');
    assert.equal(options.method, 'POST');
    assert.match(String(options.body), /data=/);
    return { ok: true, headers: { get: () => '200' }, text: async () => JSON.stringify({
      osm3s: { timestamp_osm_base: '2026-09-18T10:00:00Z' },
      elements: [{ type: 'way', id: 123, center: { lon: 6.98, lat: 50.95 }, tags: { leisure: 'park', name: 'Rheinpark' } }],
    }) };
  });
  assert.equal(calls, 1);
  assert.equal(result.features.length, 1);
  await assert.rejects(fetchGreenData(async () => ({ ok: false, status: 429 })), /HTTP 429/);
});

test('Published OSM snapshot has unique, attributed Cologne positions', async () => {
  const data = JSON.parse(await readFile(new URL('../Apps/Data/green-atlas.geojson', import.meta.url), 'utf8'));
  assert.equal(data.type, 'FeatureCollection');
  assert.ok(data.features.length > 100);
  assert.match(data.dataAsOf, /^\d{4}-\d\d-\d\dT/);
  const ids = new Set();
  for (const feature of data.features) {
    assert.ok(!ids.has(feature.id));
    ids.add(feature.id);
    assert.match(feature.id, /^osm-(node|way|relation)-\d+$/);
    assert.equal(feature.properties.isDemo, false);
    assert.equal(feature.properties.license, 'ODbL 1.0');
    assert.equal(feature.properties.dataAsOf, data.dataAsOf);
    assert.ok(feature.properties.sourceUrl.endsWith(feature.id.replace(/^osm-/, '').replace('-', '/')));
    assert.ok(feature.geometry.coordinates.every(Number.isFinite));
    const [lon, lat] = feature.geometry.coordinates;
    assert.ok(lon >= 6.7 && lon <= 7.2 && lat >= 50.8 && lat <= 51.1);
  }
});
