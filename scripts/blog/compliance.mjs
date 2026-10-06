// Realtor-rules guardrails for blog posts. Deterministic checks (no AI) that run when a post is written AND again when you press Approve,
// so an edit cannot slip a violation through. "hard" rules block publishing; "soft" rules are flagged in the proof email for a human look.
// Basis: NAR Code of Ethics (Articles 1, 2, 12, 15 and the advertising Standards of Practice), the Fair Housing Act, Tennessee Real Estate
// Commission advertising rules, RESPA anti-kickback rules, and the post-settlement rules on compensation statements. This is a safety net, not legal advice.

const R = (id, hard, re, msg) => ({ id, hard, re, msg });

export const RULES = [
  // Fair Housing: language that signals a preference or limitation
  R('fh-preference', true, /\b(adults? only|no children|singles? only|bachelor|mature (?:adults?|couples?|buyers?)|empty[- ]nesters?|young professionals?|retirees?|perfect for (?:families|couples|singles|seniors)|ideal for (?:families|couples|singles|seniors)|(?:christian|jewish|muslim|catholic) (?:community|neighbou?rhood|area)|walking distance to (?:a )?(?:church|synagogue|mosque|temple)|able[- ]bodied|handicapped|exclusive neighbou?rhood|restricted (?:community|neighbou?rhood))\b/i, 'Fair Housing: wording that states or implies a preference or limitation about who should live somewhere.'),
  R('fh-steering', true, /\b(?:good|great|best|top|bad|worst|safe|safest|dangerous|desirable|undesirable|prestigious|upscale|sketchy|ghetto)\s+(?:schools?|neighbou?rhoods?|areas?|communit(?:y|ies)|districts?)\b|\bcrime(?: rate)?\b|\bfamily[- ]friendly\b|\bpeople like you\b|\bdemographics?\b|\b(?:white|black|hispanic|latino|asian|minority|minorities) (?:neighbou?rhoods?|areas?|communit(?:y|ies))\b/i, 'Fair Housing: language that could read as steering (rating areas or schools, crime, demographics).'),
  R('fh-term', false, /\bmaster (?:bed|bath|suite)/i, 'Prefer "primary bedroom/suite" over "master" (industry fair-housing guidance).'),
  R('fh-class', false, /\b(?:race|racial|religion|religious|disabled|disability|handicap|familial status|national origin|sexual orientation|gender identity|marital status|ethnic(?:ity)?)\b/i, 'Mentions a protected class. Fine in a Fair Housing explainer; confirm it is not describing who lives somewhere.'),

  // Honest advertising (Code of Ethics Article 12, Article 2) and no guarantees
  R('guarantee', true, /\bguarantee[ds]?\b|\brisk[- ]free\b|\bcan'?t lose\b|\bno[- ]brainer\b|\bsure thing\b|\bwithout (?:any )?risk\b|\bfoolproof\b/i, 'Guarantee or no-risk claim. Real estate outcomes cannot be guaranteed.'),
  R('prediction', true, /\b(?:prices?|values?|rates?|home values|the market|mortgage rates|inventory)\s+(?:will|are going to|is going to|are about to|is about to|are sure to)\s+(?:go |keep |continue |soon )?(?:up|down|rise|fall|drop|climb|crash|increase|decrease|soar|jump|surge)\b|\b(?:will|going to) appreciate\b|\bbest time (?:ever )?to (?:buy|sell)\b|\bnow is the time to (?:buy|sell)\b|\bbefore (?:it'?s|they'?re) too late\b|\bact now\b/i, 'Market or rate prediction, or pressure language, stated as fact.'),
  R('superlative', true, /(?:#\s?1\b|\bnumber (?:one|1)\b|\btop[- ](?:producing |rated )?(?:agent|realtor|producer|broker)s?\b|\bbest (?:agent|realtor|real estate agent|broker)s?\b|\baward[- ]winning\b|\bleading (?:agent|realtor|brokerage)\b|\b(?:most|highest) (?:successful|experienced|trusted) (?:agent|realtor)s?\b)/i, 'Unsubstantiated superlative or ranking about the agent or firm.'),
  R('sold-claims', true, /\b(?:just|recently|newly) (?:sold|listed)\b|\bi (?:just )?(?:sold|listed|closed)\b|\bnew listing\b|\bopen house (?:this|on)\b/i, 'Listing or sold claim. Posts must not advertise specific listings or sales (brokerage, MLS and Article 12 rules).'),
  R('address', true, /\b\d{2,5}\s+(?:[NSEW]\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Way|Pike|Pl|Place|Cir|Circle|Pkwy|Parkway)\b/, 'Looks like a specific street address. Never name a client property or a listing.'),
  R('client-info', true, /\b(?:my|one of my|a recent|a past) (?:client|clients|buyer|buyers|seller|sellers|customer)s?\b[^.]{0,80}\b(?:paid|bought|sold|saved|got|made|closed|offered)\b/i, 'Story about a client. Client information is confidential (Article 1); do not describe client deals.'),

  // Compensation and antitrust: commissions are negotiable and must not be described as set or free
  R('commission', true, /\bstandard commission\b|\bcommission (?:is|are) (?:set|fixed|standard|non-negotiable|always|typically)\b|\b(?:5|5\.5|6|2\.5|3)\s?%\s+commission\b|\bcommission of \d|\bfree (?:home )?(?:appraisal|valuation|inspection|staging|photos|market analysis)\b|\bat no (?:cost|charge)\b|\bzero commission\b|\bno[- ]commission\b|\bseller pays (?:both|the buyer'?s)\b|\bbuyer'?s? agent (?:is|gets|will be) paid by the seller\b|\bit(?:'?s| is) free (?:to|for) (?:buyers|you)\b/i, 'Compensation wording. Never describe commissions as set, standard or free; compensation is negotiable and must be stated accurately.'),
  R('rebate', true, /\b(?:rebate|cash[- ]?back|kickback|referral fee|we pay your closing|closing[- ]cost credit from (?:me|us))\b/i, 'Rebate, cash-back or referral-fee wording. These have specific disclosure and legal requirements; remove it.'),

  // Lending: no endorsements, no rate offers, no lending advice (RESPA, TILA advertising)
  R('lender', true, /\b(?:preferred|recommended|favou?rite|our|my) (?:lender|mortgage (?:broker|company|lender)|title company|inspector|attorney)\b/i, 'Endorsement of a lender, title company or other provider. Referral relationships raise RESPA and disclosure issues; use neutral language.'),
  R('lending-offer', true, /\b(?:as low as [\d.]+\s?(?:%|percent)?\s*(?:apr|interest|rate)|rates? (?:starting|from)|apr of|get (?:pre-?approved|approved) (?:in|within)|no money down|zero down)\b/i, 'Reads like a loan advertisement or offer. Rate or payment claims must come from the supplied facts and cannot be presented as an offer.'),
  R('advice', true, /\byou (?:should|must|need to|ought to) (?:refinance|sell now|buy now|invest|waive|skip (?:the )?inspection|pay cash|use a lender|stretch)\b|\bi (?:recommend|advise) (?:you )?(?:refinanc|waiv|skipping|buying now|selling now)/i, 'Directive legal, tax or lending advice. Explain how things work and point to professionals instead.'),

  // Fair dealing with other brokers and agents (Article 15)
  R('competitors', true, /\b(?:unlike|better than|worse than) (?:other|most|many|typical|traditional|big[- ]box) (?:agents?|realtors?|brokers?|brokerages?)\b|\b(?:other|most|many) (?:agents?|realtors?|brokers?) (?:will|won'?t|don'?t|never|only|just|lie|overprice)\b|\bdiscount brokers?\b|\bbad agents?\b/i, 'Disparages other agents or brokers (Article 15). Describe your own service only.'),

  // The REALTOR(R) trademark: member use, capital letters, registered mark
  R('realtor-mark', true, /(?<![A-Za-z])(?:[Rr]ealtors?)(?![A-Za-z®])|\bREALTORS?(?!®)\b(?![^<]*®)/, 'Use "REALTOR®" in capitals with the ® mark and only to refer to Scott as a member. Do not use "realtor" as a generic word for agents; use "agent" or "real estate agent".'),
];

const flatten = (p) => [p.title, p.description, p.body, ...(p.faq || []).flatMap((f) => [f.q, f.a])].filter(Boolean).join('\n').replace(/\{\{link:[^|}]*\|([^}]*)\}\}/g, '$1').replace(/\{\{img:\d\}\}/g, '');

/** Returns { hard: [..messages with matched text], soft: [..] } for a post or draft. */
export function complianceIssues(post) {
  const text = flatten(post);
  const out = { hard: [], soft: [] };
  for (const r of RULES) {
    const m = text.match(r.re);
    if (!m) continue;
    const quote = m[0].length > 60 ? m[0].slice(0, 57) + '...' : m[0];
    (r.hard ? out.hard : out.soft).push(`${r.msg} (found: "${quote}")`);
  }
  return out;
}

/** Plain-language list shown in the proof email so you can see exactly what was checked. */
export const CHECKLIST = [
  'Fair Housing: no steering, no preference or limitation language, no rating of schools or neighborhoods, no demographics',
  'Honest advertising (Article 12): no guarantees, no predictions stated as fact, no "#1" or "top agent" claims',
  'No listings, sold claims, addresses or client stories (Articles 1 and 12, MLS rules)',
  'Compensation: no "standard", set or free commission wording, no rebate or cash-back offers',
  'Lending: no loan offers, no endorsement of lenders or other providers (RESPA)',
  'No legal, tax or lending advice, no disparaging other agents (Article 15)',
  'REALTOR® mark used correctly; every number and rule traced to a supplied, dated source',
  'Footer on every post: your name, license, brokerage, Equal Housing statement and disclaimers',
];
