// Adds the blended "market temperature" reading to public/data/market.json (and the Zillow index series to market-history.json).
// Sources: Zillow Market Temperature Index (city, main driver), Redfin months of supply (city), Realtor.com hotness (county).
// A source older than MAX_AGE_DAYS is left out of the blend and noted, so stale data never drives the rating.
import { readFileSync, writeFileSync } from 'node:fs';
import { PLACES, MAX_AGE_DAYS } from './config.mjs';
import { fetchZillow } from './zillow.mjs';
import { fetchRealtor } from './realtor.mjs';
import { blend, zillowLabel, redfinLabel, levelFor, isSmallMarket, WEIGHTS } from './temperature.mjs';

const MARKET = 'public/data/market.json';
const HISTORY = 'public/data/market-history.json';
const long = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const monthEnd = (yyyymm) => { const y = +yyyymm.slice(0, 4), m = +yyyymm.slice(4); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
const ageDays = (iso) => Math.floor((Date.now() - new Date(iso + 'T00:00:00Z').getTime()) / 86400000);
const pct = (w) => `${Math.round(w * 100)}%`;

export async function applyTemperature(log = console.log) {
  const market = JSON.parse(readFileSync(MARKET, 'utf8'));
  if (market.sample) { log('Market data is sample data, skipping temperature.'); return false; }
  let history = null;
  try { history = JSON.parse(readFileSync(HISTORY, 'utf8')); } catch {}

  let z = {}, r = {};
  try { z = await fetchZillow(log); } catch (e) { log('Zillow failed:', e.message); }
  const counties = [...new Set(Object.values(z).map((v) => v.county).filter(Boolean))];
  try { if (counties.length) r = await fetchRealtor(counties, log); } catch (e) { log('Realtor.com failed:', e.message); }

  let anyZillow = false, anyRealtor = false;
  for (const p of PLACES) {
    const city = market.cities[p.slug];
    if (!city) continue;
    const zs = z[p.slug]?.series || [], zl = zs.at(-1), back = (n) => zs.at(-1 - n);
    const zOk = zl && ageDays(zl.d) <= MAX_AGE_DAYS;
    const countyName = z[p.slug]?.county || '';
    const rc = r[countyName.replace(/ county$/i, '').toLowerCase()];
    const hotEnd = rc?.hotMonth ? monthEnd(rc.hotMonth) : null;
    const rOk = rc?.hot && hotEnd && ageDays(hotEnd) <= MAX_AGE_DAYS;
    const redfinOk = city.asOf && ageDays(city.asOf) <= MAX_AGE_DAYS;

    const input = {
      zillow: zOk ? { value: zl.v, asOf: zl.d, threeMonthsAgo: back(3)?.v ?? null } : null,
      redfin: redfinOk ? { monthsSupply: city.monthsSupply, inventory: city.inventory } : null,
      realtor: rOk ? { hotness: rc.hot.hotness } : null,
    };
    const b = blend(input);
    if (!b) { delete city.temperature; continue; }
    anyZillow ||= !!input.zillow; anyRealtor ||= !!input.realtor;

    const W = Object.fromEntries(b.parts.map((x) => [x.key, x]));
    const totalW = b.parts.reduce((a, x) => a + WEIGHTS[x.key], 0);
    const wPct = (k) => pct(WEIGHTS[k] / totalW);
    const lv = (key) => (W[key] ? levelFor(W[key].score).key : 'balanced');
    const readings = [];
    if (input.zillow) readings.push({ key: 'zillow', title: `Zillow Market Temperature Index: ${input.zillow.value}`, detail: `City, main driver (${wPct('zillow')}), as of ${long(input.zillow.asOf)}`, reading: zillowLabel(input.zillow.value).replace(' market', ''), level: lv('zillow') });
    if (input.redfin) readings.push({ key: 'redfin', title: `Redfin months of supply: ${city.monthsSupply.toFixed(1)}`, detail: `City (${wPct('redfin')}), ${city.inventory?.toLocaleString() ?? 'n/a'} listings, rolling 3 months to ${long(city.asOf)}`, reading: redfinLabel(city.monthsSupply).replace(' market', ''), level: lv('redfin') });
    if (input.realtor) {
      const c = rc.core; const rd = W.realtor.score < -0.4 ? 'Cool' : W.realtor.score > 0.4 ? 'Hot' : 'Middling';
      readings.push({ key: 'realtor', title: `Realtor.com ${countyName}: hotness ${rc.hot.hotness.toFixed(1)} of 100`, detail: `County (${wPct('realtor')})${c ? `, median ${Math.round(c.dom)} days listed, ${(c.priceReducedShare * 100).toFixed(1)}% price cuts (${rc.coreMonth.slice(0, 4)}-${rc.coreMonth.slice(4)})` : ''}`, reading: rd, level: lv('realtor') });
    }
    const dropped = ['zillow', 'redfin', 'realtor'].filter((k) => !W[k]);
    city.temperature = {
      score: b.score, level: b.level, label: b.label, tilt: b.tilt, mixed: b.mixed, confidence: b.confidence,
      trend: b.trend, small: isSmallMarket(city.inventory), readings,
      note: dropped.length ? `Left out of the blend because the data was missing or older than ${MAX_AGE_DAYS} days: ${dropped.join(', ')}.` : null,
      county: countyName || null,
      realtor: rc?.core ? { month: rc.coreMonth, dom: rc.core.dom, priceReducedShare: rc.core.priceReducedShare, active: rc.core.active } : null,
      zillow: input.zillow ? { value: input.zillow.value, asOf: input.zillow.asOf, threeMonthsAgo: input.zillow.threeMonthsAgo } : null,
    };
    if (history?.cities?.[p.slug] && zs.length) {
      const byMonth = new Map(zs.map((x) => [x.d.slice(0, 7), x.v]));
      for (const m of history.cities[p.slug].months) m.z = byMonth.get(m.m) ?? null;
    }
  }

  // sources shown under the gauge
  market.sources = (market.sources || []).filter((s) => !/Zillow Research|Realtor\.com Research/.test(s.name || s));
  if (anyZillow) market.sources.push({ name: 'Zillow Research', url: 'https://www.zillow.com/research/data/', note: 'Market Temperature Index' });
  if (anyRealtor) market.sources.push({ name: 'Realtor.com Research', url: 'https://www.realtor.com/research/data/', note: 'county hotness and listing activity' });
  market.temperatureMethod = `Blended from up to three sources: Zillow's Market Temperature Index (${pct(WEIGHTS.zillow)}), Redfin months of supply (${pct(WEIGHTS.redfin)}) and Realtor.com county hotness (${pct(WEIGHTS.realtor)}).`;
  writeFileSync(MARKET, JSON.stringify(market, null, 2) + '\n');
  if (history) { history.note = 'Redfin points are rolling 3-month figures. "z" is the Zillow Market Temperature Index (0-100, higher favors sellers).'; writeFileSync(HISTORY, JSON.stringify(history, null, 1) + '\n'); }
  log(`Temperature written for ${Object.values(market.cities).filter((c) => c.temperature).length} cities.`);
  return true;
}
