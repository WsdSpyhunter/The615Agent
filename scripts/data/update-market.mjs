// Monthly job: refresh public/data/market.json and public/data/market-history.json from public sources.
// Run locally:  FRED_API_KEY=... node scripts/data/update-market.mjs
// It never invents numbers: anything a source does not provide stays null (the site shows a dash).
import { readFileSync, writeFileSync } from 'node:fs';
import { PLACES, MAX_AGE_DAYS } from './config.mjs';
import { fetchRedfin } from './redfin.mjs';
import { fetchMortgageRate } from './fred.mjs';
import { SOURCES, stamp, writeState } from './source-state.mjs';

const MARKET = 'public/data/market.json';
const HISTORY = 'public/data/market-history.json';
const previous = JSON.parse(readFileSync(MARKET, 'utf8'));
const log = (...a) => console.log(...a);

const fmt = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

let fingerprint = null;
try { fingerprint = await stamp(SOURCES.monthly); } catch (e) { log('Could not read the monthly file date:', e.message); }

let rate = null;
try { rate = await fetchMortgageRate(process.env.FRED_API_KEY, log); } catch (e) { log('FRED failed:', e.message); }

let redfin;
try { redfin = await fetchRedfin(log); } catch (e) { log('Redfin failed:', e.message); }

if (!redfin || !Object.keys(redfin).length) {
  log('No Redfin data. Leaving the existing files untouched.');
  process.exit(process.env.ALLOW_EMPTY ? 0 : 1);
}

const cities = {}, history = {};
let newest = '0000-00-00';
for (const p of PLACES) {
  const r = redfin[p.slug];
  if (!r || r.latest.monthsSupply == null) { log(`Skipping ${p.name}: no months-of-supply figure`); continue; }
  const l = r.latest;
  if (l.periodEnd > newest) newest = l.periodEnd;
  cities[p.slug] = {
    name: p.name, monthsSupply: +l.monthsSupply.toFixed(1),
    medianPrice: l.medianPrice, yoy: l.yoy, dom: l.dom, saleToList: l.saleToList, inventory: l.inventory,
    asOf: l.periodEnd, geography: r.geography,
  };
  history[p.slug] = { name: p.name, geography: r.geography, months: r.history.map((h) => ({ m: h.month, price: h.medianPrice, dom: h.dom, inv: h.inventory, ms: h.monthsSupply, s2l: h.saleToList })) };
}

const sources = [{
  name: 'Redfin Data Center', url: 'https://www.redfin.com/news/data-center/',
  note: 'median sale price, days on market, sale-to-list ratio, inventory and months of supply, as rolling 3-month figures',
}];
if (rate) sources.push({
  name: 'Freddie Mac via FRED, Federal Reserve Bank of St. Louis', url: 'https://fred.stlouisfed.org/series/MORTGAGE30US',
  note: '30-year fixed mortgage rate, weekly',
});

const ageDays = Math.floor((Date.now() - new Date(newest + 'T00:00:00Z').getTime()) / 86400000);
const stale = ageDays > MAX_AGE_DAYS;
if (stale) log(`WARNING: the newest data is ${ageDays} days old (limit ${MAX_AGE_DAYS}). The site will flag it as out of date.`);

const out = {
  sample: false,
  asOf: newest,
  stale,
  note: 'Redfin figures are rolling 3-month values ending on the "as of" date.',
  sources,
  mortgageRate30: rate?.rate ?? previous.mortgageRate30 ?? null,
  mortgageRateAsOf: rate?.date ?? previous.mortgageRateAsOf ?? null,
  cities,
};
writeFileSync(MARKET, JSON.stringify(out, null, 2) + '\n');
writeFileSync(HISTORY, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), source: 'Redfin Data Center', note: 'Each point is a rolling 3-month figure.', cities: history }, null, 1) + '\n');
log(`Wrote ${Object.keys(cities).length} cities, data through ${newest}.`);
if (fingerprint) writeState({ monthly: fingerprint });
