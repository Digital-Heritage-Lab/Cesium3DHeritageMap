// Public Open311 feed used by the City's own "Sag's uns Köln" map.
// The API supports service_code, start_date, end_date and page; no NID list is needed.
export const GREEN_SERVICES = Object.freeze([
  { code: '3.2', name: 'Kölner Grün' },
  { code: '3.3', name: 'Spiel- und Bolzplätze' },
]);

const API_URL = 'https://sags-uns.stadt-koeln.de/georeport/v2/requests.json';
const SITE_URL = 'https://sags-uns.stadt-koeln.de';
const CACHE_MS = 10 * 60 * 1000;
const WINDOW_DAYS = 30;
const PAGE_SIZE = 100;
const MAX_PAGES = 8;
let cached = null;
let expiresAt = 0;
let pending = null;

const clipped = (value, length = 500) => String(value ?? '').trim().slice(0, length);

function mediaUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === SITE_URL &&
      url.pathname.startsWith('/system/files/') ? url.href : null;
  } catch {
    return null;
  }
}

function statusOf(value) {
  const status = String(value || '').toLowerCase();
  if (status === 'open') return 'open';
  if (['in_progress', 'in progress', 'in_process', 'in-process', 'processing'].includes(status)) return 'in_progress';
  if (status === 'closed') return 'closed';
  return 'other';
}

export function normalizeReport(raw, service) {
  if (!raw || String(raw.service_code) !== service.code || raw.service_name !== service.name) return null;
  const id = clipped(raw.service_request_id, 40);
  const lat = Number(raw.lat), lng = Number(raw.long);
  if (!/^\d+-\d{4}$/.test(id) || !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < 50.8 || lat > 51.15 || lng < 6.7 || lng > 7.25) return null;
  const createdAt = new Date(raw.requested_datetime);
  if (Number.isNaN(createdAt.getTime())) return null;
  const updatedAt = new Date(raw.updated_datetime);
  return {
    id, nid: clipped(raw.extended_attributes?.markaspot?.nid, 30),
    category: service.name, serviceCode: service.code,
    coordinates: { lat, lng }, address: clipped(raw.address_string, 180),
    description: clipped(raw.description, 1800), status: statusOf(raw.status),
    createdAt: createdAt.toISOString(), updatedAt: Number.isNaN(updatedAt.getTime()) ? null : updatedAt.toISOString(),
    imageUrl: mediaUrl(raw.media_url), source: "Sag's uns Köln",
    sourceUrl: `${SITE_URL}/requests/${encodeURIComponent(id)}`,
  };
}

async function fetchPage(service, page, start, end, fetchImpl, signal) {
  const url = new URL(API_URL);
  url.searchParams.set('service_code', service.code);
  url.searchParams.set('extensions', 'true');
  url.searchParams.set('start_date', start);
  url.searchParams.set('end_date', end);
  url.searchParams.set('page', String(page));
  const response = await fetchImpl(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Sag's-uns HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length > PAGE_SIZE) throw new Error('Sag\'s-uns Antwort ist ungültig');
  return data;
}

async function collectService(service, start, end, fetchImpl, signal) {
  const reports = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await fetchPage(service, page, start, end, fetchImpl, signal);
    for (const row of rows) {
      const report = normalizeReport(row, service);
      if (report) reports.push(report);
    }
    if (rows.length < PAGE_SIZE) return reports;
  }
  throw new Error('Sag\'s-uns Seitenlimit erreicht; unvollständige Daten werden nicht angezeigt');
}

export async function loadGreenReports(fetchImpl = fetch, now = Date.now()) {
  if (cached && now < expiresAt) return cached;
  if (pending) return pending;
  pending = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const start = new Date(now - WINDOW_DAYS * 86400000).toISOString();
      const end = new Date(now + 86400000).toISOString();
      const groups = await Promise.all(GREEN_SERVICES.map((service) =>
        collectService(service, start, end, fetchImpl, controller.signal)));
      const byId = new Map(groups.flat().map((report) => [report.id, report]));
      cached = { source: "Sag's uns Köln", services: GREEN_SERVICES, windowDays: WINDOW_DAYS,
        fetchedAt: new Date(now).toISOString(), reports: [...byId.values()] };
      expiresAt = now + CACHE_MS;
      return cached;
    } finally {
      clearTimeout(timeout);
      pending = null;
    }
  })();
  return pending;
}

export function clearGreenReportsCache() {
  cached = null;
  expiresAt = 0;
  pending = null;
}
