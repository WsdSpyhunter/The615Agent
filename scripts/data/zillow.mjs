// Zillow Research: Market Temperature Index (city level, monthly). Higher = better for sellers.
// Zillow's own bands: 70+ strong seller's, 55-69 seller's, 44-55 neutral, 28-44 buyer's, 27 or below strong buyer's.
// https://www.zillow.com/research/data/  (credit Zillow, link back)
import { PLACES, ZILLOW_BASE, HISTORY_MONTHS } from './config.mjs';
import { parseCsvLine, norm, num } from './lib.mjs';

export async function fetchZillow(log = console.log) {
  const res = await fetch(`${ZILLOW_BASE}/City_market_temp_index_uc_sfrcondo_month.csv`, { headers: { 'user-agent': 'Mozilla/5.0 (the615agent-data-job)' } });
  if (!res.ok) throw new Error(`Zillow city file -> HTTP ${res.status}`);
  const lines = (await res.text()).split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const dateCols = header.map((h, i) => ({ h, i })).filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.h));
  const idx = (name) => header.indexOf(name);
  const want = new Map(PLACES.map((p) => [norm(p.zillow), p]));
  const out = {};
  for (const line of lines.slice(1)) {
    if (!line.includes(',TN,')) continue;
    const c = parseCsvLine(line);
    const place = want.get(norm(c[idx('RegionName')]));
    if (!place || c[idx('State')] !== 'TN') continue;
    // Several TN places can share a name; keep the one in the expected county when we know it.
    const series = dateCols.map(({ h, i }) => ({ d: h, v: num(c[i]) })).filter((x) => x.v != null);
    if (!series.length) continue;
    if (out[place.slug] && series.length < out[place.slug].series.length) continue;
    out[place.slug] = { county: c[idx('CountyName')], series: series.slice(-HISTORY_MONTHS - 1) };
  }
  for (const p of PLACES) log(`  Zillow ${p.name}: ${out[p.slug] ? `${out[p.slug].series.at(-1).v} on ${out[p.slug].series.at(-1).d} (${out[p.slug].county})` : 'not found'}`);
  return out;
}
