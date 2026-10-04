// Redfin Data Center (market tracker). Free to use with a citation and link to Redfin.
// https://www.redfin.com/news/data-center/
import { PLACES, REDFIN_BASE, HISTORY_MONTHS } from './config.mjs';
import { streamTsvGz, norm, num } from './lib.mjs';

const wantCity = new Map(PLACES.map((p) => [norm(p.redfin), p]));
const wantCounty = new Map(PLACES.map((p) => [norm(p.county), p.county]));

// One monthly "All Residential" record -> the fields the site shows.
const shape = (r) => ({
  month: r.period_end?.slice(0, 7),
  periodEnd: r.period_end,
  region: r.region,
  medianPrice: num(r.median_sale_price),
  yoy: num(r.median_sale_price_yoy) == null ? null : +(num(r.median_sale_price_yoy) * 100).toFixed(1),
  dom: num(r.median_dom),
  saleToList: num(r.avg_sale_to_list) == null ? null : +(num(r.avg_sale_to_list) * 100).toFixed(1),
  inventory: num(r.inventory),
  monthsSupply: num(r.months_of_supply),
  homesSold: num(r.homes_sold),
});

async function pull(file, wanted, keyOf) {
  const out = new Map(); // region key -> Map(month -> record)
  const quick = (line) => line.includes(', TN"') && line.includes('"All Residential"');
  const info = await streamTsvGz(`${REDFIN_BASE}/${file}`, quick, (r) => {
    if (r.period_duration !== '30' || r.is_seasonally_adjusted !== 'false' || r.property_type !== 'All Residential') return;
    const k = keyOf(r);
    if (!wanted.has(k)) return;
    const rec = shape(r);
    if (!rec.month) return;
    if (!out.has(k)) out.set(k, new Map());
    out.get(k).set(rec.month, rec);
  });
  return { out, info };
}

export async function fetchRedfin(log = console.log) {
  log('Redfin: reading the city file (large, streamed)...');
  const city = await pull('city_market_tracker.tsv000.gz', wantCity, (r) => norm(r.region));
  log(`Redfin city file: ${city.info.total.toLocaleString()} rows scanned, ${city.info.kept} candidate rows kept`);
  log('Redfin: reading the county file...');
  const county = await pull('county_market_tracker.tsv000.gz', new Set([...wantCounty.keys()]), (r) => norm(r.region));
  log(`Redfin county file: ${county.info.total.toLocaleString()} rows scanned`);

  const result = {};
  for (const p of PLACES) {
    let months = city.out.get(norm(p.redfin)), geography = null;
    if (!months || ![...months.values()].some((r) => r.monthsSupply != null)) {
      months = county.out.get(norm(p.county)); geography = p.county.replace(', TN', ' (county)');
    }
    if (!months) { log(`  ${p.name}: no Redfin data found`); continue; }
    const list = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
    const latest = [...list].reverse().find((r) => r.monthsSupply != null) ?? list.at(-1);
    result[p.slug] = { name: p.name, geography, latest, history: list.slice(-HISTORY_MONTHS) };
    log(`  ${p.name}: ${geography ?? 'city'} data through ${latest.periodEnd}, ${latest.monthsSupply ?? 'n/a'} months of supply`);
  }
  return result;
}
