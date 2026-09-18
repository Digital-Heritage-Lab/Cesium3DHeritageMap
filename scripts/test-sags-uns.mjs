import test from 'node:test';
import assert from 'node:assert/strict';
import { clearGreenReportsCache, GREEN_SERVICES, loadGreenReports, normalizeReport } from './sags-uns-service.mjs';
import sagsUnsHandler from '../netlify/functions/sags-uns.mjs';

const raw = (overrides = {}) => ({
  service_request_id: '22478-2026', service_code: '3.2', service_name: 'Kölner Grün',
  lat: 50.95, long: 6.97, address_string: 'Köln', description: '<img src=x onerror=alert(1)>',
  status: 'open', requested_datetime: '2026-09-18T12:00:00+02:00',
  updated_datetime: '2026-09-18T13:00:00+02:00',
  media_url: 'https://sags-uns.stadt-koeln.de/system/files/2026-09/baum.jpg',
  extended_attributes: { markaspot: { nid: '91601' } }, ...overrides,
});

test('normalizer keeps only the two configured green services with valid Cologne coordinates', () => {
  const service = GREEN_SERVICES[0];
  assert.equal(normalizeReport(raw(), service).id, '22478-2026');
  assert.equal(normalizeReport(raw(), service).nid, '91601');
  assert.equal(normalizeReport(raw({ service_code: '1.1', service_name: 'Wilder Müll' }), service), null);
  assert.equal(normalizeReport(raw({ lat: null }), service), null);
  assert.equal(normalizeReport(raw({ long: 100 }), service), null);
  assert.equal(normalizeReport(raw({ media_url: 'https://evil.example/system/files/baum.jpg' }), service).imageUrl, null);
  assert.equal(normalizeReport(raw({ media_url: 'javascript:alert(1)' }), service).imageUrl, null);
  assert.equal(normalizeReport(raw({ status: 'in_progress' }), service).status, 'in_progress');
  assert.equal(normalizeReport(raw({ status: 'closed' }), service).status, 'closed');
});

test('live adapter requests date, category and page without fixed NIDs, then deduplicates', async () => {
  clearGreenReportsCache();
  const calls = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    const code = parsed.searchParams.get('service_code');
    const page = Number(parsed.searchParams.get('page'));
    let rows = [];
    if (code === '3.2' && page === 0) rows = Array.from({ length: 100 }, (_, i) =>
      raw({ service_request_id: `${10000 + i}-2026` }));
    if (code === '3.2' && page === 1) rows = [raw({ service_request_id: '10000-2026' }), raw()];
    if (code === '3.3') rows = [raw({ service_request_id: '22422-2026', service_code: '3.3', service_name: 'Spiel- und Bolzplätze' })];
    return { ok: true, json: async () => rows };
  };
  const now = Date.parse('2026-09-18T12:00:00Z');
  const [first, second] = await Promise.all([loadGreenReports(fetchImpl, now), loadGreenReports(fetchImpl, now)]);
  assert.equal(first, second);
  assert.equal(first.reports.length, 102);
  assert.deepEqual(first.services, GREEN_SERVICES);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((url) => url.searchParams.get('extensions') === 'true' &&
    url.searchParams.has('start_date') && url.searchParams.has('end_date') && !url.searchParams.has('nids')));
  await loadGreenReports(fetchImpl, now + 1000);
  assert.equal(calls.length, 3);
  clearGreenReportsCache();
});

test('upstream failure is surfaced and never cached as an empty feed', async () => {
  clearGreenReportsCache();
  await assert.rejects(loadGreenReports(async () => ({ ok: false, status: 503 }), Date.now()));
  clearGreenReportsCache();
});

test('Netlify serves the dated snapshot when the city feed is unavailable', async () => {
  clearGreenReportsCache();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('upstream unavailable'); };
  try {
    const response = await sagsUnsHandler(new Request('https://example.net/api/sags-uns'));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.snapshot, true);
    assert.ok(data.reports.length > 0);
    assert.ok(!Number.isNaN(Date.parse(data.fetchedAt)));
  } finally {
    globalThis.fetch = originalFetch;
    clearGreenReportsCache();
  }
});
