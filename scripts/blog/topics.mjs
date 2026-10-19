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
  // "Moving to <city>" relocation posts: the first one jumps the queue. After one is published, none is picked for the next
  // RELOCATION_GAP posts, and when they return they compete like any other topic (no more priority).
  const isMoving = (x) => /^moving to /i.test(x.keyword || '');
  const lastMoving = history.findIndex(isMoving); // history = published posts and drafts, newest first; 0 = the newest post, -1 = none
  const movingDone = lastMoving !== -1 || topics.some((t) => isMoving(t) && t.status !== 'unused');
  const coolingDown = lastMoving !== -1 && lastMoving < RELOCATION_GAP;
  let best = null;
  for (const t of topics) {
    if (t.status !== 'unused') continue;
    if (used.has(t.keyword.toLowerCase())) continue;
    if (t.type === 'data' && !marketOk) continue;
    if (isMoving(t) && coolingDown) continue;
    let score = 0;
    if (isMoving(t) && !movingDone) score += 10 + (/franklin/i.test(t.keyword) ? 1 : 0); // priority zone, Franklin first
    if (!lastCats.includes(t.category)) score += 3;
    if ((t.type === 'data') === wantData) score += 2;
    // a data post for a city goes first for cities we have not covered yet
    score += (hashInt(t.id + date) % 100) / 100; // deterministic tie-break that varies by day
    if (!best || score > best.score) best = { t, score };
  }
  return best?.t ?? null;
}
