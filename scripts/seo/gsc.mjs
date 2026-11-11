// Read-only Google Search Console access through a service account. The key file stays OUTSIDE the project (never commit it).
//   node scripts/seo/gsc.mjs sites
//   node scripts/seo/gsc.mjs query <siteUrl> <startDate> <endDate> <dimension: query|page|date|country|device> [rowLimit]
//   node scripts/seo/gsc.mjs sitemaps <siteUrl>
//   node scripts/seo/gsc.mjs inspect <siteUrl> <pageUrl>
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { homedir } from 'node:os';
const KEY = JSON.parse(readFileSync(process.env.GSC_KEY || `${homedir()}/.config/the615agent/gsc-key.json`, 'utf8'));
const b64 = (x) => Buffer.from(x).toString('base64url');
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64(JSON.stringify({ iss: KEY.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(KEY.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${body}.${sig}` }) });
  const j = await r.json(); if (!j.access_token) throw new Error('Token error: ' + JSON.stringify(j)); return j.access_token;
}
const api = async (url, opt = {}) => { const r = await fetch(url, { ...opt, headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' } }); const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); };
const [cmd, site, a, b, dim = 'query', lim = '50'] = process.argv.slice(2);
const enc = encodeURIComponent;
if (cmd === 'sites') console.log(JSON.stringify(await api('https://www.googleapis.com/webmasters/v3/sites'), null, 2));
else if (cmd === 'query') { const j = await api(`https://www.googleapis.com/webmasters/v3/sites/${enc(site)}/searchAnalytics/query`, { method: 'POST', body: JSON.stringify({ startDate: a, endDate: b, dimensions: dim === 'none' ? [] : dim.split(','), rowLimit: +lim, dataState: 'all' }) }); console.log(JSON.stringify(j.rows ?? [], null, 1)); }
else if (cmd === 'sitemaps') console.log(JSON.stringify(await api(`https://www.googleapis.com/webmasters/v3/sites/${enc(site)}/sitemaps`), null, 2));
else if (cmd === 'inspect') console.log(JSON.stringify(await api('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { method: 'POST', body: JSON.stringify({ inspectionUrl: a, siteUrl: site }) }), null, 2));
else console.log('Commands: sites | query | sitemaps | inspect');
