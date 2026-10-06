import { marked } from 'marked';
import { esc, SITE } from './lib.mjs';
import { CHECKLIST, complianceIssues } from './compliance.mjs';

const figure = (img, i) => `<figure style="margin:22px 0"><img src="${esc(img.url)}" alt="${esc(img.alt)}" style="width:100%;border-radius:12px;display:block"><figcaption style="font-size:12px;color:#6b7480;margin-top:6px">Photo by <a href="${esc(img.creditUrl)}" style="color:#1473E6">${esc(img.credit)}</a> on <a href="${esc(img.home || '#')}" style="color:#1473E6">${esc(img.provider || 'stock')}</a></figcaption></figure>`;

/** The post body as HTML: inline image markers become photos. */
export function bodyHtml(draft) {
  const md = draft.body.replace(/\{\{img:(\d)\}\}/g, (all, n) => `\n\n<!--IMG${n}-->\n\n`);
  let html = marked.parse(md, { gfm: true, breaks: false });
  html = html.replace(/<!--IMG(\d)-->/g, (all, n) => (draft.inline[+n] ? figure(draft.inline[+n]) : ''));
  return html.replace(/href="\//g, `href="${SITE}/`);
}

const btn = (href, label, bg, fg = '#fff') => `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:${fg};font-weight:700;text-decoration:none;border-radius:999px;padding:13px 24px;margin:4px 6px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px">${esc(label)}</a>`;

export function approvalEmail(draft, links) {
  const c = draft.checks || {};
  const warn = [];
  if (c.dropped?.length) warn.push(`${c.dropped.length} link(s) failed the check and were removed: ${c.dropped.map((d) => d.id).join(', ')}.`);
  if (!draft.hero) warn.push('No photos were added (no photo key or no match).');
  if (c.review && !c.review.ok) warn.push(`Compliance reviewer notes: ${c.review.issues.join(' ')}`);
  const live = complianceIssues(draft);
  const blocked = !!c.failedChecks || live.hard.length > 0 || (c.review && c.review.ok === false);
  const soft = [...new Set([...(c.compliance?.soft || []), ...live.soft])];
  const buttons = (blocked ? '' : btn(links.approve, 'APPROVE & PUBLISH', '#0E9F8E')) + btn(links.edit, 'EDIT', '#1473E6') + btn(links.regenerate, 'REGENERATE', '#4F5966') + btn(links.reject, 'REJECT', '#F2593A');
  return `<!doctype html><html><body style="margin:0;background:#EEF0F2;font-family:Arial,Helvetica,sans-serif;color:#0A0A0A">
<div style="max-width:680px;margin:0 auto;padding:18px">
 <div style="background:#0A0A0A;color:#fff;border-radius:14px 14px 0 0;padding:16px 22px;font-size:13px;letter-spacing:.08em;text-transform:uppercase">The 615 Agent · blog draft for your approval</div>
 <div style="background:#fff;padding:22px;border-radius:0 0 14px 14px">
  <p style="margin:0 0 6px;color:#4F5966;font-size:13px">${esc(draft.category)} · keyword: ${esc(draft.keyword)} · ${draft.checks?.words ?? ''} words · will publish at /blog/${esc(draft.slug)}</p>
  <div style="margin:10px 0 16px">${buttons}</div>
  ${blocked ? `<div style="background:#FDE2DC;color:#8A1F0B;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px"><b>This draft did not pass the Realtor-rules checks, so there is no Approve button.</b> Use EDIT to fix it or REGENERATE for a new draft.<br>${[...live.hard, ...(c.review && !c.review.ok ? c.review.issues : [])].map(esc).join('<br>')}</div>` : ''}
  ${soft.length ? `<div style="background:#FFF3C4;color:#6B5200;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px"><b>Please look at:</b><br>${soft.map(esc).join('<br>')}</div>` : ''}
  ${warn.length ? `<div style="background:#FFF3C4;color:#6B5200;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px"><b>Check before you publish:</b><br>${warn.map(esc).join('<br>')}</div>` : ''}
  ${draft.hero ? `<img src="${esc(draft.hero.url)}" alt="${esc(draft.hero.alt)}" style="width:100%;border-radius:12px;display:block"><div style="font-size:12px;color:#6b7480;margin:6px 0 14px">Photo by ${esc(draft.hero.credit)} on ${esc(draft.hero.provider || 'stock')}</div>` : ''}
  <h1 style="font-size:26px;line-height:1.2;margin:8px 0 6px">${esc(draft.title)}</h1>
  <p style="color:#4F5966;font-size:14px;margin:0 0 14px"><i>Meta description:</i> ${esc(draft.description)}</p>
  <div style="font-size:16px;line-height:1.65">${bodyHtml(draft)}</div>
  <h2 style="font-size:20px;margin-top:26px">Frequently asked questions</h2>
  ${draft.faq.map((f) => `<p style="margin:0 0 4px"><b>${esc(f.q)}</b></p><p style="margin:0 0 12px;color:#4F5966">${esc(f.a)}</p>`).join('')}
  <hr style="border:0;border-top:1px solid #D4D9DF;margin:22px 0">
  <p style="font-size:13px;color:#4F5966;margin:0 0 10px"><b>Data points used:</b> ${esc((draft.checks?.dataPointsUsed || []).join(' | ') || 'none listed')}</p>
  <p style="font-size:13px;color:#4F5966;margin:0 0 14px"><b>Links verified (HTTP 200):</b> ${esc((c.linksChecked || []).filter((l) => l.status === 200).map((l) => l.url.replace(/^https?:\/\//, '')).join(', ') || 'none')}</p>
  <div style="background:#EEF0F2;border-radius:10px;padding:12px 14px;font-size:13px;color:#4F5966;margin:0 0 14px"><b>Realtor-rules checklist this post was checked against${blocked ? '' : ' (all passed)'}:</b><ul style="margin:6px 0 0;padding-left:18px">${CHECKLIST.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div style="margin-top:6px">These checks are a safety net, not legal advice. You are the final reviewer.</div></div>
  <div>${buttons}</div>
  <p style="font-size:12px;color:#8B95A3;margin:14px 0 0">Each button works once and expires in 7 days. Nothing publishes until you press Approve.</p>
 </div></div></body></html>`;
}

export function confirmEmail(title, url) {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0A0A0A;background:#EEF0F2;padding:20px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:14px;padding:24px"><h2 style="margin:0 0 10px">Your post is live</h2><p><b>${esc(title)}</b></p><p><a href="${esc(url)}" style="color:#1473E6">${esc(url)}</a></p><p style="color:#4F5966;font-size:14px">It can take a minute or two for the site to finish updating.</p></div></body></html>`;
}
