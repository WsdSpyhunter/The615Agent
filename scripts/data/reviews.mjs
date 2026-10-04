// Zillow reviews for Scott Davis through the Bridge API ("Zillow Reviews" dataset).
// Shows ONLY this agent's reviews, unedited, with a link back to the Zillow profile.
// Needs BRIDGE_API_TOKEN. Writes public/data/testimonials.json and public/data/reviews-summary.json.
import { readFileSync, writeFileSync } from 'node:fs';

const SCREEN_NAME = 'ScottDavisRealtor';
const PROFILE_FALLBACK = 'https://www.zillow.com/profile/ScottDavisRealtor';
const BASE = 'https://api.bridgedataoutput.com/api/v2/OData/reviews';
const OUT = 'public/data/testimonials.json';
const SUMMARY = 'public/data/reviews-summary.json';
const log = (...a) => console.log(...a);

const token = process.env.BRIDGE_API_TOKEN;
if (!token) { log('No BRIDGE_API_TOKEN, skipping reviews.'); process.exit(0); }

const get = async (path) => {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Bridge ${path.split('?')[0]} returned HTTP ${res.status}`);
  return res.json();
};

const ees = await get(`/Reviewees?$filter=${encodeURIComponent(`RevieweeScreenName eq '${SCREEN_NAME}'`)}`);
const reviewee = (ees.value || [])[0];
if (!reviewee) { log(`No Zillow reviewee found for ${SCREEN_NAME}. Leaving the testimonials as they are.`); process.exit(0); }
log(`Reviewee found: ${reviewee.ReviewCount} reviews, average ${reviewee.AverageReviewRating}`);
const profileUrl = reviewee.RevieweeProfileURL || PROFILE_FALLBACK;

const items = [];
let next = `/Reviews?$filter=${encodeURIComponent(`RevieweeKey eq '${reviewee.RevieweeKey}'`)}&$orderby=ReviewDate%20desc&$top=100`;
for (let page = 0; next && page < 20; page++) {
  const j = await get(next);
  items.push(...(j.value || []));
  next = j['@odata.nextLink'] ? j['@odata.nextLink'].replace(BASE, '') : null;
}
log(`Fetched ${items.length} review records`);

const clean = (s) => (s ?? '').toString().trim();
// Privacy: Zillow's data can include the client's street address. Only the city and state are published.
const STREET = /^\d+\s+.*?\b(St|Street|Dr|Drive|Rd|Road|Ave|Avenue|Ln|Lane|Ct|Court|Blvd|Boulevard|Cir|Circle|Way|Pl|Place|Pkwy|Parkway|Trl|Trail|Hwy|Highway|Ter|Terrace|Loop|Run|Pass|Path|Cv|Cove|Bend|Row|Walk)\b\.?\s*/i;
const cityOnly = (s) => {
  let v = clean(s).replace(/\s+/g, ' ');
  if (!v) return '';
  if (/^\d/.test(v)) v = v.replace(STREET, '');
  v = v.replace(/\b\d{5}(-\d{4})?\b/, '').replace(/[,\s]+$/, '').trim();
  return /^\d/.test(v) ? '' : v; // if a street number is still there, drop it rather than risk showing it
};
const reviews = items
  .filter((r) => clean(r.Description))
  .map((r) => {
    const place = cityOnly(r.PropertyLocationNames) || cityOnly(r.FreeFormLocation);
    const role = clean(r.ServiceProviderDesc);
    const detail = [role, place, r.ServiceYear || ''].filter(Boolean).join(' · ');
    return {
      quote: clean(r.Description),
      name: clean(r.ReviewerFullName) || clean(r.ReviewerScreenName) || 'Zillow reviewer',
      detail,
      rating: typeof r.Rating === 'number' ? r.Rating : null,
      date: clean(r.ReviewDate) || null,
      url: profileUrl,
      source: 'Zillow',
      placeholder: false,
    };
  });

if (!reviews.length) { log('No reviews with text. Leaving the testimonials as they are.'); process.exit(0); }
writeFileSync(OUT, JSON.stringify(reviews, null, 2) + '\n');
writeFileSync(SUMMARY, JSON.stringify({
  source: 'Zillow', profileUrl, reviewCount: reviewee.ReviewCount ?? reviews.length,
  averageRating: reviewee.AverageReviewRating ?? null, updated: new Date().toISOString().slice(0, 10),
}, null, 2) + '\n');
log(`Wrote ${reviews.length} reviews.`);
