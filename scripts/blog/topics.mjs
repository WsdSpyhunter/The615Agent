import { hashInt } from './lib.mjs';

/**
 * Pick the best unused topic. Rules:
 *  - never reuse a topic, or one whose keyword matches an existing post or draft
 *  - rotate categories (avoid the last 3), and aim for about one data-driven post in three
 *  - data-driven topics are skipped when the market data is missing, sample or stale
 */
export const RELOCATION_GAP = 7;
export function pickTopic({ topics, recent, history = recent, marketOk, date }) {
  const lastCats = recent.slice(0, 3).map((r) => r.category);
  const lastTypes = recent.slice(0, 3).map((r) => r.type);
  const wantData = lastTypes.filter((t) => t === 'data').length === 0; // no data post in the last 3 -> time for one
  const used = new Set(recent.map((r) => (r.keyword || '').toLowerCase()));
  // Relocation posts are tracked per city ("moving to Spring Hill" -> spring hill).
  //  - Priority zone: a city's "moving to" topic jumps the queue until that city has had a relocation post.
  //  - Waiting zone: for the next RELOCATION_GAP posts after a city's relocation post, no relocation topic for that SAME city is picked
  //    (other cities are not held back).
  //  - After that the city's topics are back in the normal rotation, with no priority.
  const CITIES = ["thompson's station", 'spring hill', 'murfreesboro', 'nolensville', 'brentwood', 'franklin', 'columbia', 'nashville', 'middle tennessee'];
  const cityOf = (x) => {
    if ((x.category || '') !== 'Relocation' && !/^moving to /i.test(x.keyword || '')) return null;
    const k = String(x.keyword || '').toLowerCase().replace(/[’]/g, "'");
    return CITIES.find((c) => k.includes(c.replace(/'/g, ''))) || CITIES.find((c) => k.includes(c)) || (/^moving to /i.test(k) ? k.replace(/^moving to /, '') : null);
  };
  const isMoving = (x) => /^moving to /i.test(x.keyword || '');
  const lastIdx = (city) => history.findIndex((h) => cityOf(h) === city); // 0 = the newest post, -1 = not in the recent history
  const cityDone = (city) => lastIdx(city) !== -1 || topics.some((t) => cityOf(t) === city && t.status !== 'unused');
  let best = null;
  for (const t of topics) {
    if (t.status !== 'unused') continue;
    if (used.has(t.keyword.toLowerCase())) continue;
    if (t.type === 'data' && !marketOk) continue;
    const city = cityOf(t);
    if (city && lastIdx(city) !== -1 && lastIdx(city) < RELOCATION_GAP) continue; // that city is in the waiting zone
    let score = 0;
    if (isMoving(t) && city && !cityDone(city)) score += 2.5 + (city === 'franklin' ? 0.4 : 0); // priority zone, Franklin first (a bonus, not a guarantee: the usual rule of not repeating a category within 3 posts still applies)
    if (!lastCats.includes(t.category)) score += 3;
    if ((t.type === 'data') === wantData) score += 2;
    // a data post for a city goes first for cities we have not covered yet
    score += (hashInt(t.id + date) % 100) / 100; // deterministic tie-break that varies by day
    if (!best || score > best.score) best = { t, score };
  }
  return best?.t ?? null;
}
