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
  const want = new Map(PLACES.filter((p) => p.zillow).map((p) => [norm(p.zillow), p]));
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
  // Neighborhood areas: Zillow publishes the index by ZIP code, so use the ZIP code(s); several ZIPs are averaged month by month.
  const zipPlaces = PLACES.filter((p) => p.zillowZips?.length);
  if (zipPlaces.length) {
    const zr = await fetch(`${ZILLOW_BASE}/Zip_market_temp_index_uc_sfrcondo_month.csv`, { headers: { 'user-agent': 'Mozilla/5.0 (the615agent-data-job)' } });
    if (!zr.ok) throw new Error(`Zillow ZIP file -> HTTP ${zr.status}`);
    const zl = (await zr.text()).split(/\r?\n/).filter(Boolean);
    const zh = parseCsvLine(zl[0]);
    const zdates = zh.map((h, i) => ({ h, i })).filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.h));
    const zi = (name) => zh.indexOf(name);
    const rows = new Map();
    for (const line of zl.slice(1)) {
      if (!line.includes(',TN,')) continue;
      const c = parseCsvLine(line);
      if (c[zi('State')] === 'TN') rows.set(c[zi('RegionName')], c);
    }
    for (const p of zipPlaces) {
      const found = p.zillowZips.map((zip) => rows.get(zip)).filter(Boolean);
      if (found.length !== p.zillowZips.length) { log(`  Zillow ${p.name}: ZIP data missing`); continue; }
      const series = zdates.map(({ h, i }) => {
        const vals = found.map((c) => num(c[i]));
        return { d: h, v: vals.every((v) => v != null) ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null };
      }).filter((x) => x.v != null);
      if (series.length) out[p.slug] = { county: found[0][zi('CountyName')], series: series.slice(-HISTORY_MONTHS - 1), zips: p.zillowZips };
    }
  }
  for (const p of PLACES) log(`  Zillow ${p.name}: ${out[p.slug] ? `${out[p.slug].series.at(-1).v} on ${out[p.slug].series.at(-1).d} (${out[p.slug].county})` : 'not found'}`);
  return out;
}
