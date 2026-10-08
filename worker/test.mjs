// Local test of the Worker logic with a fake GitHub and a fake KV. Run: node worker/test.mjs
import worker, { sign, verify } from './src/index.js';
import { signToken } from '../scripts/blog/sign.mjs';
import assert from 'node:assert/strict';

const SECRET = 'test-secret';
const kv = new Map();
const env = { APPROVAL_SECRET: SECRET, GITHUB_TOKEN: 'x', GITHUB_REPO: 'o/r', NONCES: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async (k) => kv.delete(k) } };

// fake GitHub
let store = { 'drafts/my-post.json': { title: 'Old', slug: 'my-post', description: 'd', body: 'Hello', faq: [{ q: 'q', a: 'a' }], hero: { id: 1, url: 'u1', alt: 'a1' }, choices: [{ id: 2, url: 'u2', alt: 'a2' }] } };
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url); calls.push([init.method || 'GET', u.pathname]);
  const m = u.pathname.match(/contents\/(.+)$/);
  if (m && (!init.method || init.method === 'GET')) { const d = store[decodeURIComponent(m[1])]; return d ? new Response(JSON.stringify({ sha: 'sha1', content: btoa(JSON.stringify(d)) })) : new Response('', { status: 404 }); }
  if (m && init.method === 'PUT') { const b = JSON.parse(init.body); store[decodeURIComponent(m[1])] = JSON.parse(Buffer.from(b.content, 'base64').toString()); return new Response('{}'); }
  if (u.pathname.endsWith('/dispatches')) return new Response(null, { status: 204 });
  return new Response('', { status: 404 });
};
const req = (p, init) => worker.fetch(new Request('https://w.test' + p, init), env);

// the Node signer (used by the generator) must be accepted by the Worker
const t1 = signToken({ s: 'my-post', a: 'approve' }, SECRET);
assert.ok(await verify(t1, SECRET), 'worker accepts a token signed by the generator');
assert.equal(await verify(t1, 'wrong'), null, 'wrong secret is rejected');
assert.equal(await verify(t1.slice(0, -2) + 'xx', SECRET), null, 'tampered token is rejected');
assert.equal(await verify(await sign({ a: 'approve' }, SECRET, -10), SECRET), null, 'expired token is rejected');

// approve works once
let r = await req('/act?t=' + t1); assert.equal(r.status, 200); assert.match(await r.text(), /Approved/);
assert.ok(calls.some((c) => c[0] === 'POST' && c[1].endsWith('/dispatches')), 'dispatch sent');
r = await req('/act?t=' + t1); assert.equal(r.status, 409, 'second click refused');

// guide approval: one page, then all pages
const tg = signToken({ s: 'schools', a: 'guide' }, SECRET);
calls.length = 0;
r = await req('/act?t=' + tg); assert.equal(r.status, 200); assert.match(await r.text(), /Approved for Google/);
assert.ok(calls.some((c) => c[0] === 'POST' && c[1].endsWith('/dispatches')), 'guide dispatch sent');
r = await req('/act?t=' + tg); assert.equal(r.status, 409, 'guide link works once');

// bad link
r = await req('/act?t=garbage'); assert.equal(r.status, 400);

// edit -> save draft -> save & publish
const te = signToken({ s: 'my-post', a: 'edit' }, SECRET);
r = await req('/edit?t=' + te); assert.equal(r.status, 200); let html = await r.text(); assert.match(html, /Edit draft/);
const session = html.match(/name="session" value="([^"]+)"/)[1];
r = await req('/edit?t=' + te); assert.equal(r.status, 409, 'edit link works once');
const form = (act, extra = {}) => { const f = new FormData(); f.set('session', session); f.set('title', 'New title'); f.set('description', 'New desc'); f.set('body', 'New body <script>x</script>'); f.set('hero', '2'); f.set('q0', 'Q?'); f.set('a0', 'A.'); f.set('act', act); for (const [k, v] of Object.entries(extra)) f.set(k, v); return f; };
r = await req('/save', { method: 'POST', body: form('draft') }); assert.equal(r.status, 200); assert.match(await r.text(), /Draft saved/);
assert.equal(store['drafts/my-post.json'].title, 'New title'); assert.equal(store['drafts/my-post.json'].hero.id, 2); assert.ok(!store['drafts/my-post.json'].body.includes('<script'), 'script stripped');
r = await req('/save', { method: 'POST', body: form('publish') }); assert.match(await r.text(), /Saved and approved/);
r = await req('/save', { method: 'POST', body: form('publish') }); assert.equal(r.status, 409, 'session cannot publish twice');
console.log('Worker tests passed.');
