import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { compactTree, utm32ToWgs84 } from './update-tree-cadastre.mjs';

const snapshot = JSON.parse(await readFile(new URL('../Apps/Data/baumkataster.json', import.meta.url), 'utf8'));

test('City WFS UTM coordinates become plausible Cologne positions and retain attributes', () => {
  const position = utm32ToWgs84(357754.6155, 5637036.1795);
  assert.ok(Math.abs(position[0] - 6.978502) < 0.00001);
  assert.ok(Math.abs(position[1] - 50.867489) < 0.00001);
  const row = compactTree({ geometry: { type: 'Point', coordinates: [357754.6155, 5637036.1795] },
    properties: { Baumnummer: '66-207-S-0021', Deutscher_Name: 'Silber-Ahorn',
      Pflanzjahr: '', 'Stammdurchmesser_-_cm': '10', Straße: 'Im Ahorngrund', Stadtteil: 'Hahnwald' } });
  assert.equal(row[0], '66-207-S-0021@35775462-563703618');
  assert.equal(row[3], 'Silber-Ahorn');
  assert.equal(row[7], null);
  assert.equal(row[8], 10);
  assert.equal(compactTree({ geometry: { type: 'Point', coordinates: [0, 0] } }), null);
});

test('Published tree snapshot is complete, unique, and source-backed', () => {
  assert.equal(snapshot.sourceUrl, 'https://open.nrw/dataset/e02ad618-ab42-48b5-8551-849aa936bb99');
  assert.equal(snapshot.count, snapshot.sourceCount);
  assert.ok(snapshot.count > 100000);
  assert.equal(snapshot.trees.length, snapshot.count);
  assert.equal(new Set(snapshot.trees.map((row) => row[0])).size, snapshot.count);
  assert.ok(snapshot.trees.every((row) => row[1] > 6.7 && row[1] < 7.2 && row[2] > 50.8 && row[2] < 51.11));
});

test('Browser tree catalog finds a tree by its city number and limits viewport results', async () => {
  const context = vm.createContext({ window: {}, fetch: async () => ({ ok: true, json: async () => snapshot }) });
  vm.runInContext(await readFile(new URL('../Apps/GreenTrees.js', import.meta.url), 'utf8'), context);
  const trees = context.window.GreenTrees;
  assert.equal(await trees.load(), true);
  assert.equal(trees.count, snapshot.count);
  const first = snapshot.trees[0];
  const found = trees.search(first[0].split('@')[0], 1)[0];
  assert.equal(found.properties.sourceKind, 'cadastre');
  assert.equal(found.properties.treeNumber, first[0].split('@')[0]);
  const box = [first[1] - 0.001, first[2] - 0.001, first[1] + 0.001, first[2] + 0.001];
  assert.ok(trees.inBounds(box, 10).some((item) => item.id === `citytree-${first[0]}`));
  assert.ok(trees.inBounds([6.8, 50.8, 7.2, 51.11], 30).length <= 30);
});
