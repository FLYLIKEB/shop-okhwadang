import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const entries = new Map();
let detailReads = 0;
for (const resource of ['page', 'journal']) {
  entries.set(resource, { slug: `${resource}-original`, title: `${resource}-initial`, published: true });
}
const backend = http.createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (['PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    let body = '';
    for await (const chunk of request) body += chunk;
    const resource = request.url.includes('/journals/') ? 'journal' : 'page';
    const patch = JSON.parse(body);
    if (request.method === 'DELETE') patch.deleted = true;
    Object.assign(entries.get(resource), patch);
    response.end('{}');
    return;
  }
  const url = new URL(request.url, 'http://localhost');
  const [, , collection, slug] = url.pathname.split('/');
  const entry = entries.get(collection === 'pages' ? 'page' : 'journal');
  if (slug) detailReads++;
  if (!slug) {
    response.end(JSON.stringify(entry.published && !entry.deleted ? [entry] : []));
  } else if (entry.slug === slug && entry.published && !entry.deleted) {
    response.end(JSON.stringify(entry));
  } else {
    response.statusCode = 404;
    response.end(JSON.stringify({ message: 'missing' }));
  }
});

let next;
let output = '';
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
try {
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  const portProbe = http.createServer();
  portProbe.listen(0, '127.0.0.1');
  await once(portProbe, 'listening');
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'tests/fixtures/cms-cache', '-p', String(port), '-H', '127.0.0.1'], {
    env: { ...process.env, NODE_ENV: 'production', CI: 'false', BACKEND_URL: `http://127.0.0.1:${backend.address().port}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [next.stdout, next.stderr]) stream.on('data', (chunk) => { output += chunk; });
  for (let attempt = 0; !output.includes('Ready'); attempt++) {
    assert.ok(attempt < 150 && next.exitCode === null, output || 'Next did not start');
    await delay(200);
  }
  const origin = `http://127.0.0.1:${port}`;
  async function prime(resource, slug, marker) {
    for (const locale of ['ko', 'en']) {
      const response = await fetch(`${origin}/prime/${locale}/${resource}/${slug}`, { signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 200);
      assert.ok((await response.text()).includes(marker));
    }
  }
  async function check(resource, slug, status, marker) {
    for (const locale of ['ko', 'en']) {
      const response = await fetch(`${origin}/${locale}/${resource}/${slug}`, { signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, status, `${locale}/${resource}/${slug}`);
      const body = await response.text();
      if (marker) assert.ok(body.includes(marker), `${locale}: ${marker} missing`);
      if (status === 404) assert.ok(!body.includes(`${resource}-initial`) && !body.includes(`${resource}-edited`) && !body.includes('page-granular'));
    }
  }
  async function mutate(resource, patch, granular = false) {
    const endpoint = resource === 'journal' ? '/api/admin/journals/1'
      : patch.deleted ? '/api/pages/1' : granular ? '/api/pages/1/blocks/1' : '/api/admin/pages/1/draft';
    const method = patch.deleted ? 'DELETE' : resource === 'page' && !granular ? 'PUT' : 'PATCH';
    const response = await fetch(`http://127.0.0.1:${backend.address().port}${endpoint}`, { method, body: JSON.stringify(patch), signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200);
  }
  for (const resource of ['page', 'journal']) {
    const original = `${resource}-original`;
    await prime(resource, original, `${resource}-initial`);
    await check(resource, original, 200, `${resource}-initial`);
    await check(resource, original, 200, `${resource}-initial`);
    if (resource === 'journal') {
      await prime('list', 'all', 'journal-initial');
      await check('list', 'all', 200, 'journal-initial');
    }
    await mutate(resource, { title: `${resource}-edited` });
    await check(resource, original, 200, `${resource}-edited`);
    const updatedMarker = resource === 'page' ? 'page-granular' : `${resource}-edited`;
    if (resource === 'page') {
      await mutate(resource, { title: updatedMarker }, true);
      await check(resource, original, 200, updatedMarker);
    }
    await mutate(resource, { published: false });
    const readsBeforeCachedProbe = detailReads;
    await prime(resource, original, `${resource}-initial`);
    assert.equal(detailReads, readsBeforeCachedProbe, 'Legacy cached200 must remain warm while public reads reject withdrawn content');
    await check(resource, original, 404);
    if (resource === 'journal') {
      await prime('list', 'all', 'journal-initial');
      await check('list', 'all', 200, '[]');
    }
    await mutate(resource, { published: true });
    await check(resource, original, 200, updatedMarker);
    await mutate(resource, { slug: `${resource}-renamed` });
    await check(resource, original, 404);
    await check(resource, `${resource}-renamed`, 200, updatedMarker);
    await mutate(resource, { deleted: true });
    await check(resource, `${resource}-renamed`, 404);
  }
  assert.ok(detailReads >= 28, 'Public details must be rechecked against the authoritative backend');
  console.log('PASS: repeated production SSR reads reflect direct backend save, unpublish, publish, rename and delete in ko/en');
} finally {
  if (next && next.exitCode === null) {
    next.kill('SIGTERM');
    await Promise.race([once(next, 'exit'), delay(3000)]);
    if (next.exitCode === null) next.kill('SIGKILL');
  }
  backend.closeAllConnections();
  await new Promise((resolve) => backend.close(resolve));
}
