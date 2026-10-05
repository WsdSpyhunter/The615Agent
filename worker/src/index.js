// The615Agent blog approval Worker.
// Email buttons land here. Every link carries a signed, expiring token and works once:
//   /act?t=...   approve | reject | regenerate  -> tells GitHub to run the matching workflow
//   /edit?t=...  opens a small mobile-friendly editor for the draft (title, description, photo, body, FAQ)
//   /save        saves the draft, or saves and publishes
// Drafts live in the repo as drafts/<slug>.json, so editing is just updating that file.

const enc = new TextEncoder();
const b64u = {
  enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};
const hmacKey = (secret, usage) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usage);

export async function sign(payload, secret, ttl) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttl, nonce: b64u.enc(crypto.getRandomValues(new Uint8Array(9))) };
  const p = b64u.enc(enc.encode(JSON.stringify(body)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(p));
  return `${p}.${b64u.enc(sig)}`;
}

/** Returns the payload if the token is genuine and not expired, otherwise null. */
export async function verify(token, secret) {
  try {
    const [p, s] = (token || '').split('.');
    if (!p || !s) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, ['verify']), b64u.dec(s), enc.encode(p));
    if (!ok) return null;
    const body = JSON.parse(new TextDecoder().decode(b64u.dec(p)));
    return body.exp > Math.floor(Date.now() / 1000) ? body : null;
  } catch { return null; }
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const page = (title, inner, status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>
:root{--bg:#EEF0F2;--fg:#0A0A0A;--muted:#4F5966;--line:#D4D9DF;--blue:#1473E6}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:18px}
.card{max-width:760px;margin:0 auto;background:#fff;border-radius:18px;padding:22px;box-shadow:0 8px 24px rgba(10,10,10,.08)}h1{font-size:1.5rem;margin:0 0 8px}label{display:block;font-weight:700;margin:16px 0 6px;font-size:14px}
input[type=text],textarea{width:100%;font:inherit;border:1.5px solid var(--line);border-radius:12px;padding:11px 13px}textarea{min-height:420px;font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.5}
.btn{display:inline-block;border:0;border-radius:999px;padding:13px 24px;font:inherit;font-weight:700;color:#fff;background:var(--blue);cursor:pointer;margin:6px 8px 0 0;text-decoration:none}.btn.g{background:#0E9F8E}.btn.d{background:#4F5966}
.hint{color:var(--muted);font-size:13px}.ok{background:#DDF5F1;color:#066356;border-radius:10px;padding:10px 12px;margin:10px 0}.err{background:#FFE9E3;color:#9A2A12;border-radius:10px;padding:10px 12px;margin:10px 0}
.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.photos label{margin:0;font-weight:500;border:2px solid var(--line);border-radius:12px;padding:6px;cursor:pointer}.photos img{width:100%;border-radius:8px;display:block}
.photos input:checked+img{outline:3px solid var(--blue)}.faq{display:grid;gap:8px}
</style></head><body><div class="card">${inner}</div></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

const gh = (env, path, init = {}) => fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
  ...init, headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'the615agent-blog-worker', 'X-GitHub-Api-Version': '2022-11-28', ...(init.headers || {}) },
});
const dispatch = (env, event, slug) => gh(env, '/dispatches', { method: 'POST', body: JSON.stringify({ event_type: event, client_payload: { slug } }) });

async function getDraft(env, slug) {
  const res = await gh(env, `/contents/drafts/${encodeURIComponent(slug)}.json`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const j = await res.json();
  return { sha: j.sha, draft: JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)))) };
}
async function putDraft(env, slug, draft, sha, attempt = 0) {
  const content = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(draft, null, 2) + '\n')));
  const res = await gh(env, `/contents/drafts/${encodeURIComponent(slug)}.json`, { method: 'PUT', body: JSON.stringify({ message: `Edit draft: ${slug}`, content, sha, branch: 'main' }) });
  if (res.status === 409 && attempt < 2) { const cur = await getDraft(env, slug); return putDraft(env, slug, draft, cur.sha, attempt + 1); }
  if (!res.ok) throw new Error(`GitHub returned ${res.status} while saving`);
}

const used = async (env, nonce) => !!(await env.NONCES.get(`n:${nonce}`));
const burn = (env, nonce) => env.NONCES.put(`n:${nonce}`, '1', { expirationTtl: 9 * 24 * 3600 });
const EVENTS = { approve: 'blog-publish', reject: 'blog-reject', regenerate: 'blog-regenerate' };
const DONE = {
  approve: ['Approved', 'Your post is being published. It should be live on the site in about a minute, and you will get a confirmation email with the link.'],
  reject: ['Rejected', 'The draft was discarded and the topic will not be used again.'],
  regenerate: ['Writing a new draft', 'A fresh draft on the same topic is being written. You will get a new proof email in a couple of minutes.'],
};

async function handleAct(url, env) {
  const p = await verify(url.searchParams.get('t'), env.APPROVAL_SECRET);
  if (!p || !EVENTS[p.a]) return page('Link not valid', '<h1>This link is not valid or has expired</h1><p class="hint">Links work once and expire after 7 days. Ask for a new proof email by running the blog workflow again.</p>', 400);
  if (await used(env, p.nonce)) return page('Already used', `<h1>This link was already used</h1><p class="hint">Each button works once. If you need to change something, use the Edit button in the email.</p>`, 409);
  await burn(env, p.nonce);
  const res = await dispatch(env, EVENTS[p.a], p.s);
  if (!res.ok) { await env.NONCES.delete(`n:${p.nonce}`); return page('Something went wrong', `<h1>That did not go through</h1><p class="err">GitHub answered ${res.status}. Press the button again in a moment.</p>`, 502); }
  const [h, msg] = DONE[p.a];
  return page(h, `<h1>${esc(h)}</h1><p>${esc(msg)}</p><p class="hint">Post: ${esc(p.s)}</p>`);
}

