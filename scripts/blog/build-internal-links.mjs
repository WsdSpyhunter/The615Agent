// Adds every city guide page to src/data/blog-internal.json so the blog writer can link to them.
// Safe to re-run: entries already there (same id or same page) are kept as they are.
//   node scripts/blog/build-internal-links.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const { guideCities, cityNames } = await import('../../src/data/guide-cities.ts');
const { pagesFor } = await import('../../src/data/guide-pages.ts');
const FILE = 'src/data/blog-internal.json';
const list = JSON.parse(readFileSync(FILE, 'utf8'));
const have = new Set(list.map((l) => l.id)), haveUrl = new Set(list.map((l) => l.url));
const tagCity = (slug) => cityNames[slug].toLowerCase().replace(/'/g, '');
const TOPIC = {
  'housing-market': ['market update', 'data', 'days on market', 'months of supply'],
  'home-prices': ['home prices', 'price per square foot', 'financing'],
  neighborhoods: ['relocation'],
  'property-taxes': ['property taxes', 'cost of living'],
  schools: ['schools', 'zoning', 'relocation'],
  commute: ['commute', 'relocation'],
  'cost-of-living': ['cost of living', 'relocation'],
  'new-construction': ['new construction'],
  buying: ['buyers', 'pre-approval', 'closing'],
  selling: ['sellers', 'disclosures', 'closing'],
  'older-homes': ['inspection', 'older homes'],
  'luxury-homes': ['home prices'],
};
const LABEL = {
  'housing-market': (n) => `${n} housing market data`, 'home-prices': (n) => `${n} home prices`, neighborhoods: (n) => `${n} ZIP codes and Census numbers`,
  'property-taxes': (n) => `${n} property taxes`, schools: (n) => `${n} school districts`, commute: (n) => `${n} commute times`, 'cost-of-living': (n) => `${n} cost of living`,
  'new-construction': (n) => `${n} new construction`, buying: (n) => `Buying a home in ${n}`, selling: (n) => `Selling a home in ${n}`, 'older-homes': (n) => `${n} older homes`, 'luxury-homes': (n) => `${n} homes $1M and up`,
};
let added = 0;
const add = (e) => { if (!have.has(e.id) && !haveUrl.has(e.url)) { list.push(e); have.add(e.id); haveUrl.add(e.url); added++; } };
for (const slug of Object.keys(guideCities).filter((c) => guideCities[c].enabled)) {
  const n = cityNames[slug], ct = tagCity(slug);
  add({ id: `${slug}-guide`, url: `/${slug}`, label: `${n} real estate guide`, tags: [ct, 'relocation', 'buyers', 'sellers'] });
  for (const p of pagesFor(slug)) {
    if (p.key === 'compare') add({ id: `${slug}-vs-${p.peer}`, url: `/${slug}/${p.slug}`, label: p.label, tags: [ct, 'relocation', 'cost of living'] });
    else if (TOPIC[p.key]) add({ id: `${slug}-${p.key}`, url: `/${slug}/${p.slug}`, label: LABEL[p.key](n), tags: [ct, ...TOPIC[p.key]] });
  }
}
writeFileSync(FILE, JSON.stringify(list, null, 2) + '\n');
console.log(`blog-internal.json: ${added} guide entries added, ${list.length} total.`);
