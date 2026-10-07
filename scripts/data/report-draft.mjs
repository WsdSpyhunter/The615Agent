// Creates the monthly market report as a DRAFT in Buttondown. Nothing is sent: you review and send it yourself.
// Built only from public/data/market.json (numbers and commentary), so every figure is sourced and dated.
// Needs BUTTONDOWN_API_KEY.
import { readFileSync } from 'node:fs';

const key = process.env.BUTTONDOWN_API_KEY;
const PREVIEW = process.argv.includes('--preview');
const log = (...a) => console.log(...a);
if (!key && !PREVIEW) { log('No BUTTONDOWN_API_KEY, skipping the report draft.'); process.exit(0); }

const m = JSON.parse(readFileSync('public/data/market.json', 'utf8'));
if (m.sample) { log('Market data is still sample data, skipping the report draft.'); process.exit(0); }

const SITE = 'https://the615agent.com';
const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const monthYear = new Date(m.asOf + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
const money = (v) => (v == null ? 'n/a' : '$' + Math.round(v).toLocaleString('en-US'));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const label = (x) => (x < 4 ? "Seller's market" : x <= 6 ? 'Balanced market' : "Buyer's market");
const rating = (c) => (c.temperature ? `${c.temperature.label}${c.temperature.tilt ? ` (slightly toward ${c.temperature.tilt})` : ''}` : label(c.monthsSupply));


// ---- Branding blocks. Inline styles only, images on the live site, no indentation or blank lines (markdown would break them).
const IMG = `${SITE}/img/email`;
const BLUE = '#1473E6', GOLD = '#FFC20E', BLACK = '#0A0A0A';
const header = `<div style="background:${BLACK};border-top:4px solid ${BLUE};border-radius:14px;padding:34px 18px 32px;text-align:center;margin:0 0 22px">
<img src="${IMG}/logo-615-agent.png" alt="The 615 Agent" width="240" style="display:block;margin:0 auto;width:240px;max-width:100%;height:auto">
<div style="margin-top:30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:2px;color:${GOLD};font-weight:bold">MONTHLY MARKET REPORT &middot; ${monthYear.toUpperCase()}</div>
<div style="margin-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#C4CCD6">Franklin &middot; Brentwood &middot; Spring Hill &middot; Thompson's Station &middot; Nolensville &middot; Columbia &middot; Murfreesboro &middot; Nashville</div>
</div>`;
const greeting = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;width:100%"><tr>
<td width="96" valign="middle" style="width:96px;min-width:96px;padding:0 14px 0 0;vertical-align:middle"><img src="${IMG}/headshot.jpg" alt="Scott Davis" width="76" height="76" style="display:block;width:76px;min-width:76px;max-width:76px;height:76px;min-height:76px;max-height:76px;object-fit:cover;border-radius:50%;border:3px solid ${BLUE}"></td>
<td valign="middle" style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;color:#222"><strong>Hi, it's Scott.</strong><br>Here is your monthly look at the Williamson County and Middle Tennessee market.</td>
</tr></table>`;
const websiteCta = `<div style="background:#EEF0F2;border-radius:14px;padding:22px 18px;text-align:center;margin:26px 0 0;font-family:Arial,Helvetica,sans-serif">
<div style="font-size:18px;font-weight:bold;color:${BLACK}">Explore more at The615Agent.com</div>
<div style="font-size:14px;color:#4F5966;margin:8px 0 16px;line-height:1.5">Live market data for every city, a mortgage calculator, free buyer and seller checklists, and local guides on the blog.</div>
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto"><tr><td bgcolor="${BLUE}" style="background:${BLUE};border-radius:999px;padding:0"><a href="${SITE}" style="display:inline-block;background:${BLUE};color:#ffffff !important;text-decoration:none;font-weight:bold;font-size:15px;border-radius:999px;padding:13px 28px"><span style="color:#ffffff !important">Visit The615Agent.com &rarr;</span></a></td></tr></table>
</div>`;
const signature = `<div style="background:${BLACK};border-radius:14px;padding:24px 18px;text-align:center;margin:26px 0 0;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
<img src="${IMG}/headshot.jpg" alt="Scott Davis" width="96" height="96" style="display:block;margin:0 auto 12px;width:96px;min-width:96px;max-width:96px;height:96px;min-height:96px;max-height:96px;object-fit:cover;border-radius:50%;border:4px solid ${BLUE}">
<div style="font-size:18px;font-weight:bold;color:#ffffff">Scott Davis, REALTOR&reg;</div>
<div style="font-size:13px;color:#C4CCD6;margin-top:4px">The 615 Agent &middot; Hive Nashville &middot; TN License #369664</div>
<div style="font-size:14px;margin-top:10px"><a href="tel:+16153264055" style="color:#7DB4F5 !important;text-decoration:none"><span style="color:#7DB4F5 !important">(615) 326-4055</span></a> &middot; <a href="mailto:scott@hivenashville.com" style="color:#7DB4F5 !important;text-decoration:none"><span style="color:#7DB4F5 !important">scott@hivenashville.com</span></a></div>
<div style="font-size:14px;margin-top:6px"><a href="${SITE}" style="color:${GOLD} !important;text-decoration:none;font-weight:bold"><span style="color:${GOLD} !important">The615Agent.com</span></a></div>
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:22px auto 0;width:100%;max-width:420px"><tr>
<td align="center" valign="bottom" style="width:50%;padding:0 14px;vertical-align:bottom"><img src="${IMG}/logo-615-agent.png" alt="The 615 Agent" width="150" style="display:block;margin:0 auto;width:150px;max-width:100%;height:auto"></td>
<td align="center" valign="bottom" style="width:50%;padding:0 14px;vertical-align:bottom"><img src="${IMG}/hive-nashville.png" alt="Hive Nashville" width="150" style="display:block;margin:0 auto;width:150px;max-width:100%;height:auto"></td>
</tr></table>
</div>`;

const subject = `${monthYear} housing market report: Franklin, Brentwood, Spring Hill and more`;

const SPACER = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="8" style="height:8px;line-height:8px;font-size:1px;padding:0">&nbsp;</td></tr></table>';

const sections = Object.values(m.cities).map((c) => {
  const lines = [
    SPACER,
    '',
    `### ${c.name}: ${rating(c)}`,
    c.temperature ? `*${c.temperature.readings.map((r) => `${r.title.split(':')[0]}: ${r.reading}`).join(' | ')}${c.temperature.trend ? ` | Trend: ${c.temperature.trend.direction}` : ''}${c.temperature.mixed ? ' | The sources disagree' : ''}*` : '',
    c.commentary ? c.commentary : '',
    '',
    `- Median sale price: ${money(c.medianPrice)}${c.yoy != null ? ` (${c.yoy > 0 ? '+' : ''}${c.yoy.toFixed(1)}% vs. a year earlier)` : ''}`,
    c.dom != null ? `- Median days on market: ${c.dom}` : null,
    c.saleToList != null ? `- Average sale-to-list ratio: ${c.saleToList.toFixed(1)}%` : null,
    c.inventory != null ? `- Active listings: ${c.inventory.toLocaleString('en-US')}` : null,
    c.geography ? `- Based on ${c.geography} data` : null,
  ].filter((x) => x !== null);
  return lines.join('\n');
});

