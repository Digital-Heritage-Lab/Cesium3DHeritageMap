import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { clearGreenReportsCache, loadGreenReports } from './sags-uns-service.mjs';

const destination = fileURLToPath(new URL('../Apps/Data/sags-uns-snapshot.json', import.meta.url));
let data;
for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    data = await loadGreenReports();
    break;
  } catch (error) {
    clearGreenReportsCache();
    if (attempt === 2) throw error;
  }
}
if (!data.reports.length) throw new Error('Empty Sag\'s-uns feed; keeping existing snapshot');
await writeFile(destination, JSON.stringify(data) + '\n');
console.log(`Updated Sag's-uns snapshot: ${data.reports.length} reports at ${data.fetchedAt}`);
