// Refreshes scripts/data/quote-bank.json from official sources (Federal Reserve, FHFA, CFPB, Treasury, HUD, NAR).
// Every quote is a sentence copied exactly from a page fetched here; nothing is written by an AI and nothing is recalled from memory.
//   node scripts/quotes/build-bank.mjs [--force]
import { writeFileSync, existsSync } from 'node:fs';
import { SOURCES, BANK, FOMC_CALENDAR, RE_RATES, get, pageText, squash, quotable, idFor, loadBank, decode } from './lib.mjs';
import { createRequire } from 'node:module';

const log = (...a) => console.log(...a);
const FORCE = process.argv.includes('--force');
const prev = loadBank();
if (!FORCE && prev.generated && (Date.now() - new Date(prev.generated + 'T00:00:00Z').getTime()) / 86400000 < 1.5) { log('Quote bank is fresh (under 36 hours old). Nothing to do.'); process.exit(0); }

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const dateIn = (text) => { const m = text.slice(0, 4000).match(new RegExp(`(${MONTHS})\\s+(\\d{1,2}),\\s+(20\\d\\d)`)); if (!m) return null; return new Date(`${m[1]} ${m[2]}, ${m[3]} 00:00:00 UTC`).toISOString().slice(0, 10); };
const sentences = (text) => text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"“])/).map((s) => s.trim());
const cleanWho = (s) => s.replace(/\s+(?:in|during|at|on|for|about|after)\s+(?:a|the|an|his|her)\b.*$/i, '').replace(/[,;:.\s]+$/, '').replace(/^(?:by|from)\s+/i, '').trim();

