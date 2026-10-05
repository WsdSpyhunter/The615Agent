// Preview only: fetches Zillow + Realtor.com + the existing Redfin numbers and prints / saves the blended readings.
// Does NOT touch public/data. Output: design/market-temperature-sample.json
import { readFileSync, writeFileSync } from 'node:fs';
import { PLACES } from './config.mjs';
import { fetchZillow } from './zillow.mjs';
import { fetchRealtor } from './realtor.mjs';
import { blend, zillowLabel, redfinLabel, isSmallMarket } from './temperature.mjs';

const log = console.log;
const market = JSON.parse(readFileSync('public/data/market.json', 'utf8'));
const z = await fetchZillow(log);
const counties = [...new Set(Object.values(z).map((v) => v.county).filter(Boolean))];
const r = await fetchRealtor(counties, log);

const out = { generated: new Date().toISOString().slice(0, 10), cities: {} };
for (const p of PLACES) {
  const zs = z[p.slug]?.series || [];
  const last = zs.at(-1), back = (n) => zs.at(-1 - n);
  const countyKey = (z[p.slug]?.county || '').replace(/ county$/i, '').toLowerCase();
  const rc = r[countyKey];
  const rd = market.cities[p.slug];
  const input = {
    zillow: last ? { value: last.v, asOf: last.d, threeMonthsAgo: back(3)?.v ?? null, yearAgo: back(12)?.v ?? null } : null,
    redfin: rd ? { monthsSupply: rd.monthsSupply, inventory: rd.inventory, asOf: rd.asOf } : null,
    realtor: rc?.hot ? { hotness: rc.hot.hotness, county: z[p.slug].county, hotMonth: rc.hotMonth, dom: rc.core?.dom ?? null, priceReducedShare: rc.core?.priceReducedShare ?? null, coreMonth: rc.coreMonth, active: rc.core?.active ?? null } : null,
  };
  const b = blend(input);
  out.cities[p.slug] = { name: p.name, ...b, inputs: input, zillowLabel: last ? zillowLabel(last.v) : null, redfinLabel: rd ? redfinLabel(rd.monthsSupply) : null, small: isSmallMarket(rd?.inventory) };
  log(`${p.name.padEnd(20)} score ${String(b?.score).padStart(5)}  ${b?.label}${b?.tilt ? ` (tilts ${b.tilt})` : ''}${b?.mixed ? '  MIXED' : ''}  trend ${b?.trend?.direction} ${b?.trend?.points}  [Z ${input.zillow?.value} | MoS ${input.redfin?.monthsSupply} | H ${input.realtor?.hotness?.toFixed(1)}]`);
}
writeFileSync('design/market-temperature-sample.json', JSON.stringify(out, null, 2) + '\n');
