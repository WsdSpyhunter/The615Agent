// Which places the market data covers, and where each one falls back to if the city itself is missing.
// slug/name must match public/data/market.json and site.config.ts.
export const PLACES = [
  { slug: 'franklin', name: 'Franklin', redfin: 'Franklin, TN', county: 'Williamson County, TN' },
  { slug: 'brentwood', name: 'Brentwood', redfin: 'Brentwood, TN', county: 'Williamson County, TN' },
  { slug: 'spring-hill', name: 'Spring Hill', redfin: 'Spring Hill, TN', county: 'Williamson County, TN' },
  { slug: 'thompsons-station', name: "Thompson's Station", redfin: 'Thompsons Station, TN', county: 'Williamson County, TN' },
  { slug: 'nolensville', name: 'Nolensville', redfin: 'Nolensville, TN', county: 'Williamson County, TN' },
  { slug: 'nashville', name: 'Nashville', redfin: 'Nashville, TN', county: 'Davidson County, TN' },
  { slug: 'columbia', name: 'Columbia', redfin: 'Columbia, TN', county: 'Maury County, TN' },
  { slug: 'murfreesboro', name: 'Murfreesboro', redfin: 'Murfreesboro, TN', county: 'Rutherford County, TN' },
];

// Redfin's current Data Center files (the older redfin_market_tracker files stopped updating in June 2026).
export const REDFIN_BASE = 'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_data_center/housing_market/monthly';
// Data older than this is flagged on the site instead of being presented as current.
export const MAX_AGE_DAYS = 62;
export const HISTORY_MONTHS = 36;
