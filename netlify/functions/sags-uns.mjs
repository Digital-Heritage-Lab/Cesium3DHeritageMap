import { loadGreenReports } from '../../scripts/sags-uns-service.mjs';
import snapshot from '../../Apps/Data/sags-uns-snapshot.json' with { type: 'json' };

export default async (request) => {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  try {
    const data = await loadGreenReports();
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=300' } });
  } catch {
    return Response.json({ ...snapshot, snapshot: true }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=300' },
    });
  }
};
