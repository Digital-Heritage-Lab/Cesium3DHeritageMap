import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { loadDistricts, districtAt } from './cologne-districts.mjs';

const file = new URL('../Apps/Data/green-atlas.geojson', import.meta.url);
const temporary = new URL('../Apps/Data/green-atlas.geojson.tmp', import.meta.url);
const districts = await loadDistricts();
const collection = JSON.parse(await readFile(file, 'utf8'));
if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid OSM snapshot.');
let assigned = 0;
for (const feature of collection.features) {
  const [lon, lat] = feature.geometry.coordinates;
  const match = districtAt(districts, lon, lat);
  if (match) {
    feature.properties.district = match.name;
    feature.properties.borough = match.borough;
    delete feature.properties.districtAssignment;
    assigned++;
  } else {
    delete feature.properties.district;
    feature.properties.districtAssignment = 'unassigned';
  }
}
collection.districtSourceUrl = districts.sourceUrl;
collection.districtDataAsOf = districts.retrievedAt;
try {
  await writeFile(temporary, JSON.stringify(collection));
  await rename(temporary, file);
} finally {
  await rm(temporary, { force: true });
}
console.log(`Districts assigned: ${assigned}/${collection.features.length}.`);
