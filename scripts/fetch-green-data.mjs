import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { convertOverpass } from './import-overpass.mjs';
import { loadDistricts } from './cologne-districts.mjs';

const endpoint = 'https://overpass-api.de/api/interpreter';
const queryFile = new URL('./cologne-green.overpassql', import.meta.url);
const outputFile = new URL('../Apps/Data/green-atlas.geojson', import.meta.url);

export async function fetchGreenData(request = fetch) {
  const query = await readFile(queryFile, 'utf8');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'GruenAtlasKoeln-data-refresh/1.0 (github.com/ErtanOz/GruenAtlas-Koeln)',
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}; no dataset was changed.`);
    const size = Number(response.headers?.get('content-length') || 0);
    if (size > 15_000_000) throw new Error('Overpass response exceeds the 15 MB import limit.');
    const body = await response.text();
    if (body.length > 15_000_000) throw new Error('Overpass response exceeds the 15 MB import limit.');
    return convertOverpass(JSON.parse(body), await loadDistricts());
  } finally {
    clearTimeout(timeout);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const collection = await fetchGreenData();
  const temporary = new URL('../Apps/Data/green-atlas.geojson.tmp', import.meta.url);
  try {
    await writeFile(temporary, JSON.stringify(collection));
    await rename(temporary, outputFile);
  } finally {
    await rm(temporary, { force: true });
  }
  process.stdout.write(`Imported ${collection.features.length} OSM places; data timestamp ${collection.dataAsOf}.\n`);
}