async function items(src) {
  if (src.feed) {
    const xml = await get(src.feed);
    return [...xml.matchAll(/<(item|entry)>([\s\S]*?)<\/\1>/g)].slice(0, 14).map((m) => {
      const b = m[2];
      const link = (b.match(/<link[^>]*href="([^"]+)"/) || b.match(/<link>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/) || [])[1];
      const date = (b.match(/<(?:pubDate|updated|published)>\s*(?:<!\[CDATA\[)?([^<\]]+)/) || [])[1];
      const title = decode(((b.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '')).trim();
      return link ? { url: link.trim(), date: date ? new Date(date).toISOString().slice(0, 10) : null, title } : null;
    }).filter(Boolean);
  }
  const html = await get(src.list);
  const seen = new Set(); const out = [];
  for (const m of html.matchAll(src.linkRe)) { const u = src.base + m[1]; if (!seen.has(u)) { seen.add(u); out.push({ url: u, date: null, title: '' }); } if (out.length >= 14) break; }
  return out;
}

function fromRelease(text, it, src) {
  const found = [];
  const clean = (q) => sentences(squash(q));
  const push = (q, who) => { for (const s of clean(q)) if (quotable(s)) found.push({ text: s, speaker: cleanWho(who || ''), role: '' }); };
  for (const m of text.matchAll(/[“"]([^”"]{50,420})[”"],?\s*(?:said|says|stated|noted|added|commented)\s+([^.\n]{3,110})/g)) push(m[1], m[2]);
  for (const m of text.matchAll(/([A-Z][^.\n“"]{3,110}?)\s+(?:said|says|stated|noted|added)[,:]?\s*[“"]([^”"]{50,420})[”"]/g)) push(m[2], m[1]);
  return found.filter((f) => f.speaker && f.speaker.split(/\s+/).length <= 14);
}
function fromSpeech(text, it) {
  const head = text.slice(0, 2500);
  const rm = head.match(/\b(Vice Chair for Supervision|Vice Chair|Chair|Governor|President)\s+((?:[A-Z][A-Za-z.'’-]+\s){1,3}[A-Z][A-Za-z.'’-]+)/);
  if (!rm) return [];
  const body = text.replace(/\bFootnotes?\b[\s\S]*$/, '');
  const found = [];
  for (const s of sentences(body)) { const q = squash(s); if (quotable(q)) found.push({ text: q, speaker: rm[2].trim(), role: `Federal Reserve ${rm[1]}` }); }
  return found;
}

const quotes = []; const status = {};
for (const src of SOURCES) {
  try {
    const list = await items(src);
    let kept = 0, pages = 0;
    for (const it of list) {
      let html; try { html = await get(it.url); } catch { continue; }
      pages++;
      const text = pageText(html); const norm = squash(text);
      const date = it.date || dateIn(text);
      if (!date || (Date.now() - new Date(date + 'T00:00:00Z').getTime()) / 86400000 > 75) continue;
      const cands = src.kind === 'speech' ? fromSpeech(text, it) : fromRelease(text, it, src);
      const rank = (c) => (/mortgage/i.test(c.text) ? 2 : 0) + (/housing|home/i.test(c.text) ? 1 : 0) + (/\b(rates?|prices?|rents?|supply|inflation|affordab\w+)\b/i.test(c.text) ? 1 : 0);
      cands.sort((x, y) => rank(y) - rank(x));
      for (const c of cands.slice(0, 3)) {
        if (!norm.includes(c.text)) continue; // must appear verbatim in the fetched page
        quotes.push({ id: idFor(c.text, it.url), text: c.text, speaker: c.speaker, role: c.role, org: src.org, kind: src.kind, title: it.title || '', url: it.url, date });
        kept++;
      }
    }
    status[src.id] = `ok: ${list.length} items listed, ${pages} pages read, ${kept} quotes kept`;
  } catch (e) { status[src.id] = `failed: ${e.message}`; }
  log(`${src.org}: ${status[src.id]}`);
}
// The Federal Reserve Chair's press conferences after the last two FOMC meetings (transcripts are PDFs). Only the Chair's own turns are used.
// Off by default: transcript sentences were conversational and rarely stand alone (tested Oct 2026). Needs `npm i pdf-parse` to try again.
if (process.env.FOMC_PRESSER === '1') try {
  const require = createRequire(import.meta.url);
  const pdf = require('pdf-parse/lib/pdf-parse.js');
  const cal = await get(FOMC_CALENDAR);
  const dates = [...new Set([...cal.matchAll(/fomcpresconf(\d{8})\.htm/g)].map((m) => m[1]))].sort().slice(-2);
  let chair = 'Chairman';
  try { const board = pageText(await get('https://www.federalreserve.gov/aboutthefed/bios/board/default.htm')); const cm = squash(board).match(/([A-Z][a-z]+(?: [A-Z]\.)? [A-Z][a-z]+), Chairman\b/); if (cm) chair = cm[1]; } catch {}
  let kept = 0;
  for (const d of dates) {
    const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
    if ((Date.now() - new Date(iso + 'T00:00:00Z').getTime()) / 86400000 > 75) continue;
    const buf = Buffer.from(await (await fetch(`https://www.federalreserve.gov/mediacenter/files/FOMCpresconf${d}.pdf`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; the615agent-quotes/1.0)' } })).arrayBuffer());
    let text = squash((await pdf(buf)).text).replace(/(?:[A-Z][a-z]+ \d{1,2}, 20\d\d )?Chair(?:man|woman)? [A-Z][a-z]+[’']s Press Conference FINAL Page \d+ of \d+/g, ' ').replace(/\s+/g, ' ');
    const turns = text.split(/(?<=^|[.!?”"]\s)(?=[A-Z]{3,}(?: [A-Z][A-Z.]*){0,3}\.\s)/);
    const cands = [];
    for (const t of turns) {
      const m = t.match(/^\s*(CHAIR(?:MAN|WOMAN)?(?: [A-Z.]+){0,3})\.\s([\s\S]*)$/); if (!m) continue;
      for (const s of m[2].split(/(?<=[.!?])\s+(?=[A-Z"“])/)) { const q = s.trim(); if (quotable(q, RE_RATES)) cands.push(q); }
    }
    const rank = (s) => (/mortgage|housing/i.test(s) ? 3 : 0) + (/\b(interest rates?|policy rate|inflation|federal funds)\b/i.test(s) ? 1 : 0);
    for (const q of cands.sort((x, y) => rank(y) - rank(x)).slice(0, 4)) {
      if (!text.includes(q)) continue;
      quotes.push({ id: idFor(q, `fomc${d}`), text: q, speaker: chair, role: 'Federal Reserve Chairman', org: 'Federal Reserve', kind: 'presser', title: `Chairman's press conference, ${iso}`, url: `https://www.federalreserve.gov/monetarypolicy/fomcpresconf${d}.htm`, date: iso });
      kept++;
    }
  }
  status.fomc = `ok: ${dates.length} press conferences found, ${kept} quotes kept (chair: ${chair})`;
} catch (e) { status.fomc = `failed: ${e.message}`; }
if (status.fomc) log(`Fed Chair press conferences: ${status.fomc}`);

// Dedupe, newest first, keep a manageable number. If a refresh found nothing at all (for example a network problem), keep the old bank.
const seen = new Set(); const out = [];
for (const q of quotes.sort((a, b) => b.date.localeCompare(a.date))) { if (seen.has(q.text)) continue; seen.add(q.text); out.push(q); }
if (!out.length && prev.quotes?.length) { log('No quotes found this time; keeping the previous bank.'); process.exit(0); }
writeFileSync(BANK, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), status, quotes: out.slice(0, 80) }, null, 1) + '\n');
log(`Quote bank written: ${Math.min(out.length, 80)} quotes.`);
