import { readFile } from 'node:fs/promises';

export const DISTRICT_SOURCE = 'https://www.offenedaten-koeln.de/dataset/stadtteile-k%C3%B6ln';
export const DISTRICT_SERVICE = 'https://services.arcgis.com/ObdAEOfl1Z5LP2D0/ArcGIS/rest/services/K%C3%B6ln/FeatureServer/7';
const file = new URL('../Apps/Data/stadtteile-koeln.geojson', import.meta.url);

export function validateDistricts(collection) {
  if (collection?.type !== 'FeatureCollection' || collection.features?.length !== 86 ||
      collection.features.some((feature) => !feature.properties?.NAME ||
        !['Polygon', 'MultiPolygon'].includes(feature.geometry?.type))) {
    throw new Error('Expected all 86 Cologne district polygons.');
  }
  return collection;
}

export async function loadDistricts() {
  return validateDistricts(JSON.parse(await readFile(file, 'utf8')));
}

function insideRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function districtAt(collection, lon, lat) {
  const matches = collection.features.filter(({ geometry }) => {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return polygons.some(([outer, ...holes]) => insideRing(lon, lat, outer) &&
      !holes.some((ring) => insideRing(lon, lat, ring)));
  });
  return matches.length === 1 ? { name: matches[0].properties.NAME,
    borough: matches[0].properties.STADTBEZIR || null } : null;
}
