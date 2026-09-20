import { writeFile, rename, rm } from 'node:fs/promises';
import { DISTRICT_SOURCE, DISTRICT_SERVICE, validateDistricts } from './cologne-districts.mjs';

const endpoint = `${DISTRICT_SERVICE}/query?where=1%3D1&outFields=NAME%2CSTADTBEZIR&outSR=4326&f=geojson`;
const output = new URL('../Apps/Data/stadtteile-koeln.geojson', import.meta.url);
const temporary = new URL('../Apps/Data/stadtteile-koeln.geojson.tmp', import.meta.url);
const response = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Stadtteilabruf fehlgeschlagen: HTTP ${response.status}`);
const collection = validateDistricts(await response.json());
collection.sourceUrl = DISTRICT_SOURCE;
collection.serviceUrl = DISTRICT_SERVICE;
collection.license = 'Datenlizenz Deutschland – Zero – Version 2.0';
collection.retrievedAt = new Date().toISOString();
try {
  await writeFile(temporary, JSON.stringify(collection));
  await rename(temporary, output);
} finally {
  await rm(temporary, { force: true });
}
console.log(`Saved ${collection.features.length} Cologne districts.`);
