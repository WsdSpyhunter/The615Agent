import { marked } from 'marked';
import { esc, SITE } from './lib.mjs';
import { CHECKLIST, complianceIssues } from './compliance.mjs';

const figure = (img, i) => `<figure style="margin:22px 0"><img src="${esc(img.url)}" alt="${esc(img.alt)}" style="width:100%;border-radius:12px;display:block"><figcaption style="font-size:12px;color:#6b7480;margin-top:6px">Photo by <a href="${esc(img.creditUrl)}" style="color:#1473E6">${esc(img.credit)}</a> on <a href="${esc(img.home || '#')}" style="color:#1473E6">${esc(img.provider || 'stock')}</a></figcaption></figure>`;

/** The post body as HTML: inline image markers become photos. */
export function bodyHtml(draft) {
  const md = draft.body.replace(/\{\{img:(\d)\}\}/g, (all, n) => `\n\n<!--IMG${n}-->\n\n`);
  let html = marked.parse(md, { gfm: true, breaks: false });
  html = html.replace(/<!--IMG(\d)-->/g, (all, n) => ((draft.inline || [])[+n] ? figure(draft.inline[+n]) : ''));
  return html.replace(/href="\//g, `href="${SITE}/`);
}

const btn = (href, label, bg, fg = '#fff') => `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:${fg};font-weight:700;text-decoration:none;border-radius:999px;padding:13px 24px;margin:4px 6px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px">${esc(label)}</a>`;


/** Email-safe preview of the author card the website adds to the end of every post (so you see the branding while reviewing). */
const authorCardPreview = () => `<div style="margin:26px 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#4F5966;font-weight:bold">How the end of this post will look on your website (added automatically)</div>
<div style="background:#ffffff;border:1px solid #D4D9DF;border-top:5px solid #1473E6;border-radius:18px;padding:20px;text-align:center">
<img src="${SITE}/img/email/headshot.jpg" alt="Scott Davis" width="88" height="88" style="display:block;margin:0 auto 10px;width:88px;height:88px;border-radius:50%;border:4px solid #1473E6">
<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#1473E6;font-weight:bold">About the author</div>
<div style="font-size:19px;font-weight:bold;margin-top:2px">Scott Davis, REALTOR&reg;</div>
<div style="font-size:13px;color:#4F5966;margin:3px 0 8px">The 615 Agent &middot; Hive Nashville &middot; TN License #369664</div>
<div style="font-size:14px;line-height:1.5;margin:0 0 12px">I help people buy, sell, invest and relocate along the I-65 corridor south of Nashville. Questions about anything in this post? Reach out and I will get back to you.</div>
<div style="margin:0 0 14px"><span style="display:inline-block;background:#1473E6;color:#ffffff;font-weight:bold;font-size:13px;border-radius:999px;padding:10px 18px;margin:3px">Contact me</span><span style="display:inline-block;border:1.5px solid #0A0A0A;color:#0A0A0A;font-weight:bold;font-size:13px;border-radius:999px;padding:8px 16px;margin:3px">Get matched with homes</span><span style="display:inline-block;color:#173F8A;font-weight:bold;font-size:13px;margin:3px 6px">(615) 326-4055</span></div>
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;width:100%;max-width:380px;border-top:1px solid #D4D9DF"><tr>
<td align="center" valign="middle" style="padding:14px 8px 0"><span style="display:inline-block;background:#0A0A0A;border-radius:10px;padding:8px 12px"><img src="${SITE}/img/email/logo-615-agent.png" alt="The 615 Agent" width="100" style="display:block;width:100px;height:auto"></span></td>
<td align="center" valign="middle" style="padding:14px 8px 0"><span style="display:inline-block;background:#0A0A0A;border-radius:10px;padding:8px 12px"><img src="${SITE}/img/email/hive-nashville.png" alt="Hive Nashville" width="100" style="display:block;width:100px;height:auto"></span></td>
</tr></table>
</div>`;

export function approvalEmail(draft, links) {
  const c = draft.checks || {};
  const report = draft.kind === 'report';
  const warn = [];
  if (c.dropped?.length) warn.push(`${c.dropped.length} link(s) failed the check and were removed: ${c.dropped.map((d) => d.id).join(', ')}.`);
  if (!draft.hero && !draft.heroLocal) warn.push('No photos were added (no photo key or no match).');
  if (c.review && !c.review.ok) warn.push(`Compliance reviewer notes: ${c.review.issues.join(' ')}`);
  const live = complianceIssues(draft);
  const blocked = !!c.failedChecks || live.hard.length > 0 || (c.review && c.review.ok === false);
  const soft = [...new Set([...(c.compliance?.soft || []), ...live.soft])];
  const buttons = (blocked ? '' : btn(links.approve, report ? 'APPROVE & PUBLISH TO BLOG' : 'APPROVE & PUBLISH', '#0E9F8E')) + btn(links.edit, 'EDIT', '#1473E6') + (report ? '' : btn(links.regenerate, 'REGENERATE', '#4F5966')) + btn(links.reject, 'REJECT', '#F2593A');
  return `<!doctype html><html><body style="margin:0;background:#EEF0F2;font-family:Arial,Helvetica,sans-serif;color:#0A0A0A">
<div style="max-width:680px;margin:0 auto;padding:18px">
 <div style="background:#0A0A0A;border-top:4px solid #1473E6;border-radius:14px 14px 0 0;padding:22px 18px;text-align:center"><img src="${SITE}/img/email/logo-615-agent.png" alt="The 615 Agent" width="170" style="display:block;margin:0 auto 12px;width:170px;max-width:100%;height:auto"><div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#FFC20E;font-weight:bold">${report ? 'Monthly market report' : 'Blog draft'} for your approval</div></div>
 <div style="background:#fff;padding:22px;border-radius:0 0 14px 14px">
  <p style="margin:0 0 6px;color:#4F5966;font-size:13px">${esc(draft.category)} · keyword: ${esc(draft.keyword)} · ${draft.checks?.words ?? ''} words · will publish at /blog/${esc(draft.slug)}${draft.pubDate ? ` · dated ${esc(draft.pubDate)}` : ''}</p>
  <div style="margin:10px 0 16px">${buttons}</div>
  ${blocked ? `<div style="background:#FDE2DC;color:#8A1F0B;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px"><b>This draft did not pass the Realtor-rules checks, so there is no Approve button.</b> Use EDIT to fix it or REGENERATE for a new draft.<br>${[...live.hard, ...(c.review && !c.review.ok ? c.review.issues : [])].map(esc).join('<br>')}</div>` : ''}
  ${soft.length ? `<div style="background:#FFF3C4;color:#6B5200;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px"><b>Please look at:</b><br>${soft.map(esc).join('<br>')}</div>` : ''}
  ${warn.length ? `<div style="background:#FFF3C4;color:#6B5200;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px"><b>Check before you publish:</b><br>${warn.map(esc).join('<br>')}</div>` : ''}
  ${report ? `<div style="background:#E3EEFC;color:#173F8A;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px"><b>About this report:</b> Approving publishes it on your blog (blue Market Update tag). It does <b>not</b> email your subscribers. The newsletter version is a draft in your Buttondown account. Open it there, look it over, and press Send when you are ready.</div>` : ''}
  ${!draft.hero && draft.heroLocal ? `<img src="${esc(SITE + draft.heroLocal.path)}" alt="${esc(draft.heroLocal.alt)}" style="width:100%;border-radius:12px;display:block;margin-bottom:14px">` : ''}
  ${draft.hero ? `<img src="${esc(draft.hero.url)}" alt="${esc(draft.hero.alt)}" style="width:100%;border-radius:12px;display:block"><div style="font-size:12px;color:#6b7480;margin:6px 0 14px">Photo by ${esc(draft.hero.credit)} on ${esc(draft.hero.provider || 'stock')}</div>` : ''}
  <h1 style="font-size:26px;line-height:1.2;margin:8px 0 6px">${esc(draft.title)}</h1>
  <p style="color:#4F5966;font-size:14px;margin:0 0 14px"><i>Meta description:</i> ${esc(draft.description)}</p>
  <div style="font-size:16px;line-height:1.65">${bodyHtml(draft)}</div>
  ${(draft.faq || []).length ? '<h2 style="font-size:20px;margin-top:26px">Frequently asked questions</h2>' : ''}
  ${(draft.faq || []).map((f) => `<p style="margin:0 0 4px"><b>${esc(f.q)}</b></p><p style="margin:0 0 12px;color:#4F5966">${esc(f.a)}</p>`).join('')}
  ${authorCardPreview()}
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
