import { readFile, writeFile } from 'node:fs/promises';
import { loadDistricts, districtAt } from './cologne-districts.mjs';

// Import an explicitly exported Overpass Turbo JSON file. This script makes no network requests.
export function convertOverpass(input, districts) {
  if (!Array.isArray(input?.elements) || !input.osm3s?.timestamp_osm_base) {
    throw new Error('Expected an Overpass JSON export with an OSM data timestamp.');
  }
  const seen = new Set();
  const limits = { trees: 150, parks: 250, play: 250, dogs: 150, gardens: 150, cemeteries: 150, botanical: 30, water: 250 };
  const groups = Object.fromEntries(Object.keys(limits).map(key => [key, []]));
  for (const element of input.elements) {
    const t = element.tags || {};
    let theme;
    if (t.natural === 'tree' && t.name) theme = 'trees';
    else if (t.leisure === 'park') theme = 'parks';
    else if (t.leisure === 'playground') theme = 'play';
    else if (t.leisure === 'dog_park') theme = 'dogs';
    else if (t.leisure === 'garden') theme = t['garden:type'] === 'botanical' ? 'botanical' : 'gardens';
    else if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') theme = 'cemeteries';
    else if (t.amenity === 'fountain' || t.amenity === 'drinking_water') theme = 'water';
    if (!theme || !['node', 'way', 'relation'].includes(element.type) || !Number.isSafeInteger(element.id)) continue;
    const lon = element.lon ?? element.center?.lon;
    const lat = element.lat ?? element.center?.lat;
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < 6.7 || lon > 7.2 || lat < 50.8 || lat > 51.1) continue;
    const id = `osm-${element.type}-${element.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const label = { trees: 'Baum', parks: 'Park', play: 'Spielplatz', dogs: 'Hundeauslauf', gardens: 'Garten', cemeteries: 'Friedhof', botanical: 'Botanischer Garten', water: t.amenity === 'drinking_water' ? 'Trinkwasserstelle' : 'Brunnen' }[theme];
    const name = t['name:de'] || t.name || `${label} · OSM ${element.id}`;
    const properties = {
      theme, name, place: t['addr:city'] || 'Köln', isDemo: false,
      source: '© OpenStreetMap-Mitwirkende', sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      license: 'ODbL 1.0', licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/', dataAsOf: input.osm3s.timestamp_osm_base,
      positionNote: element.type === 'node' ? 'OSM-Punktstandort' : 'Mittelpunkt des OSM-Umgrenzungsrechtecks; kein Eingang',
    };
    if (t.species) properties.species = t['species:de'] || t.species;
    if (t.genus && !properties.species) properties.species = t.genus;
    if (t['addr:district']) properties.district = t['addr:district'];
    if (districts) {
      const assigned = districtAt(districts, lon, lat);
      if (assigned) {
        properties.district = assigned.name;
        properties.borough = assigned.borough;
      } else {
        delete properties.district;
        properties.districtAssignment = 'unassigned';
      }
    }
    if (theme === 'water') properties.kind = label;
    if (theme === 'gardens' && t['garden:type']) properties.kind = t['garden:type'];
    if (t.wikidata && /^Q\d+$/.test(t.wikidata)) properties.wikidataUrl = `https://www.wikidata.org/wiki/${t.wikidata}`;
    groups[theme].push({ type: 'Feature', id, geometry: { type: 'Point', coordinates: [lon, lat] }, properties });
  }
  const features = Object.entries(groups).flatMap(([theme, items]) =>
    items.sort((a, b) => Number(a.properties.name.includes(' · OSM ')) - Number(b.properties.name.includes(' · OSM ')) || a.id.localeCompare(b.id)).slice(0, limits[theme]));
  if (!features.length) throw new Error('No supported green places found; check your query and city area.');
  return { type: 'FeatureCollection', dataAsOf: input.osm3s.timestamp_osm_base,
    ...(districts && { districtSourceUrl: districts.sourceUrl, districtDataAsOf: districts.retrievedAt }),
    sourceUrl: 'https://www.openstreetmap.org/copyright', license: 'ODbL 1.0', licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    note: 'Selected OSM features in Cologne. Named trees only; per-theme limits apply. Area coordinates are bounding-box centers, not entrances.', features };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: node scripts/import-overpass.mjs <overpass-export.json>');
  const result = convertOverpass(JSON.parse(await readFile(path, 'utf8')), await loadDistricts());
  await writeFile(new URL('../Apps/Data/green-atlas.geojson', import.meta.url), JSON.stringify(result));
  process.stdout.write(`Imported ${result.features.length} OSM places; data timestamp ${result.dataAsOf}.\n`);
}
