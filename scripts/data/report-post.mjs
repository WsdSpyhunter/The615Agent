// Publishes the monthly market report as a blog post (category "Market Update", shown with the blue tag on the blog page).
// Built only from public/data/market.json, the same data as the Buttondown newsletter, so every figure is sourced and dated.
// Safe to re-run: the post for a given data month is rewritten in place and keeps its original publish date.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { complianceIssues } from '../blog/compliance.mjs';

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

const title = `${monthYear} Housing Market Report: Franklin, Brentwood, Spring Hill and More`;
const description = `A city-by-city look at prices, days on market and inventory along the I-65 corridor, with sources and dates, through ${longDate(m.asOf)}.`;
const slug = `monthly-market-report-${m.asOf.slice(0, 7)}`;
const file = `src/content/posts/${slug}.md`;

// keep the original publish date if this month's post already exists
let pubDate = today;
if (existsSync(file)) { const mm = readFileSync(file, 'utf8').match(/^pubDate:\s*(\d{4}-\d{2}-\d{2})/m); if (mm) pubDate = mm[1]; }

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

const fm = ['---', `title: ${q(title)}`, `description: ${q(description.slice(0, 200))}`, `pubDate: ${pubDate}`, 'category: Market Update', `keyword: ${q(`${monthYear.toLowerCase()} housing market report`)}`,
  'heroImage: /img/skyline-night-1600.jpg', `heroAlt: ${q('Downtown Nashville skyline and the pedestrian bridge at night')}`, '---', ''].join('\n');
writeFileSync(file, fm + body + '\n');
log(`Wrote ${file} (dated ${pubDate}).`);