const body = [
  header,
  greeting,
  `Here is where the market stands along the I-65 corridor and in greater Nashville, based on data through ${longDate(m.asOf)}.`,
  m.mortgageRate30 != null ? `The average 30-year fixed mortgage rate was **${m.mortgageRate30.toFixed(2)}%** (week of ${longDate(m.mortgageRateAsOf)}).` : '',
  `**How to read it:** each rating blends Zillow's Market Temperature Index, Redfin's months of supply and Realtor.com's county data. ${m.temperatureMethod ?? ''}`,
  ...sections,
  `Want to know what this means for your plans? [Get matched with homes](${SITE}/buy) or [find out what your home is worth](${SITE}/sell). Or just reply to this email.`,
  websiteCta,
  signature,
  `Sources: ${m.sources.map((s) => (typeof s === 'string' ? s : `[${s.name}](${s.url})${s.note ? ` (${s.note})` : ''}`)).join('; ')}. Conditions vary by neighborhood, price range and home type. This is general information, not legal, tax, lending or financial advice.`,
  `Equal Housing Opportunity. Scott Davis is a licensed Tennessee REALTOR&reg; (License #369664) with Hive Nashville.`,
].filter(Boolean).join('\n\n');

if (PREVIEW) {
  // Local look at the email without sending anything: node scripts/data/report-draft.mjs --preview  (writes the file named in PREVIEW_OUT)
  const { marked } = await import('marked');
  const { writeFileSync } = await import('node:fs');
  const out = process.env.PREVIEW_OUT || 'newsletter-preview.html';
  writeFileSync(out, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#e9ecef"><div style="max-width:620px;margin:0 auto;background:#fff;padding:24px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#222"><h2 style="margin:0 0 14px">${subject}</h2>${marked.parse(body)}</div></body>`);
  log(`Preview written to ${out}`);
  process.exit(0);
}

const api = 'https://api.buttondown.com/v1/emails';
const headers = { Authorization: `Token ${key}`, 'Content-Type': 'application/json' };

// If a draft for this month already exists, update its body in place (so design changes reach it). Nothing is ever sent.
const existing = await fetch(`${api}?status=draft`, { headers });
if (existing.ok) {
  const j = await existing.json();
  const found = (j.results || []).find((e) => e.subject === subject);
  if (found) {
    const up = await fetch(`${api}/${found.id}`, { method: 'PATCH', headers, body: JSON.stringify({ body }) });
    const t = (await up.text()).slice(0, 300).replace(/[A-Za-z0-9-]{30,}/g, '[hidden]');
    if (!up.ok) { log(`Could not update the existing draft (HTTP ${up.status}): ${t}`); process.exit(1); }
    log(`Updated the existing draft "${subject}".`); process.exit(0);
  }
} else {
  log(`Could not list existing drafts (HTTP ${existing.status}). Continuing.`);
}

const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ subject, body, status: 'draft' }) });
const text = (await res.text()).slice(0, 400).replace(/[A-Za-z0-9-]{30,}/g, '[hidden]');
if (!res.ok) { log(`Buttondown returned HTTP ${res.status}: ${text}`); process.exit(1); }
log(`Draft created in Buttondown: "${subject}"`);
