import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const dataFile = new URL('../Apps/Data/green-atlas.geojson', import.meta.url);
const manifestFile = new URL('../Apps/Data/green-photos.json', import.meta.url);
const imageDirectory = new URL('../Apps/Images/places/', import.meta.url);
const userAgent = 'GruenAtlasKoeln-photo-refresh/1.0 (github.com/ErtanOz/GruenAtlas-Koeln)';
// Visual review: these P18 files depict a nearby feature rather than the mapped object.
const excludedFeatureIds = new Set([
  'osm-way-1082470147',
  'osm-way-155328270',
  'osm-node-3287270571',
  'osm-node-964736151',
]);

export function plainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?\s*>/gi, ' / ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:lt|#60);/gi, '<')
    .replace(/&(?:gt|#62);/gi, '>')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

export function photoFromCommons(page) {
  const info = page?.imageinfo?.[0];
  if (!info || !['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) return null;
  const url = info.thumburl;
  const filePage = info.descriptionurl;
  if (!url || !filePage || !['thumb.wikimedia.org', 'upload.wikimedia.org'].includes(new URL(url).hostname) ||
    new URL(filePage).hostname !== 'commons.wikimedia.org') return null;
  const metadata = info.extmetadata || {};
  const artist = plainText(metadata.Artist?.value);
  const license = plainText(metadata.LicenseShortName?.value);
  const licenseUrl = metadata.LicenseUrl?.value || '';
  if (!license || (metadata.AttributionRequired?.value === 'true' && !artist)) return null;
  if (licenseUrl && !['creativecommons.org', 'www.creativecommons.org', 'commons.wikimedia.org'].includes(new URL(licenseUrl).hostname)) return null;
  return { url, filePage, artist: artist || 'Urheberangabe auf Wikimedia Commons', license,
    licenseUrl: licenseUrl || filePage, extension: info.mime === 'image/png' ? 'png' : info.mime === 'image/webp' ? 'webp' : 'jpg' };
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let response;
    try {
      response = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (response.ok) return response;
    if (response.status !== 429 || attempt === 2) {
      throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}`);
    }
    const seconds = Number(response.headers.get('retry-after'));
    await wait(Math.min(120, Math.max(30, Number.isFinite(seconds) ? seconds : 30)) * 1000);
  }
}

async function jsonApi(host, parameters) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ ...parameters, format: 'json' })}`;
  return (await request(url)).json();
}

function batches(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size));
}

function normalizedTitle(title) {
  return title.replace(/^File:/i, '').replaceAll('_', ' ').normalize('NFC').toLocaleLowerCase('en');
}

export async function updateGreenPhotos() {
  const collection = JSON.parse(await readFile(dataFile, 'utf8'));
  const byWikidata = new Map();
  for (const feature of collection.features) {
    if (excludedFeatureIds.has(feature.id)) continue;
    const id = feature.properties?.wikidataUrl?.split('/').pop();
    if (/^Q\d+$/.test(id || '')) {
      if (!byWikidata.has(id)) byWikidata.set(id, []);
      byWikidata.get(id).push(feature.id);
    }
  }
  const candidateFiles = new Map();
  for (const group of batches([...byWikidata.keys()], 25)) {
    const result = await jsonApi('www.wikidata.org', {
      action: 'wbgetentities', ids: group.join('|'), props: 'claims', formatversion: '2',
    });
    for (const [id, entity] of Object.entries(result.entities || {})) {
      const claims = entity.claims?.P18 || [];
      const claim = claims.find((item) => item.rank === 'preferred') || claims.find((item) => item.rank !== 'deprecated');
      const file = claim?.mainsnak?.datavalue?.value;
      if (typeof file === 'string' && /\.(jpe?g|png|webp)$/i.test(file)) candidateFiles.set(id, file);
    }
  }
  const fileNames = [...new Set(candidateFiles.values())];
  const commons = new Map();
  for (const group of batches(fileNames, 2)) {
    const result = await jsonApi('commons.wikimedia.org', {
      action: 'query', titles: group.map((file) => `File:${file}`).join('|'),
      prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '720', redirects: '1',
    });
    for (const page of Object.values(result.query?.pages || {})) {
      const photo = photoFromCommons(page);
      if (photo) commons.set(normalizedTitle(page.title), photo);
    }
    await wait(1000);
  }
  const items = {};
  await mkdir(imageDirectory, { recursive: true });
  for (const [wikidataId, file] of candidateFiles) {
    const photo = commons.get(normalizedTitle(file));
    if (!photo) continue;
    const response = await request(photo.url);
    if (!['thumb.wikimedia.org', 'upload.wikimedia.org'].includes(new URL(response.url).hostname)) continue;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 2_000_000) continue;
    for (const featureId of byWikidata.get(wikidataId)) {
      const fileName = `${featureId}.${photo.extension}`;
      await writeFile(new URL(fileName, imageDirectory), bytes);
      items[featureId] = {
        path: `Images/places/${fileName}`, filePage: photo.filePage,
        artist: photo.artist, license: photo.license, licenseUrl: photo.licenseUrl,
        wikidataId,
      };
    }
    await wait(200);
  }
  if (!Object.keys(items).length) throw new Error('No reusable Commons photos found; existing manifest retained.');
  const manifest = { source: 'Wikidata P18 / Wikimedia Commons', sourceDataAsOf: collection.dataAsOf,
    refreshedAt: new Date().toISOString(), items };
  await writeFile(manifestFile, JSON.stringify(manifest));
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await updateGreenPhotos();
  process.stdout.write(`Saved ${Object.keys(manifest.items).length} attributed Commons photos.\n`);
}
