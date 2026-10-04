// Monthly market commentary: 2-3 plain sentences per city, written by Claude from the data files ONLY.
// Safety rules built in:
//  - Claude is given a fixed list of facts and told to use no outside information.
//  - Every number in its answer must appear in those facts, or the sentence set is rejected (one retry), then omitted.
// Needs ANTHROPIC_API_KEY. Updates cities[slug].commentary in public/data/market.json.
import { readFileSync, writeFileSync } from 'node:fs';

const MARKET = 'public/data/market.json';
const HISTORY = 'public/data/market-history.json';
const MODEL = process.env.COMMENTARY_MODEL || 'claude-sonnet-5-5';
const key = process.env.ANTHROPIC_API_KEY;
const log = (...a) => console.log(...a);
if (!key) { log('No ANTHROPIC_API_KEY, skipping commentary.'); process.exit(0); }

const market = JSON.parse(readFileSync(MARKET, 'utf8'));
let history = { cities: {} };
try { history = JSON.parse(readFileSync(HISTORY, 'utf8')); } catch {}
if (market.sample) { log('Market data is still sample data, skipping commentary.'); process.exit(0); }

const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
const label = (m) => (m < 4 ? "a seller's market" : m <= 6 ? 'a balanced market' : "a buyer's market");
const pctChange = (a, b) => (a != null && b != null && b !== 0 ? ((a - b) / b) * 100 : null);

function factsFor(slug, c) {
  const f = [];
  const place = c.geography ? `${c.name} (county-level data for ${c.geography})` : c.name;
  f.push(`Place: ${place}. Data as of ${longDate(c.asOf || market.asOf)}.`);
  f.push(`Months of supply: ${c.monthsSupply.toFixed(1)}, which is ${label(c.monthsSupply)} (under 4 months favors sellers, 4 to 6 is balanced, over 6 favors buyers).`);
  if (c.medianPrice != null) f.push(`Median sale price: ${money(c.medianPrice)}.`);
  if (c.yoy != null) f.push(`Median sale price changed ${c.yoy > 0 ? 'up' : c.yoy < 0 ? 'down' : 'by'} ${Math.abs(c.yoy).toFixed(1)}% compared with a year earlier.`);
  if (c.dom != null) f.push(`Median days on market: ${c.dom}.`);
  if (c.saleToList != null) f.push(`Average sale-to-list price ratio: ${c.saleToList.toFixed(1)}%.`);
  if (c.inventory != null) f.push(`Active listings: ${c.inventory.toLocaleString('en-US')}.`);
  const months = history.cities?.[slug]?.months || [];
  const at = (n) => months[months.length - 1 - n];
  const now = at(0), q = at(3), y = at(12);
  if (now && q && q.ms != null && now.ms != null) f.push(`Months of supply three months earlier: ${q.ms.toFixed(1)}.`);
  if (now && y && y.ms != null && now.ms != null) f.push(`Months of supply a year earlier: ${y.ms.toFixed(1)}.`);
  if (now && y) {
    const inv = pctChange(now.inv, y.inv);
    if (inv != null) f.push(`Active listings are ${inv >= 0 ? 'up' : 'down'} ${Math.abs(inv).toFixed(0)}% from a year earlier.`);
    if (now.dom != null && y.dom != null) f.push(`Median days on market a year earlier: ${y.dom}.`);
  }
  return f;
}

const numbersIn = (s) => (s.match(/\d[\d,]*\.?\d*/g) || []).map((n) => n.replace(/,/g, '').replace(/\.$/, ''));
function valid(text, facts) {
  const allowed = new Set(numbersIn(facts.join(' ')));
  // allow the numbers "4" and "6" from the stated thresholds, which are in the facts already
  return numbersIn(text).every((n) => allowed.has(n) || allowed.has(String(Number(n))));
}

async function ask(slug, c, facts, attempt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 400, temperature: 0.2,
      system: [
        'You write short housing-market summaries for a real estate agent\'s website.',
        'Use ONLY the facts provided. Do not add any outside information, forecasts, advice, or statistics.',
        'Write 2 to 3 plain sentences, under 70 words total, in a calm, neutral tone.',
        'Do not describe people, neighborhoods, schools, crime, or who should or should not live somewhere. No fair-housing-sensitive language.',
        'Do not tell the reader to buy or sell. Do not use hype, exclamation marks, or the words "hot" or "crash".',
        'Every number you use must appear exactly in the facts. Say "as of" the date given. Return only the summary text.',
      ].join(' '),
      messages: [{ role: 'user', content: `Facts for ${c.name}:\n- ${facts.join('\n- ')}${attempt > 0 ? '\n\nYour previous answer used a number that was not in the facts. Use only numbers from the facts.' : ''}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API returned HTTP ${res.status}`);
  const j = await res.json();
  return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

let made = 0;
for (const [slug, c] of Object.entries(market.cities)) {
  const facts = factsFor(slug, c);
  let text = null;
  for (let attempt = 0; attempt < 2 && !text; attempt++) {
    try {
      const out = await ask(slug, c, facts, attempt);
      if (out && valid(out, facts)) text = out; else log(`  ${c.name}: attempt ${attempt + 1} rejected (missing text or a number not in the facts)`);
    } catch (e) { log(`  ${c.name}: ${e.message}`); break; }
  }
  if (text) { c.commentary = text; made++; } else { delete c.commentary; }
}
market.commentaryGenerated = new Date().toISOString().slice(0, 10);
market.commentaryModel = MODEL;
writeFileSync(MARKET, JSON.stringify(market, null, 2) + '\n');
log(`Commentary written for ${made} of ${Object.keys(market.cities).length} cities.`);
