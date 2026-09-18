/* Same-origin client for the normalized, cached Sag's-uns feed. */
window.GreenReports = (() => {
  let reports = [];
  let fetchedAt = null;
  let snapshot = false;
  let services = [];
  let loadedAt = 0;
  let pending = null;
  const byId = new Map();
  const MAX_AGE = 10 * 60 * 1000;

  async function load(force = false) {
    if (!force && loadedAt && Date.now() - loadedAt < MAX_AGE) return reports;
    if (pending) return pending;
    pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        let response;
        let usingSnapshot = false;
        try {
          response = await fetch('/api/sags-uns', { signal: controller.signal });
          if (!response.ok) throw new Error('Grünmeldungen nicht erreichbar');
        } catch {
          // Manual Netlify uploads contain static files but no Functions.
          response = await fetch('/Apps/Data/sags-uns-snapshot.json');
          if (!response.ok) throw new Error('Grünmeldungen nicht erreichbar');
          usingSnapshot = true;
        }
        const data = await response.json();
        if (!Array.isArray(data.reports) || !Array.isArray(data.services) || !data.fetchedAt) throw new Error('Ungültige Grünmeldungen');
        const allowed = new Set(data.services.filter((service) =>
          typeof service.code === 'string' && typeof service.name === 'string').map((service) => service.code));
        const next = data.reports.filter((item) => item && typeof item.id === 'string' &&
          allowed.has(item.serviceCode) &&
          Number.isFinite(item.coordinates?.lat) && Number.isFinite(item.coordinates?.lng));
        reports = next;
        services = data.services;
        byId.clear();
        for (const report of next) byId.set(`report-${report.id}`, report);
        fetchedAt = data.fetchedAt;
        snapshot = usingSnapshot || data.snapshot === true;
        loadedAt = Date.now();
        return reports;
      } finally {
        clearTimeout(timeout);
        pending = null;
      }
    })();
    return pending;
  }

  function filter(category = 'all', status = 'all') {
    return reports.filter((item) => (category === 'all' || item.serviceCode === category) &&
      (status === 'all' || item.status === status));
  }

  return { load, filter, get: (id) => byId.get(id) || null,
    get reports() { return reports; }, get services() { return services; }, get fetchedAt() { return fetchedAt; },
    get snapshot() { return snapshot; } };
})();
