import assert from 'node:assert/strict';
import { serveCarto } from '../netlify/functions/carto.mjs';

const tile = '/api/carto/light_all/0/0/0.png';
assert.equal((await serveCarto(tile, '')).status, 503);
for (const path of ['/api/carto/light_all/21/0/0.png', '/api/carto/light_all/0/1/0.png', '/api/carto/evil/0/0/0.png']) {
    assert.equal((await serveCarto(path, 'test')).status, 400);
}
let seen;
const ok = await serveCarto(tile, 'test & value', async url => {
    seen = url;
    return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
});
assert.equal(ok.status, 200);
assert.equal(seen.searchParams.get('key'), 'test & value');
assert.equal(seen.hostname, 'basemaps.cartocdn.com');
assert.equal((await ok.arrayBuffer()).byteLength, 4);
for (const mock of [
    async () => new Response('secret', { status: 403 }),
    async () => new Response('html'),
    async () => { throw Error('secret'); }
]) {
    const response = await serveCarto(tile, 'secret', mock);
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('secret'));
    assert.equal(response.headers.get('cache-control'), 'no-store');
}
console.log('CARTO proxy checks passed.');
