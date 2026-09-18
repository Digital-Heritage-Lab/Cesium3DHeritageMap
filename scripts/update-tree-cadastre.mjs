import { writeFile } from 'node:fs/promises';

export const WFS_URL = 'https://geoportal.stadt-koeln.de/wss/service/baumkataster_extern_wfs/guest';
export const DATASET_URL = 'https://open.nrw/dataset/e02ad618-ab42-48b5-8551-849aa936bb99';
const output = new URL('../Apps/Data/baumkataster.json', import.meta.url);
const pageSize = 5000;

// Inverse Transverse Mercator for ETRS89 / UTM zone 32N (EPSG:25832).
export function utm32ToWgs84(easting, northing) {
  const a = 6378137;
  const e2 = 0.00669438002290;
  const ep2 = e2 / (1 - e2);
  const k0 = 0.9996;
  const x = easting - 500000;
  const m = northing / k0;
  const mu = m / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) +
    (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) +
    151 * e1 ** 3 / 96 * Math.sin(6 * mu) + 1097 * e1 ** 4 / 512 * Math.sin(8 * mu);
  const sin = Math.sin(phi), cos = Math.cos(phi), tan = Math.tan(phi);
  const n = a / Math.sqrt(1 - e2 * sin ** 2);
  const r = a * (1 - e2) / (1 - e2 * sin ** 2) ** 1.5;
  const t = tan ** 2, c = ep2 * cos ** 2, d = x / (n * k0);
  const latitude = phi - n * tan / r * (d ** 2 / 2 -
    (5 + 3 * t + 10 * c - 4 * c ** 2 - 9 * ep2) * d ** 4 / 24 +
    (61 + 90 * t + 298 * c + 45 * t ** 2 - 252 * ep2 - 3 * c ** 2) * d ** 6 / 720);
  const longitude = 9 * Math.PI / 180 + (d - (1 + 2 * t + c) * d ** 3 / 6 +
    (5 - 2 * c + 28 * t - 3 * c ** 2 + 8 * ep2 + 24 * t ** 2) * d ** 5 / 120) / cos;
  return [longitude, latitude].map((rad) => Math.round(rad * 180 / Math.PI * 1e6) / 1e6);
}

const text = (value, max = 90) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const measure = (value, max) => {
  const number = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(number) && number > 0 && number <= max ? number : null;
};

export function compactTree(feature) {
  if (feature.geometry?.type !== 'Point') return null;
  const [east, north] = feature.geometry.coordinates || [];
  if (!Number.isFinite(east) || !Number.isFinite(north) || east < 340000 || east > 380000 || north < 5620000 || north > 5680000) return null;
  const [lon, lat] = utm32ToWgs84(east, north);
  if (lon < 6.7 || lon > 7.2 || lat < 50.8 || lat > 51.11) return null;
  const p = feature.properties || {};
  const number = text(p.Baumnummer, 60);
  // Baumnummer is repeated in the public WFS, so coordinates complete the ID.
  const id = `${number || 'ohne-nummer'}@${Math.round(east * 100)}-${Math.round(north * 100)}`;
  const year = Number(p.Pflanzjahr);
  return [id, lon, lat, text(p.Deutscher_Name), text(p.Botanischer_Name),
    text(p['Straße']), text(p.Stadtteil), Number.isInteger(year) && year >= 1800 && year <= new Date().getFullYear() ? year : null,
    measure(p['Stammdurchmesser_-_cm'], 1000), measure(p['Höhe_-_m'], 100),
    measure(p['Kronendurchmesser_-_m'], 100), text(p.Eigentum, 30)];
}

async function request(parameters) {
  const url = new URL(WFS_URL);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`WFS HTTP ${response.status}`);
      return response.text();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
}

export async function updateTreeCadastre() {
  const standard = { service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'ms:baumkataster' };
  const hits = await request({ ...standard, resultType: 'hits' });
  const expected = Number(hits.match(/numberMatched="(\d+)"/)?.[1]);
  if (!Number.isInteger(expected) || expected < 50000 || expected > 150000) throw new Error('Unexpected Baumkataster feature count');
  const trees = [], ids = new Set();
  let skipped = 0;
  for (let startIndex = 0; startIndex < expected; startIndex += pageSize) {
    const body = await request({ ...standard, startIndex, count: pageSize, sortBy: 'Baumnummer', outputFormat: 'application/json; subtype=geojson' });
    const page = JSON.parse(body);
    if (page.type !== 'FeatureCollection' || !Array.isArray(page.features) ||
      page.features.length !== Math.min(pageSize, expected - startIndex)) throw new Error(`Incomplete WFS page at ${startIndex}`);
    for (const feature of page.features) {
      const tree = compactTree(feature);
      if (!tree) { skipped++; continue; }
      const id = tree[0];
      if (ids.has(id)) { skipped++; continue; }
      ids.add(id);
      trees.push(tree);
    }
    process.stdout.write(`Read ${startIndex + page.features.length}/${expected} Baumkataster records\n`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (trees.length < expected * 0.99) throw new Error(`Too many invalid or duplicate trees (${skipped})`);
  const snapshot = { source: 'Stadt Köln · Amt für Landschaftspflege und Grünflächen',
    sourceUrl: DATASET_URL, serviceUrl: WFS_URL, license: 'Datenlizenz Deutschland – Zero – Version 2.0',
    licenseUrl: 'https://www.govdata.de/dl-de/zero-2-0', dataAsOf: new Date().toISOString(),
    sourceCount: expected, count: trees.length, skipped,
    fields: ['number', 'longitude', 'latitude', 'deName', 'botanicalName', 'street', 'district', 'plantingYear', 'trunkDiameterCm', 'heightM', 'crownDiameterM', 'ownership'], trees };
  await writeFile(output, JSON.stringify(snapshot));
  return snapshot;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/update-tree-cadastre.mjs')) {
  const snapshot = await updateTreeCadastre();
  process.stdout.write(`Saved ${snapshot.count} trees; skipped ${snapshot.skipped}.\n`);
}
