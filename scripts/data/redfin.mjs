// Redfin Data Center (housing market, monthly files, rolling 3-month figures).
// Free to use with a citation and link to Redfin: https://www.redfin.com/news/data-center/
import { PLACES, REDFIN_BASE, HISTORY_MONTHS } from './config.mjs';
import { streamCsv, norm, num } from './lib.mjs';

const wantCity = new Map(PLACES.map((p) => [norm(p.redfin), p]));
const wantCounty = new Set(PLACES.map((p) => norm(p.county)));
const filled = (r) => Object.values(r).filter((v) => v != null).length;

// One period record -> the fields the site shows. (Percent columns are already in percent.)
const shape = (r) => ({
  month: r['period end']?.slice(0, 7),
  periodEnd: r['period end'],
  region: r['region name'],
  medianPrice: num(r['median sale price nsa ($)']),
  yoy: num(r['median sale price nsa yoy (%)']),
  dom: num(r['median days on market (days)']),
  saleToList: num(r['average sale to list ratio (%)']),
  inventory: num(r['inventory']),
  monthsSupply: num(r['months of supply']),
  homesSold: num(r['homes sold']),
});

async function pull(file, isWanted) {
  const out = new Map(); // normalized region -> Map(month -> record)
  const quick = (line) => line.includes(', TN"');
  const info = await streamCsv(`${REDFIN_BASE}/${file}`, quick, (r) => {
    const k = norm(r['region name'] || '');
    if (!isWanted(k)) return;
    const rec = shape(r);
    if (!rec.month) return;
    if (!out.has(k)) out.set(k, new Map());
    const prev = out.get(k).get(rec.month);
    if (!prev || filled(rec) > filled(prev)) out.get(k).set(rec.month, rec); // duplicate region ids: keep the fuller row
  });
  return { out, info };
}

export async function fetchRedfin(log = console.log) {
  log('Redfin: reading the city file (large, streamed)...');
  const city = await pull('all_cities.csv', (k) => wantCity.has(k));
  log(`Redfin city file: ${city.info.total.toLocaleString()} rows scanned`);
  log('Redfin: reading the county file...');
  const county = await pull('all_counties.csv', (k) => wantCounty.has(k));
  log(`Redfin county file: ${county.info.total.toLocaleString()} rows scanned`);

  const result = {};
  for (const p of PLACES) {
    let months = city.out.get(norm(p.redfin)), geography = null;
    const good = (m) => m && [...m.values()].some((r) => r.monthsSupply != null);
    if (!good(months)) { months = county.out.get(norm(p.county)); geography = p.county.replace(', TN', ' (county)'); }
    if (!months) { log(`  ${p.name}: no Redfin data found`); continue; }
    const list = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
    const latest = [...list].reverse().find((r) => r.monthsSupply != null) ?? list.at(-1);
    result[p.slug] = { name: p.name, geography, latest, history: list.slice(-HISTORY_MONTHS) };
    log(`  ${p.name}: ${geography ?? 'city'} data through ${latest.periodEnd}, ${latest.monthsSupply ?? 'n/a'} months of supply`);
  }
  return result;
}
