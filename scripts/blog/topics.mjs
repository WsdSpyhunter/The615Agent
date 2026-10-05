import { hashInt } from './lib.mjs';

/**
 * Pick the best unused topic. Rules:
 *  - never reuse a topic, or one whose keyword matches an existing post or draft
 *  - rotate categories (avoid the last 3), and aim for about one data-driven post in three
 *  - data-driven topics are skipped when the market data is missing, sample or stale
 */
export function pickTopic({ topics, recent, marketOk, date }) {
  const lastCats = recent.slice(0, 3).map((r) => r.category);
  const lastTypes = recent.slice(0, 3).map((r) => r.type);
  const wantData = lastTypes.filter((t) => t === 'data').length === 0; // no data post in the last 3 -> time for one
  const used = new Set(recent.map((r) => (r.keyword || '').toLowerCase()));
  let best = null;
  for (const t of topics) {
    if (t.status !== 'unused') continue;
    if (used.has(t.keyword.toLowerCase())) continue;
    if (t.type === 'data' && !marketOk) continue;
    let score = 0;
    if (!lastCats.includes(t.category)) score += 3;
    if ((t.type === 'data') === wantData) score += 2;
    // a data post for a city goes first for cities we have not covered yet
    score += (hashInt(t.id + date) % 100) / 100; // deterministic tie-break that varies by day
    if (!best || score > best.score) best = { t, score };
  }
  return best?.t ?? null;
}
