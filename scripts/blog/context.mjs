import { readJson, numbersIn } from './lib.mjs';
import { pickQuotes, quoteNumbers } from '../quotes/lib.mjs';

// City guide numbers (property tax rates, school districts, Census cost-of-living figures) so a city post can cite them.
let guideCities = {};
try { guideCities = (await import('../../src/data/guide-cities.ts')).guideCities; } catch {}
const guideFacts = (slug) => {
  const g = guideCities[slug]; if (!g) return [];
  const census = readJson('public/data/census-acs.json', {});
  const c = census.cities?.[slug], out = [];
  const yr = g.tax.year || '2026';
  for (const sc of g.tax.scenarios) {
    const total = sc.parts.reduce((t, x) => t + x.rate, 0);
    out.push(`${g.name} property tax, ${yr} tax year (${sc.label}): combined rate $${total.toFixed(4)} per $100 of assessed value (${sc.parts.map((x) => `${x.name} $${x.rate}`).join(', ')}). Tennessee assesses residential property at 25% of appraised value. ${g.tax.sourceNote} Source: ${g.tax.kind === 'county' ? g.tax.cityRateSource.label : 'Williamson County 2026 Property Tax Rates (county sheet)'}.`);
  }
  out.push(`${g.name} schools: ${g.schools.districts.map((d) => d.name).join(' and ')}. ${g.schools.intro}`);
  if (c) out.push(`${g.name} Census figures (U.S. Census Bureau, American Community Survey 5-year estimates, 2020 to 2024): median household income ${money(c.medianHouseholdIncome)}; median gross rent ${money(c.medianGrossRent)} per month; mean travel time to work ${c.meanCommuteMinutes} minutes; ${c.ownerOccupiedPct}% of homes are owner-occupied.`);
  return out;
};

const money = (v) => '$' + Math.round(v).toLocaleString('en-US');

/** Facts the post may use. Everything numeric in a post must trace back to one of these. */
export function buildContext(topic, existingPosts) {
  const market = readJson('public/data/market.json', {});
  const weekly = readJson('public/data/market-weekly.json', null);
  const evergreen = readJson('scripts/blog/facts-evergreen.json', { facts: [] }).facts;
  const links = readJson('src/data/blog-links.json', []);
  const internal = readJson('src/data/blog-internal.json', []);

  const marketFacts = [];
  const asOf = market.asOf;
  const cityFact = (slug, c) => {
    const T = c.temperature;
    const f = [`${c.name} (data as of ${asOf}): median sale price ${money(c.medianPrice)}${c.yoy != null ? `, ${c.yoy > 0 ? 'up' : 'down'} ${Math.abs(c.yoy).toFixed(1)}% from a year earlier` : ''}; median days on market ${c.dom}; average sale-to-list ratio ${c.saleToList?.toFixed(1)}%; ${c.inventory?.toLocaleString('en-US')} active listings; ${c.monthsSupply.toFixed(1)} months of supply (Redfin, rolling 3 months).`];
    if (T) f.push(`${c.name} overall market rating: ${T.label}${T.tilt ? `, slightly toward ${T.tilt}` : ''}; ${(T.readings || []).map((r) => `${r.title}`).join('; ')}.${T.trend ? ` Trend: ${T.trend.direction}, Zillow index ${T.trend.points > 0 ? '+' : ''}${T.trend.points} over 3 months.` : ''}`);
    return f;
  };
  if (market.mortgageRate30 != null) marketFacts.push(`30-year fixed mortgage rate: ${market.mortgageRate30.toFixed(2)}% (Freddie Mac via FRED, week of ${market.mortgageRateAsOf}).`);
  if (weekly?.latest) { const l = weekly.latest; marketFacts.push(`Nashville metro area, 4 weeks ending ${weekly.asOf}: median sale price ${money(l.medianPrice)}, median days on market ${l.dom}, sale-to-list ${l.saleToList?.toFixed(1)}%, months of supply ${l.monthsSupply?.toFixed(1)}, ${l.homesSold?.toLocaleString('en-US')} homes sold (Redfin).`); }
  const cities = market.cities || {};
  const focus = Object.entries(cities).find(([slug]) => topic.linkTags.includes(slug));
  const chosen = focus ? [focus] : Object.entries(cities).filter(([s]) => ['franklin', 'spring-hill', 'nashville'].includes(s));
  for (const [slug, c] of topic.type === 'data' && !focus ? Object.entries(cities).filter(([, c]) => !c.area) : chosen) marketFacts.push(...cityFact(slug, c));
  if (focus && topic.category === 'Relocation') marketFacts.push(...guideFacts(focus[0]));
  if (market.sources?.length) marketFacts.push(`Sources for the market numbers: ${market.sources.map((s) => (typeof s === 'string' ? s : s.name)).join('; ')}.`);

  const tagSet = new Set([...topic.linkTags, topic.category.toLowerCase()]);
  const score = (l) => l.tags.filter((t) => tagSet.has(t)).length;
  const outbound = links.map((l) => ({ ...l, s: score(l) })).filter((l) => l.s > 0).sort((a, b) => b.s - a.s).slice(0, 14);
  const always = ['buy', 'sell', 'contact', 'market-data', 'calculator', 'checklists', 'resources'];
  const inbound = internal.map((l) => ({ ...l, s: score(l) + (always.includes(l.id) ? 1 : 0) })).filter((l) => l.s > 0).sort((a, b) => b.s - a.s).slice(0, topic.category === 'Relocation' ? 24 : 12);

  // Optional exact quotes from official sources (never typed by the writer). Their words count as supplied facts.
  const quotes = pickQuotes(`${topic.idea} ${topic.keyword} ${(topic.related || []).join(' ')}`, 4);
  const quoteFacts = quotes.map((q) => `Quote from ${q.speaker}${q.role ? ', ' + q.role : ''}, ${q.date}: "${q.text}"`);
  const factsText = [...evergreen, ...marketFacts, ...quoteFacts, ...quotes.map((q) => new Date(q.date + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }))].join(' ');
  return { category: topic.category, evergreen, marketFacts, quotes, outbound, inbound, existing: existingPosts, asOf, factsText, allowedNumbers: new Set(numbersIn(factsText)) };
}
