// The pages in every city guide. A page's URL is /<city>/<slug>. Add a key here (and a template in src/guide/) to add a page to every city.
import { guideCities, cityNames } from './guide-cities.ts';

// Order matters: it is the order of the buttons under the page title.
const KEYS: { key: string; slug: (c: string) => string; label: (n: string) => string }[] = [
  { key: 'housing-market', slug: () => 'housing-market', label: () => 'Housing market' },
  { key: 'home-prices', slug: () => 'home-prices', label: () => 'Home prices' },
  { key: 'neighborhoods', slug: () => 'neighborhoods', label: () => 'Neighborhoods' },
  { key: 'property-taxes', slug: () => 'property-taxes', label: () => 'Property taxes' },
  { key: 'schools', slug: () => 'schools', label: () => 'Schools' },
  { key: 'commute', slug: () => 'commute', label: () => 'Commute' },
  { key: 'cost-of-living', slug: () => 'cost-of-living', label: () => 'Cost of living' },
  { key: 'new-construction', slug: () => 'new-construction', label: () => 'New construction' },
  { key: 'buying', slug: (c) => `buying-in-${c}`, label: (n) => `Buying in ${n}` },
  { key: 'selling', slug: (c) => `selling-in-${c}`, label: (n) => `Selling in ${n}` },
  { key: 'compare', slug: () => '', label: () => '' }, // expanded below, one per peer city
  { key: 'older-homes', slug: () => 'older-homes', label: () => 'Older homes' },
  { key: 'luxury-homes', slug: () => 'luxury-homes', label: () => 'Homes $1M and up' },
];

export interface GuidePage { key: string; slug: string; label: string; peer?: string }
export function pagesFor(citySlug: string): GuidePage[] {
  const city = guideCities[citySlug];
  const out: GuidePage[] = [];
  for (const k of KEYS) {
    if (k.key === 'compare') {
      for (const peer of city.peers) out.push({ key: 'compare', slug: `${citySlug}-vs-${peer}`, label: `${city.name} vs ${cityNames[peer]}`, peer });
    } else out.push({ key: k.key, slug: k.slug(citySlug), label: k.label(city.name) });
  }
  return out;
}
