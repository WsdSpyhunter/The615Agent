// Quote bank helpers. A quote is only ever a sentence copied exactly from a page we fetched ourselves; the writer never types one from memory.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

export const BANK = 'scripts/data/quote-bank.json';
export const FOMC_CALENDAR = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';
const UA = 'Mozilla/5.0 (compatible; the615agent-quotes/1.0; +https://the615agent.com)';

export const SOURCES = [
  { id: 'fed', org: 'Federal Reserve', kind: 'speech', feed: 'https://www.federalreserve.gov/feeds/speeches_and_testimony.xml' },
  { id: 'fhfa', org: 'Federal Housing Finance Agency', kind: 'release', list: 'https://www.fhfa.gov/news/news-release', base: 'https://www.fhfa.gov', linkRe: /href="(\/news\/news-release\/[^"#?]+)"/g },
  { id: 'cfpb', org: 'Consumer Financial Protection Bureau', kind: 'release', feed: 'https://www.consumerfinance.gov/about-us/newsroom/feed/' },
  { id: 'treasury', org: 'U.S. Department of the Treasury', kind: 'release', list: 'https://home.treasury.gov/news/press-releases', base: 'https://home.treasury.gov/news/', linkRe: /href="?(?:https:\/\/home\.treasury\.gov)?\/?(?:news\/)?(press-releases\/[a-z]{2}\d+)\/?[" >]/g},
];

// Only housing and mortgage related sentences are kept.
export const RE_TOPIC = /\b(mortgage|mortgages|housing|homeowner|homeowners|homebuyer|homebuyers|home buyer|home buyers|home price|home prices|home sales|home values|real estate|homeownership|rental|rents|shelter|FHA|Fannie Mae|Freddie Mac|home loan|home loans)\b/i;
// Keep the bank neutral: no partisan language, and no statements that predict where rates or prices will go.
const PARTISAN = /\b(democrat|democrats|democratic|republican|republicans|radical|woke|socialis\w*|maga|liberal|liberals|conservative|conservatives|election|elections|vote|voters|biden|trump|obama|left-wing|right-wing)\b/i;
const PREDICTION = /\b(will|going to|expect to|are poised to|set to)\b[^.]{0,60}\b(rise|fall|drop|decline|increase|surge|plunge|climb|soar|decrease)\b/i;

