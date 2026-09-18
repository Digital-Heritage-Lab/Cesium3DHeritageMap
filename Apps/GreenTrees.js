/* Read-only snapshot of the City of Cologne's public tree cadastre. */
window.GreenTrees = (() => {
  let snapshot = null;
  let rows = [];
  const byId = new Map();
  const cells = new Map();
  const clean = (value) => String(value || '').toLocaleLowerCase('de').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
  const cell = (lon, lat) => `${Math.floor(lon * 100)}:${Math.floor(lat * 100)}`;

  function feature(row) {
    const [number, lon, lat, german, botanical, street, district, planted, trunk, height, crown, ownership] = row;
    const name = german || botanical || 'Baum';
    return { type: 'Feature', id: `citytree-${number}`, geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { theme: 'trees', name, place: [street, district].filter(Boolean).join(' · ') || 'Köln',
        species: german || botanical, botanical, street, neighborhood: district, plantingYear: planted ? String(planted) : '',
        trunkDiameter: trunk ? `${trunk} cm` : '', height: height ? `${height} m` : '',
        crownDiameter: crown ? `${crown} m` : '', ownership, treeNumber: number.split('@')[0],
        sourceKind: 'cadastre', source: snapshot.source, sourceUrl: snapshot.sourceUrl,
        dataAsOf: snapshot.dataAsOf, license: snapshot.license,
        positionNote: 'Baumkataster-Standort; keine amtliche Lagevermessung.' } };
  }

  async function load() {
    const response = await fetch('Data/baumkataster.json');
    if (!response.ok) return false;
    const candidate = await response.json();
    if (!Array.isArray(candidate.trees) || candidate.trees.length !== candidate.count || candidate.count < 50000 ||
      candidate.sourceUrl !== 'https://open.nrw/dataset/e02ad618-ab42-48b5-8551-849aa936bb99' ||
      !candidate.dataAsOf || !candidate.license ||
      candidate.trees.some((row) => !Array.isArray(row) || row.length !== 12 ||
        typeof row[0] !== 'string' || !Number.isFinite(row[1]) || !Number.isFinite(row[2]) ||
        row[1] < 6.7 || row[1] > 7.2 || row[2] < 50.8 || row[2] > 51.11)) {
      throw new Error('Baumkataster-Datensatz ist ungültig.');
    }
    snapshot = candidate;
    rows = candidate.trees;
    for (const row of rows) {
      const id = `citytree-${row[0]}`;
      byId.set(id, row);
      const key = cell(row[1], row[2]);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(row);
    }
    return true;
  }

  // Visits every row inside [west, south, east, north] via the cell index.
  // The visitor may return false to stop early.
  function forEachInBounds(bounds, visit) {
    if (!snapshot || !bounds) return;
    const [west, south, east, north] = bounds;
    for (let x = Math.floor(west * 100); x <= Math.floor(east * 100); x++) {
      for (let y = Math.floor(south * 100); y <= Math.floor(north * 100); y++) {
        for (const row of cells.get(`${x}:${y}`) || []) {
          if (row[1] >= west && row[1] <= east && row[2] >= south && row[2] <= north &&
            visit(row) === false) return;
        }
      }
    }
  }

  function inBounds(bounds, limit = 3000, predicate) {
    const found = [];
    forEachInBounds(bounds, (row) => {
      if (predicate && !predicate(row)) return true;
      found.push(feature(row));
      return found.length < limit;
    });
    return found;
  }

  function forEachRow(visit) {
    for (const row of rows) if (visit(row) === false) return;
  }

  function search(query, limit = 10) {
    if (!snapshot || clean(query).trim().length < 3) return [];
    const words = clean(query).trim().split(/\s+/);
    const found = [];
    for (const row of rows) {
      const text = clean([row[0].split('@')[0], row[3], row[4], row[5], row[6]].join(' '));
      if (words.every((word) => text.includes(word))) {
        found.push(feature(row));
        if (found.length >= limit) break;
      }
    }
    return found;
  }

  return { load, get: (id) => byId.has(id) ? feature(byId.get(id)) : null,
    inBounds, forEachInBounds, forEachRow, toFeature: feature, search, get count() { return snapshot?.count || 0; }, get ready() { return !!snapshot; },
    get dataAsOf() { return snapshot?.dataAsOf; } };
})();
