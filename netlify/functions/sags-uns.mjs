import { loadGreenReports } from '../../scripts/sags-uns-service.mjs';

export default async (request) => {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  try {
    const data = await loadGreenReports();
    return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=300' } });
  } catch {
    return Response.json({ error: 'reports_unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};
