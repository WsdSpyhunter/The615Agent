// Market temperature: one plain-English reading per place, blended from independent free sources.
// Zillow's Market Temperature Index is the main driver (55%), Redfin months of supply is the second reading (30%),
// and Realtor.com's county "hotness" is the third (15%; it compares counties nationwide, so it counts least). Every source's own reading is kept so the page can show its work.
//
// Scale for the blended score: +2 strongly favors sellers ... -2 strongly favors buyers.

export const WEIGHTS = { zillow: 0.55, redfin: 0.3, realtor: 0.15 };
const clamp = (v, lo = -2, hi = 2) => Math.max(lo, Math.min(hi, v));

// Each source is converted to the same -2..+2 scale.
export const zillowScore = (z) => clamp((z - 49.5) / 15);       // 49.5 = middle of Zillow's neutral band
export const redfinScore = (mos) => clamp((5 - mos) / 1.5);      // 5 months = middle of the usual 4-6 month balanced range
export const realtorScore = (h) => clamp((h - 50) / 20);         // Realtor.com hotness is 0-100, about 50 is the national middle

export const LEVELS = [
  { key: 'sellers', min: 1.0, label: "Seller's market" },
  { key: 'seller-leaning', min: 0.4, label: 'Leans toward sellers' },
  { key: 'balanced', min: -0.4, label: 'Balanced market' },
  { key: 'buyer-leaning', min: -1.0, label: 'Leans toward buyers' },
  { key: 'buyers', min: -Infinity, label: "Buyer's market" },
];
export const levelFor = (score) => LEVELS.find((l) => score >= l.min);

/** Zillow's own published label for an index value. */
export const zillowLabel = (z) => (z >= 70 ? "Strong seller's market" : z >= 55 ? "Seller's market" : z >= 44 ? 'Neutral market' : z >= 28 ? "Buyer's market" : "Strong buyer's market");
export const redfinLabel = (m) => (m < 4 ? "Seller's market" : m <= 6 ? 'Balanced market' : "Buyer's market");

/**
 * input: { zillow: {value, threeMonthsAgo, yearAgo}|null, redfin: {monthsSupply, inventory}|null, realtor: {hotness, dom, priceReducedShare}|null }
 * Missing sources are dropped and the remaining weights are re-scaled; with fewer than two sources the result is marked low confidence.
 */
export function blend(input) {
  const parts = [];
  if (input.zillow?.value != null) parts.push({ key: 'zillow', score: zillowScore(input.zillow.value), weight: WEIGHTS.zillow });
  if (input.redfin?.monthsSupply != null) parts.push({ key: 'redfin', score: redfinScore(input.redfin.monthsSupply), weight: WEIGHTS.redfin });
  if (input.realtor?.hotness != null) parts.push({ key: 'realtor', score: realtorScore(input.realtor.hotness), weight: WEIGHTS.realtor });
  if (!parts.length) return null;
  const w = parts.reduce((a, p) => a + p.weight, 0);
  const score = parts.reduce((a, p) => a + p.score * p.weight, 0) / w;
  const city = parts.filter((p) => p.key !== 'realtor'); // the two city-level readings
  const spread = city.length === 2 ? Math.abs(city[0].score - city[1].score) : 0;
  const level = levelFor(score);
  let trend = null;
  const zNow = input.zillow?.value, zThen = input.zillow?.threeMonthsAgo;
  if (zNow != null && zThen != null) { const d = zNow - zThen; trend = { points: d, direction: d <= -3 ? 'cooling' : d >= 3 ? 'heating' : 'steady' }; }
  const tilt = level.key === 'balanced' ? (score <= -0.1 ? 'buyers' : score >= 0.1 ? 'sellers' : null) : null;
  return {
    score: +score.toFixed(2), level: level.key, label: level.label, tilt,
    mixed: spread >= 1.2, confidence: parts.length >= 3 ? 'high' : parts.length === 2 ? 'medium' : 'low',
    trend, parts: parts.map((p) => ({ ...p, score: +p.score.toFixed(2) })),
  };
}

/** Small places swing a lot from month to month. */
export const isSmallMarket = (inventory) => inventory != null && inventory < 150;
