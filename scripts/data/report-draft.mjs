// Creates the monthly market report as a DRAFT in Buttondown. Nothing is sent: you review and send it yourself.
// Built only from public/data/market.json (numbers and commentary), so every figure is sourced and dated.
// Needs BUTTONDOWN_API_KEY.
import { readFileSync } from 'node:fs';

const key = process.env.BUTTONDOWN_API_KEY;
const log = (...a) => console.log(...a);
if (!key) { log('No BUTTONDOWN_API_KEY, skipping the report draft.'); process.exit(0); }

const m = JSON.parse(readFileSync('public/data/market.json', 'utf8'));
if (m.sample) { log('Market data is still sample data, skipping the report draft.'); process.exit(0); }

const SITE = 'https://the615agent.com';
const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const monthYear = new Date(m.asOf + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
const money = (v) => (v == null ? 'n/a' : '$' + Math.round(v).toLocaleString('en-US'));
const label = (x) => (x < 4 ? "Seller's market" : x <= 6 ? 'Balanced market' : "Buyer's market");
const rating = (c) => (c.temperature ? `${c.temperature.label}${c.temperature.tilt ? ` (slightly toward ${c.temperature.tilt})` : ''}` : label(c.monthsSupply));

const subject = `${monthYear} housing market report: Franklin, Brentwood, Spring Hill and more`;

const sections = Object.values(m.cities).map((c) => {
  const lines = [
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
  `Here is where the market stands along the I-65 corridor and in greater Nashville, based on data through ${longDate(m.asOf)}.`,
  m.mortgageRate30 != null ? `The average 30-year fixed mortgage rate was **${m.mortgageRate30.toFixed(2)}%** (week of ${longDate(m.mortgageRateAsOf)}).` : '',
  `**How to read it:** each rating blends Zillow's Market Temperature Index, Redfin's months of supply and Realtor.com's county data. ${m.temperatureMethod ?? ''}`,
  ...sections,
  `Want to know what this means for your plans? [Get matched with homes](${SITE}/buy) or [find out what your home is worth](${SITE}/sell). Or just reply to this email.`,
  `---`,
  `Sources: ${m.sources.map((s) => (typeof s === 'string' ? s : `[${s.name}](${s.url})${s.note ? ` (${s.note})` : ''}`)).join('; ')}. Conditions vary by neighborhood, price range and home type. This is general information, not legal, tax, lending or financial advice.`,
  `Scott Davis, REALTOR® | The 615 Agent | Hive Nashville | TN License #369664 | (615) 326-4055 | scott@hivenashville.com`,
  `Equal Housing Opportunity.`,
].filter(Boolean).join('\n\n');

const api = 'https://api.buttondown.com/v1/emails';
const headers = { Authorization: `Token ${key}`, 'Content-Type': 'application/json' };

// Skip if a draft for this month already exists.
const existing = await fetch(`${api}?status=draft`, { headers });
if (existing.ok) {
  const j = await existing.json();
  if ((j.results || []).some((e) => e.subject === subject)) { log(`A draft titled "${subject}" already exists. Nothing to do.`); process.exit(0); }
} else {
  log(`Could not list existing drafts (HTTP ${existing.status}). Continuing.`);
}

const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ subject, body, status: 'draft' }) });
const text = (await res.text()).slice(0, 400).replace(/[A-Za-z0-9-]{30,}/g, '[hidden]');
if (!res.ok) { log(`Buttondown returned HTTP ${res.status}: ${text}`); process.exit(1); }
log(`Draft created in Buttondown: "${subject}"`);