const editor = (d, session, note = '') => {
  const choices = [d.hero, ...(d.choices || [])].filter(Boolean);
  const seen = new Set(); const uniq = choices.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));
  const faq = [...(d.faq || [])]; while (faq.length < 5) faq.push({ q: '', a: '' });
  return page(`Edit: ${d.title}`, `<h1>Edit draft</h1><p class="hint">${esc(d.slug)} · Markdown is fine. Keep <code>{{img:0}}</code> and <code>{{img:1}}</code> where you want the inline photos.</p>${note}
<form method="post" action="/save"><input type="hidden" name="session" value="${esc(session)}">
<label>Title</label><input type="text" name="title" maxlength="80" value="${esc(d.title)}">
<label>Meta description <span class="hint">(about 130 to 155 characters)</span></label><input type="text" name="description" maxlength="200" value="${esc(d.description)}">
${uniq.length ? `<label>Hero photo</label><div class="photos">${uniq.map((c) => `<label><input type="radio" name="hero" value="${esc(c.id)}" ${d.hero && d.hero.id === c.id ? 'checked' : ''} hidden><img src="${esc(c.url)}" alt="${esc(c.alt)}" loading="lazy"></label>`).join('')}</div><p class="hint">Tap a photo to choose it as the hero.</p>` : ''}
<label>Body</label><textarea name="body">${esc(d.body)}</textarea>
<label>FAQ</label><div class="faq">${faq.slice(0, 5).map((f, i) => `<input type="text" name="q${i}" placeholder="Question ${i + 1}" value="${esc(f.q)}"><input type="text" name="a${i}" placeholder="Answer ${i + 1}" value="${esc(f.a)}">`).join('')}</div>
<p><button class="btn d" name="act" value="draft">Save draft</button><button class="btn g" name="act" value="publish">Save &amp; publish</button></p></form>`);
};

async function handleEdit(url, env) {
  const p = await verify(url.searchParams.get('t'), env.APPROVAL_SECRET);
  if (!p || p.a !== 'edit') return page('Link not valid', '<h1>This link is not valid or has expired</h1>', 400);
  if (await used(env, p.nonce)) return page('Already used', '<h1>This edit link was already opened</h1><p class="hint">Edit links work once. Use the browser tab you already have open, or ask for a new proof email.</p>', 409);
  await burn(env, p.nonce);
  const got = await getDraft(env, p.s);
  if (!got) return page('Draft not found', '<h1>That draft is gone</h1><p class="hint">It may already be published or rejected.</p>', 404);
  const session = await sign({ s: p.s, a: 'session' }, env.APPROVAL_SECRET, 2 * 3600);
  return editor(got.draft, session);
}

async function handleSave(request, env) {
  const f = await request.formData();
  const p = await verify(f.get('session'), env.APPROVAL_SECRET);
  if (!p || p.a !== 'session') return page('Session expired', '<h1>This editing session expired</h1><p class="hint">Sessions last 2 hours. Open the Edit button in a proof email again.</p>', 400);
  if (await used(env, p.nonce)) return page('Already published', '<h1>This session already published the post</h1>', 409);
  const got = await getDraft(env, p.s);
  if (!got) return page('Draft not found', '<h1>That draft is gone</h1>', 404);
  const d = got.draft;
  const clean = (s, max) => String(s ?? '').replace(/<\s*script/gi, '&lt;script').slice(0, max);
  d.title = clean(f.get('title'), 120).trim() || d.title;
  d.description = clean(f.get('description'), 250).trim() || d.description;
  d.body = clean(f.get('body'), 60000).replace(/\r\n/g, '\n').trim() || d.body;
  const faq = []; for (let i = 0; i < 5; i++) { const q = clean(f.get(`q${i}`), 300).trim(), a = clean(f.get(`a${i}`), 800).trim(); if (q && a) faq.push({ q, a }); }
  if (faq.length) d.faq = faq;
  const pick = f.get('hero');
  if (pick) { const all = [d.hero, ...(d.choices || [])].filter(Boolean); const c = all.find((x) => String(x.id) === String(pick)); if (c) d.hero = c; }
  d.edited = true;
  await putDraft(env, p.s, d, got.sha);
  if (f.get('act') === 'publish') {
    await burn(env, p.nonce);
    const res = await dispatch(env, 'blog-publish', p.s);
    if (!res.ok) { await env.NONCES.delete(`n:${p.nonce}`); return editor(d, f.get('session'), `<p class="err">Saved, but publishing did not start (GitHub answered ${res.status}). Press Save &amp; publish again.</p>`); }
    return page('Published', `<h1>Saved and approved</h1><p>Your edited post is being published. It should be live in about a minute, and you will get a confirmation email.</p>`);
  }
  return editor(d, f.get('session'), '<p class="ok">Draft saved. It has not been published.</p>');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/act' && request.method === 'GET') return await handleAct(url, env);
      if (url.pathname === '/edit' && request.method === 'GET') return await handleEdit(url, env);
      if (url.pathname === '/save' && request.method === 'POST') return await handleSave(request, env);
      if (url.pathname === '/') return page('The 615 Agent blog approvals', '<h1>The 615 Agent blog approvals</h1><p class="hint">Nothing to see here. Use the buttons in the proof email.</p>');
      return page('Not found', '<h1>Not found</h1>', 404);
    } catch (e) {
      return page('Error', `<h1>Something went wrong</h1><p class="err">${esc(e.message)}</p>`, 500);
    }
  },
};
