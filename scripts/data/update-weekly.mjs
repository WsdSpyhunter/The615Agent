// Weekly pulse for the Nashville metro area from Redfin's weekly file (rolling 4-week figures),
// plus the latest 30-year mortgage rate from FRED. Writes public/data/market-weekly.json and updates the rate in market.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { streamCsv, num } from './lib.mjs';
import { SOURCES, stamp, writeState } from './source-state.mjs';
import { fetchMortgageRate } from './fred.mjs';

const log = (...a) => console.log(...a);
const REGION = 'Nashville, TN metro area';
const OUT = 'public/data/market-weekly.json';
const MARKET = 'public/data/market.json';

let fingerprint = null;
try { fingerprint = await stamp(SOURCES.weekly); } catch (e) { log('Could not read the weekly file date:', e.message); }

const rows = [];
const info = await streamCsv(SOURCES.weekly, (l) => l.includes(`"${REGION}"`), (r) => {
  if (r['region name'] !== REGION) return;
  rows.push({
    periodBegin: r['period begin'], periodEnd: r['period end'],
    homesSold: num(r['homes sold nsa']), medianPrice: num(r['median sale price nsa ($)']), yoy: num(r['median sale price nsa yoy (%)']),
    dom: num(r['median days on market nsa (days)']), saleToList: num(r['average sale to list ratio nsa (%)']),
    monthsSupply: num(r['months of supply nsa']), newListings: num(r['new listings nsa']), activeListings: num(r['active listings nsa']),
    pending: num(r['pending sales nsa']),
  });
});
log(`Weekly file: ${info.total.toLocaleString()} rows scanned, ${rows.length} rows for ${REGION}`);
if (!rows.length) { log('No weekly rows found. Leaving the existing file untouched.'); process.exit(1); }
rows.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
const latest = [...rows].reverse().find((r) => r.medianPrice != null) ?? rows.at(-1);
writeFileSync(OUT, JSON.stringify({
  region: 'Nashville metro area',
  frequency: 'Rolling 4 weeks, updated weekly',
  asOf: latest.periodEnd, periodBegin: latest.periodBegin,
  source: { name: 'Redfin Data Center', url: 'https://www.redfin.com/news/data-center/' },
  latest, history: rows.slice(-26),
}, null, 1) + '\n');
log(`Wrote weekly pulse for the 4 weeks ending ${latest.periodEnd}.`);

// Keep the mortgage rate fresh too (FRED publishes weekly).
try {
  const rate = await fetchMortgageRate(process.env.FRED_API_KEY, log);
  if (rate) {
    const m = JSON.parse(readFileSync(MARKET, 'utf8'));
    m.mortgageRate30 = rate.rate; m.mortgageRateAsOf = rate.date;
    writeFileSync(MARKET, JSON.stringify(m, null, 2) + '\n');
  }
} catch (e) { log('FRED failed:', e.message); }

if (fingerprint) writeState({ weekly: fingerprint });
