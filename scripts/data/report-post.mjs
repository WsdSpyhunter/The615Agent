// Prepares the monthly market report as a blog DRAFT (category "Market Update", shown with the blue tag on the blog page).
// Nothing is published here: the draft is saved in drafts/ and emailed to you with Approve / Edit / Reject buttons.
// Pressing Approve publishes it on the blog (same flow as the other posts). It never emails subscribers; the newsletter
// version is a separate draft in Buttondown that you send yourself.
// Built only from public/data/market.json, the same data as the Buttondown newsletter, so every figure is sourced and dated.
//   node scripts/data/report-post.mjs [--test]   (--test makes a throwaway "-test" draft so the approval email can be tried)
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { complianceIssues } from '../blog/compliance.mjs';
import { words } from '../blog/lib.mjs';
const TEST = process.argv.includes('--test');

const log = (...a) => console.log(...a);
const m = JSON.parse(readFileSync('public/data/market.json', 'utf8'));
if (m.sample || !m.cities) { log('Market data is sample data or missing, skipping the report post.'); process.exit(0); }

const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const monthYear = new Date(m.asOf + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
const money = (v) => (v == null ? 'n/a' : '$' + Math.round(v).toLocaleString('en-US'));
const label = (x) => (x < 4 ? "Seller's market" : x <= 6 ? 'Balanced market' : "Buyer's market");
const rating = (c) => (c.temperature ? `${c.temperature.label}${c.temperature.tilt ? ` (slightly toward ${c.temperature.tilt})` : ''}` : label(c.monthsSupply));
const q = (s) => JSON.stringify(String(s));
const today = new Date().toISOString().slice(0, 10);

const title = `${TEST ? 'TEST (press Reject): ' : ''}${monthYear} Housing Market Report: Franklin, Brentwood, Spring Hill and More`;
const description = `A city-by-city look at prices, days on market and inventory along the I-65 corridor, with sources and dates, through ${longDate(m.asOf)}.`;
const slug = `monthly-market-report-${m.asOf.slice(0, 7)}${TEST ? '-test' : ''}`;
const postFile = `src/content/posts/${slug}.md`;
const draftFile = `drafts/${slug}.json`;
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
if (existsSync(postFile)) { log(`The ${monthYear} report is already published (${postFile}). Nothing to do.`); out('slug', ''); process.exit(0); }

const sections = Object.values(m.cities).map((c) => [
  `## ${c.name}: ${rating(c)}`,
  c.temperature ? `*${c.temperature.readings.map((r) => `${r.title.split(':')[0]}: ${r.reading}`).join(' | ')}${c.temperature.trend ? ` | Trend: ${c.temperature.trend.direction}` : ''}${c.temperature.mixed ? ' | The sources disagree' : ''}*` : '',
  c.commentary || '',
  [
    `- Median sale price: ${money(c.medianPrice)}${c.yoy != null ? ` (${c.yoy > 0 ? '+' : ''}${c.yoy.toFixed(1)}% vs. a year earlier)` : ''}`,
    c.dom != null ? `- Median days on market: ${c.dom}` : null,
    c.saleToList != null ? `- Average sale-to-list ratio: ${c.saleToList.toFixed(1)}%` : null,
    c.inventory != null ? `- Active listings: ${c.inventory.toLocaleString('en-US')}` : null,
    c.geography ? `- Based on ${c.geography} data` : null,
  ].filter(Boolean).join('\n'),
].filter(Boolean).join('\n\n'));

const body = [
  `Here is where the market stands along the I-65 corridor and in greater Nashville, based on data through ${longDate(m.asOf)}.`,
  m.mortgageRate30 != null ? `The average 30-year fixed mortgage rate was **${m.mortgageRate30.toFixed(2)}%** (week of ${longDate(m.mortgageRateAsOf)}).` : '',
  `**How to read it:** each rating blends Zillow's Market Temperature Index, Redfin's months of supply and Realtor.com's county data. ${m.temperatureMethod ?? ''}`,
  ...sections,
  `## What this means for your plans`,
  `Every home and neighborhood is different. If you would like to talk through what these numbers mean for you, [get matched with homes](/buy#form), [find out what your home is worth](/sell#form) or [contact me](/contact). You can also see live numbers for every city on the [market data page](/market-data), or try your own numbers in the [mortgage calculator](/mortgage-calculator).`,
  `*Sources: ${m.sources.map((s) => (typeof s === 'string' ? s : `[${s.name}](${s.url})${s.note ? ` (${s.note})` : ''}`)).join('; ')}. Conditions vary by neighborhood, price range and home type. This is general information, not legal, tax, lending or financial advice.*`,
].filter(Boolean).join('\n\n');

const issues = complianceIssues({ title, description, body });
if (issues.hard.length) { log('NOT published. Realtor-rules checks failed:\n - ' + issues.hard.join('\n - ')); process.exit(1); }

const prior = existsSync(draftFile) ? JSON.parse(readFileSync(draftFile, 'utf8')) : null;
if (prior && prior.body === body && prior.title === title) { log(`The ${monthYear} report draft is already waiting for approval. Nothing new to send.`); out('slug', ''); process.exit(0); }
const draft = {
  version: 1, kind: 'report', slug, topicId: null, created: new Date().toISOString().slice(0, 10), status: 'draft',
  title, description: description.slice(0, 200), category: 'Market Update', keyword: `${monthYear.toLowerCase()} housing market report`,
  body, faq: [], hero: null, heroLocal: { path: '/img/skyline-night-1600.jpg', alt: 'Downtown Nashville skyline and the pedestrian bridge at night' }, inline: [], choices: [],
  checks: { words: words(body), linksChecked: [], dropped: [], review: { ok: true, issues: [] }, compliance: { soft: issues.soft }, dataPointsUsed: [`Market data through ${longDate(m.asOf)}`, m.mortgageRate30 != null ? `30-year fixed rate ${m.mortgageRate30.toFixed(2)}%` : ''].filter(Boolean), model: 'none (built from the data files)', failedChecks: false },
};
mkdirSync('drafts', { recursive: true });
writeFileSync(draftFile, JSON.stringify(draft, null, 2) + '\n');
log(`Saved ${draftFile} for your approval.`);
out('slug', slug);
