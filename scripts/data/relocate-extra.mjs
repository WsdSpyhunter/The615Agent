// Extra places for the Relocate page's side-by-side table only. They are NOT part of the market temperature gauge, the monthly report or the Market Data page.
// Writes public/data/relocate-extra.json with Redfin's latest median sale price and months of supply for each place (Redfin Data Center, citywide).
//   node scripts/data/relocate-extra.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pull } from './redfin.mjs';
import { norm } from './lib.mjs';

const FILE = 'public/data/relocate-extra.json';
const PLACES = [
  { slug: 'mt-juliet', name: 'Mt. Juliet', redfin: 'Mount Juliet, TN', county: 'Wilson', zips: ['37122'] },
  { slug: 'smyrna', name: 'Smyrna', redfin: 'Smyrna, TN', county: 'Rutherford', zips: ['37167'] },
];
const want = new Map(PLACES.map((p) => [norm(p.redfin), p]));
const { out, info } = await pull('all_cities.csv', (k) => want.has(k));
console.log(`Redfin city file: ${info.total.toLocaleString()} rows scanned`);
const prev = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { cities: {} };
const cities = { ...prev.cities };
for (const p of PLACES) {
  const months = out.get(norm(p.redfin));
  const list = months ? [...months.values()].sort((a, b) => a.month.localeCompare(b.month)) : [];
  const latest = [...list].reverse().find((r) => r.monthsSupply != null && r.medianPrice != null);
  if (!latest) { console.log(`  ${p.name}: no Redfin data found, keeping what the file already has`); continue; }
  cities[p.slug] = { ...(cities[p.slug] || {}), name: p.name, county: p.county, zips: p.zips, redfin: { periodEnd: latest.periodEnd, medianPrice: latest.medianPrice, monthsSupply: latest.monthsSupply, inventory: latest.inventory, region: latest.region } };
  console.log(`  ${p.name}: through ${latest.periodEnd}, median ${latest.medianPrice}, ${latest.monthsSupply} months of supply, inventory ${latest.inventory}`);
}
writeFileSync(FILE, JSON.stringify({ note: 'Extra places for the Relocate page table only. Redfin Data Center, citywide, rolling three months. Not used by the market temperature gauge.', source: { name: 'Redfin Data Center', url: 'https://www.redfin.com/news/data-center/' }, retrieved: new Date().toISOString().slice(0, 10), cities }, null, 2) + '\n');
