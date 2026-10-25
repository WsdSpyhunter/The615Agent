// Adds (or refreshes) places and ZIP code areas in public/data/census-acs.json from the Census Bureau's ACS 5-year Data Profiles.
//   CENSUS_API_KEY=... node scripts/data/census.mjs nashville:4752006 --zips 37013,37076,...   (a place is  slug:stateFIPS+placeFIPS)
// Fields match the entries already in the file. Nothing else in the file is changed.
import { readFileSync, writeFileSync } from 'node:fs';
const KEY = process.env.CENSUS_API_KEY;
if (!KEY) { console.error('Set CENSUS_API_KEY first.'); process.exit(1); }
const YEAR = 2024, FILE = 'public/data/census-acs.json';
const V = { population: 'DP05_0001E', meanCommuteMinutes: 'DP03_0025E', medianHouseholdIncome: 'DP03_0062E', medianHomeValue: 'DP04_0089E', medianGrossRent: 'DP04_0134E', ownerOccupiedPct: 'DP04_0046PE', housingUnits: 'DP04_0001E',
  b2020: 'DP04_0017PE', b2010: 'DP04_0018PE', b2000: 'DP04_0019PE', b1990: 'DP04_0020PE', b1980: 'DP04_0021PE', b1970: 'DP04_0022PE', b1960: 'DP04_0023PE', b1950: 'DP04_0024PE', b1940: 'DP04_0025PE', b1939: 'DP04_0026PE', valuePct500to999k: 'DP04_0087PE', valuePct1mPlus: 'DP04_0088PE', name: 'NAME' };
const num = (x) => { const n = Number(x); return Number.isFinite(n) && n > -100000 ? n : null; };
async function get(forClause) {
  const url = `https://api.census.gov/data/${YEAR}/acs/acs5/profile?get=${Object.values(V).join(',')}&for=${forClause}&key=${KEY}`;
  const r = await fetch(url); if (!r.ok) throw new Error(`Census ${r.status}: ${(await r.text()).slice(0, 120)}`);
  const [head, ...rows] = await r.json(); return rows.map((row) => Object.fromEntries(head.map((h, i) => [h, row[i]])));
}
const pick = (o) => Object.fromEntries(Object.entries(V).map(([k, code]) => [k, k === 'name' ? o[code] : num(o[code])]));
const data = JSON.parse(readFileSync(FILE, 'utf8'));
const args = process.argv.slice(2), zi = args.indexOf('--zips');
const zips = zi >= 0 ? args[zi + 1].split(',') : [];
for (const spec of args.filter((a, i) => a.includes(':') && i !== zi + 1)) {
  const [slug, code] = spec.split(':');
  const [row] = await get(`place:${code.slice(2)}&in=state:${code.slice(0, 2)}`);
  const p = pick(row);
  data.cities[slug] = { name: data.cities[slug]?.name || slug, population: p.population, meanCommuteMinutes: p.meanCommuteMinutes, medianHouseholdIncome: p.medianHouseholdIncome, medianHomeValue: p.medianHomeValue, medianGrossRent: p.medianGrossRent, ownerOccupiedPct: p.ownerOccupiedPct, housingUnits: p.housingUnits,
    builtPct: Object.fromEntries(['b2020', 'b2010', 'b2000', 'b1990', 'b1980', 'b1970', 'b1960', 'b1950', 'b1940', 'b1939'].map((k) => [k, p[k]])), valuePct500to999k: p.valuePct500to999k, valuePct1mPlus: p.valuePct1mPlus };
  console.log(`${slug}: ${row.NAME}, population ${p.population}`);
}
if (zips.length) {
  const all = await get('zip%20code%20tabulation%20area:*');
  const byZip = new Map(all.map((r) => [r['zip code tabulation area'], r]));
  for (const z of zips) {
    const r = byZip.get(z); if (!r) { console.log(`ZIP ${z}: not in the Census data`); continue; }
    const p = pick(r);
    data.zips[z] = { population: p.population, meanCommuteMinutes: p.meanCommuteMinutes, medianHouseholdIncome: p.medianHouseholdIncome, medianHomeValue: p.medianHomeValue, medianGrossRent: p.medianGrossRent, ownerOccupiedPct: p.ownerOccupiedPct, housingUnits: p.housingUnits, builtSince2020Pct: p.b2020, valuePct1mPlus: p.valuePct1mPlus };
    console.log(`ZIP ${z}: population ${p.population}`);
  }
}
data.retrieved = new Date().toISOString().slice(0, 10);
writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log('Saved', FILE);