export const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
export const squash = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
export const pageText = (html) => {
  const m = html.match(/<main[\s\S]*?<\/main>/i) || html.match(/<article[\s\S]*?<\/article>/i) || [html];
  return decode(m[0].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/gi, ' ').replace(/<\/(p|div|li|h\d|br)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
};
export async function get(url, timeout = 25000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeout);
  try { const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml,*/*' }, signal: ctrl.signal, redirect: 'follow' }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.text(); }
  finally { clearTimeout(t); }
}
export const idFor = (text, url) => 'q' + createHash('sha1').update(text + '|' + url).digest('hex').slice(0, 8);
const wordsOf = (s) => s.split(/\s+/).filter(Boolean);

/** Is this sentence a good, safe quote? Returns false when it should be skipped. */
export const RE_RATES = /\b(inflation|interest rates?|federal funds|policy rate|monetary policy|labor market|unemployment|economy|economic activity|mortgage|housing)\b/i;
export function quotable(text, topicRe = RE_TOPIC) {
  const n = wordsOf(text).length;
  if (n < 12 || n > 45 || text.length > 320) return false;
  if (!topicRe.test(text) || PARTISAN.test(text) || PREDICTION.test(text)) return false;
  if (/[\[\]…]|\.\.\.|https?:|@/.test(text)) return false;
  if (!/^[A-Z"“]/.test(text) || !/[.!?"”]$/.test(text) || /\?["”]?$/.test(text)) return false;
  // Skip lead-ins, footnotes, headers and editor's notes, and sentences that depend on the sentence before them.
  if (/^(During my|I have|I am|I was|I think of|I served|My |We have|We are)\b/.test(text)) return false;
  if (!/\b(rates?|prices?|costs?|rents?|supply|inflation|afford\w*|demand|borrowing|credit|lending|insurance|loans?)\b/i.test(text)) return false;
  if (/^(See|Let me|Today|Thank you|Good (morning|afternoon|evening)|Next|Turning|Now|As I|I will|I want|I'll|I would like|In my remarks|In this speech|Here are|Some|Many|This|These|That|Those|It|They|He|She|Such|Both|And|But|So|Yet|However|Moreover|Finally|First|Second|Third|For example|For instance|Of course|Indeed)\b/.test(text)) return false;
  if (/\b(20\d\d\)|Working Paper|Footnote|Board of Governors|published version|Governor [A-Z]|Chair [A-Z]|Vice Chair|Speech|Remarks|Federal Reserve Bank of|NBER|Table \d|Figure \d|Chart \d)/.test(text)) return false;
  if (/ \d{1,2} (?=[A-Z])|\b(figure|table|chart|dashed|mentioned earlier|as noted|as I|noted above|discussed above|below|earlier in)\b/i.test(text)) return false;
  if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(text)) return false;
  return true;
}

export const loadBank = () => (existsSync(BANK) ? JSON.parse(readFileSync(BANK, 'utf8')) : { generated: null, quotes: [] });

const GENERIC = new Set('home homes house houses buying buyer buyers selling seller sellers tennessee middle county franklin brentwood nashville area areas guide local market real estate agent'.split(' '));
const STOP = new Set('the a an of to in and or for on at by with from is are was were be as it its this that these those your you our how what when why does do can will about into over after before more most new well good time now also many recently still just very much make makes need needs get gets'.split(' '));
const toks = (s) => (s.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []).filter((w) => !STOP.has(w));
/** The best bank quotes for a topic: overlap with the topic words, plus a boost for mortgage and housing terms. Newer wins ties. */
export function pickQuotes(topicText, n = 5, maxAgeDays = 60) {
  const bank = loadBank(); const want = new Set(toks(topicText)); const now = Date.now();
  return bank.quotes
    .filter((q) => (now - new Date(q.date + 'T00:00:00Z').getTime()) / 86400000 <= maxAgeDays)
    .map((q) => { const t = toks(q.text); const overlap = t.filter((w) => want.has(w) && !GENERIC.has(w)).length; if (!overlap) return { q, s: 0 }; const boost = (/mortgage/i.test(q.text) ? 2 : 0) + (/\b(rates?|prices?|afford\w*|inflation)\b/i.test(q.text) ? 1 : 0); return { q, s: overlap + boost + (/housing|home/i.test(q.text) ? 1 : 0) }; })
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s || b.q.date.localeCompare(a.q.date)).slice(0, n).map((x) => x.q);
}
const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
/** The finished markdown block: the exact words, who said them, and a link to the source. */
export function formatQuote(q) {
  const who = [q.speaker, q.role].filter(Boolean).join(', ');
  const how = q.kind === 'speech' ? 'in a speech' : q.kind === 'presser' ? 'at a press conference' : 'in a news release';
  return `> “${q.text.replace(/^["“]|["”]$/g, '')}”\n>\n> — ${who ? who + ', ' : ''}${how} on ${longDate(q.date)} ([${q.org}](${q.url}))`;
}
export const quoteNumbers = (q) => q.text.match(/\d[\d,]*\.?\d*/g) || [];

/** Replaces the writer's {{quote:ID}} marker with the exact quote block (or removes it if it cannot be used). Returns the new body and what happened. */
export async function applyQuote(body, quotes, checkUrl, complianceIssues) {
  const m = body.match(/^[ \t]*\{\{quote:(q[0-9a-f]{8})\}\}[ \t]*$/m);
  const strip = (b) => b.replace(/^[ \t]*\{\{quote:[^}]*\}\}[ \t]*\n?/gm, '').replace(/\{\{quote:[^}]*\}\}/g, '');
  if (!m) return { body: strip(body), used: null, note: null };
  const q = quotes.find((x) => x.id === m[1]);
  if (!q) return { body: strip(body), used: null, note: 'The quote marker did not match a quote in the bank, so it was removed.' };
  const status = await checkUrl(q.url);
  if (status !== 200) return { body: strip(body), used: null, note: `The quote's source page did not load (HTTP ${status}), so the quote was removed.` };
  const block = formatQuote(q);
  const bad = complianceIssues({ title: '', description: '', body: block }).hard;
  if (bad.length) return { body: strip(body), used: null, note: `The quote tripped the Realtor-rules checks (${bad[0]}), so it was removed.` };
  const once = body.replace(m[0], '\n' + block + '\n').replace(/\n{3,}/g, '\n\n');
  return { body: once, used: { id: q.id, speaker: q.speaker, org: q.org, url: q.url, date: q.date }, note: null };
}

/** The monthly report's "In the news" block, or '' when no suitable quote with a working source link exists. */
export async function inTheNews(checkUrl, complianceIssues, heading = '## In the news') {
  const q = pickQuotes('mortgage rates housing market home prices inflation affordability', 1)[0];
  if (!q) return '';
  if ((await checkUrl(q.url)) !== 200) return '';
  const block = formatQuote(q);
  if (complianceIssues({ title: '', description: '', body: block }).hard.length) return '';
  return [heading, 'A recent public statement about housing and mortgage rates, in the speaker\'s own words:', block].join('\n\n');
}
