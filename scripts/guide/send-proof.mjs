// Emails you ONE proof for the whole Franklin guide: a card per page with a preview link, a Realtor-rules check result,
// and a signed APPROVE FOR GOOGLE button, plus APPROVE ALL. Needs a built site (dist/).
//   node scripts/guide/send-proof.mjs            (add --preview to write guide-proof-preview.html instead of sending)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { signToken } from '../blog/sign.mjs';
import { sendEmail } from '../blog/email.mjs';
import { complianceIssues, CHECKLIST } from '../blog/compliance.mjs';
import { esc, SITE } from '../blog/lib.mjs';

import { enabledCities } from '../../src/data/guide-cities.ts';
import { pagesFor } from '../../src/data/guide-pages.ts';
const approved = existsSync('src/data/guide-approved') ? readdirSync('src/data/guide-approved').filter((f) => f.endsWith('.txt')).map((f) => f.slice(0, -4)) : [];
const all = enabledCities.flatMap((c) => [
  { key: `${c.slug}__index`, city: c.name, label: `${c.name} guide home (hub)`, path: `/${c.slug}` },
  ...pagesFor(c.slug).map((p) => ({ key: `${c.slug}__${p.slug}`, city: c.name, label: `${c.name}: ${p.label}`, path: `/${c.slug}/${p.slug}` })),
]);
const secret = process.env.APPROVAL_SECRET, worker = (process.env.WORKER_URL || '').replace(/\/$/, ''), to = process.env.APPROVAL_EMAIL || 'scott@hivenashville.com';
const preview = process.argv.includes('--preview') || !secret || !worker;
const link = (key) => (preview ? '#' : `${worker}/act?t=${signToken({ s: key, a: 'guide' }, secret)}`);
const strip = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const btn = (href, label, bg) => `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#fff;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 20px;margin:4px 6px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px">${esc(label)}</a>`;

const cards = all.map((p) => {
  const file = `dist${p.path}/index.html`;
  if (!existsSync(file)) return { p, missing: true };
  const html = readFileSync(file, 'utf8');
  const main = (html.match(/<main[\s\S]*<\/main>/) || [html])[0];
  const text = strip(main);
  const title = (html.match(/<title>([^<]*)/) || [])[1] || p.label;
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const answer = strip((main.match(/<p class="answer"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '');
  const issues = complianceIssues({ title, description: desc, body: text, faq: [] });
  return { p, title, desc, answer, words: text.split(' ').length, issues, done: approved.includes(p.key) };
});
const clean = cards.filter((c) => !c.missing && !c.issues.hard.length);
const row = (c) => {
  if (c.missing) return `<div style="border:1px solid #D4D9DF;border-radius:12px;padding:14px;margin:0 0 12px;color:#9A2A12">${esc(c.p.label)}: page not found in the build.</div>`;
  const bad = c.issues.hard.length > 0;
  return `<div style="border:1px solid #D4D9DF;border-top:4px solid ${bad ? '#F2593A' : c.done ? '#0E9F8E' : '#1473E6'};border-radius:12px;padding:14px 16px;margin:0 0 14px">
  <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#4F5966;font-weight:bold">${esc(c.p.label)} ${c.done ? '· <span style="color:#0E9F8E">already approved</span>' : ''}</div>
  <div style="font-size:17px;font-weight:bold;margin:2px 0 4px">${esc(c.title)}</div>
  <div style="font-size:13px;color:#4F5966;margin:0 0 6px">${esc(c.desc)}</div>
  ${c.answer ? `<div style="font-size:14px;line-height:1.55;margin:6px 0 8px;color:#0A0A0A"><i>Opening answer:</i> ${esc(c.answer)}</div>` : ''}
  <div style="font-size:12px;color:#4F5966;margin:0 0 6px">${c.words} words · <a href="${SITE}${c.p.path}" style="color:#1473E6">Open the page</a> (hidden from Google until you approve)</div>
  ${bad ? `<div style="background:#FDE2DC;color:#8A1F0B;border-radius:8px;padding:8px 10px;font-size:13px;margin:6px 0">Did not pass the Realtor-rules checks, so there is no Approve button:<br>${c.issues.hard.map(esc).join('<br>')}</div>` : '<div style="font-size:12px;color:#066356;margin:0 0 6px"><b>Realtor-rules check: passed</b></div>'}
  ${c.issues.soft.length ? `<div style="background:#FFF3C4;color:#6B5200;border-radius:8px;padding:8px 10px;font-size:13px;margin:6px 0"><b>Please look at:</b><br>${c.issues.soft.map(esc).join('<br>')}</div>` : ''}
  ${bad || c.done ? '' : btn(link(c.p.key), 'APPROVE FOR GOOGLE', '#0E9F8E')}
</div>`;
};
const html = `<!doctype html><html><body style="margin:0;background:#EEF0F2;font-family:Arial,Helvetica,sans-serif;color:#0A0A0A">
<div style="max-width:680px;margin:0 auto;padding:18px">
 <div style="background:#0A0A0A;border-top:4px solid #1473E6;border-radius:14px 14px 0 0;padding:22px 18px;text-align:center"><img src="${SITE}/img/email/logo-615-agent.png" alt="The 615 Agent" width="170" style="display:block;margin:0 auto 12px;width:170px;max-width:100%;height:auto"><div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#FFC20E;font-weight:bold">Franklin Real Estate Guide for your approval</div></div>
 <div style="background:#fff;padding:22px;border-radius:0 0 14px 14px">
  <p style="margin:0 0 12px;font-size:15px;line-height:1.55">Read each page first (the links open the live pages, which are hidden from Google). Pressing <b>APPROVE FOR GOOGLE</b> lets Google index that page and adds it to the sitemap. Nothing is indexed until you press a button. Each button works once and expires in 7 days.</p>
  ${enabledCities.map((ct) => { const n = clean.filter((c) => !c.done && c.p.key.startsWith(ct.slug + '__')).length; return n > 1 ? `<div style="margin:0 0 12px">${btn(link(ct.slug + '__all'), 'APPROVE ALL ' + ct.name.toUpperCase() + ' PAGES THAT PASSED', '#1473E6')}</div>` : ''; }).join('')}
  <div style="font-size:12px;color:#4F5966;margin:0 0 16px">The approve-all buttons approve every page that passed, including any you have not read. Use the individual buttons if you want to hold some back.</div>
  ${cards.map(row).join('')}
  <div style="background:#EEF0F2;border-radius:10px;padding:12px 14px;font-size:13px;color:#4F5966;margin:6px 0 0"><b>Realtor-rules checklist every page was checked against:</b><ul style="margin:6px 0 0;padding-left:18px">${CHECKLIST.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div style="margin-top:6px">These checks are a safety net, not legal advice. You are the final reviewer. Numbers on these pages come from Redfin, the Census Bureau, the Freddie Mac rate series and the City of Franklin, each with its source and date on the page.</div></div>
 </div></div></body></html>`;
if (preview) { writeFileSync('guide-proof-preview.html', html); console.log('Wrote guide-proof-preview.html (no email sent).'); process.exit(process.argv.includes('--preview') ? 0 : 1); }
await sendEmail({ to, subject: 'Franklin Real Estate Guide: pages for your approval', html });
console.log(`Guide proof email sent to ${to} (${cards.length} pages).`);
