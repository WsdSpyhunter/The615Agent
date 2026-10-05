// Realtor.com Research data (county level, free): listing activity (core metrics, monthly, newest month) and "hotness" (monthly).
// https://www.realtor.com/research/data/  (credit Realtor.com, link back)
import { REALTOR_CORE, REALTOR_HOT } from './config.mjs';
import { streamCsv, num } from './lib.mjs';

/** counties: array like ['Williamson County', 'Maury County'] -> { 'williamson': {...} } keyed by lowercase county word. */
export async function fetchRealtor(counties, log = console.log) {
  const keys = new Set(counties.map((c) => c.replace(/ county$/i, '').toLowerCase()));
  const keyOf = (name) => (name || '').split(',')[0].trim().toLowerCase();
  const wanted = (r) => /, tn$/i.test(r['county_name'] || '') && keys.has(keyOf(r['county_name']));
  const out = {};
  for (const k of keys) out[k] = { core: new Map(), hot: new Map() };

  await streamCsv(REALTOR_CORE, (l) => /, tn"?,/i.test(l), (r) => {
    if (!wanted(r)) return;
    out[keyOf(r['county_name'])].core.set(r['month_date_yyyymm'], {
      dom: num(r['median_days_on_market']), priceReducedShare: num(r['price_reduced_share']), active: num(r['active_listing_count']),
      pending: num(r['pending_listing_count']), medianListPrice: num(r['median_listing_price']),
    });
  });
  await streamCsv(REALTOR_HOT, (l) => /, tn"?,/i.test(l), (r) => {
    if (!wanted(r)) return;
    out[keyOf(r['county_name'])].hot.set(r['month_date_yyyymm'], { hotness: num(r['hotness_score']), supply: num(r['supply_score']), demand: num(r['demand_score']), hotnessRank: num(r['hotness_rank']) });
  });

  const result = {};
  for (const [k, v] of Object.entries(out)) {
    const cm = [...v.core.keys()].sort().at(-1), hm = [...v.hot.keys()].sort().at(-1);
    if (!cm && !hm) continue;
    result[k] = { coreMonth: cm || null, core: cm ? v.core.get(cm) : null, hotMonth: hm || null, hot: hm ? v.hot.get(hm) : null };
    log(`  Realtor.com ${k} County: listings through ${cm}, hotness through ${hm}`);
  }
  return result;
}
