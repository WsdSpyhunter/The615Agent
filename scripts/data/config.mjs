// Which places the market data covers, and where each one falls back to if the city itself is missing.
// slug/name must match public/data/market.json and site.config.ts.
export const PLACES = [
  { slug: 'franklin', zillow: 'Franklin', name: 'Franklin', redfin: 'Franklin, TN', county: 'Williamson County, TN' },
  { slug: 'brentwood', zillow: 'Brentwood', name: 'Brentwood', redfin: 'Brentwood, TN', county: 'Williamson County, TN' },
  { slug: 'spring-hill', zillow: 'Spring Hill', name: 'Spring Hill', redfin: 'Spring Hill, TN', county: 'Williamson County, TN' },
  { slug: 'thompsons-station', zillow: 'Thompsons Station', name: "Thompson's Station", redfin: 'Thompsons Station, TN', county: 'Williamson County, TN' },
  { slug: 'nolensville', zillow: 'Nolensville', name: 'Nolensville', redfin: 'Nolensville, TN', county: 'Williamson County, TN' },
  { slug: 'nashville', zillow: 'Nashville', name: 'Nashville', redfin: 'Nashville, TN', county: 'Davidson County, TN' },
  { slug: 'columbia', zillow: 'Columbia', name: 'Columbia', redfin: 'Columbia, TN', county: 'Maury County, TN' },
  { slug: 'murfreesboro', zillow: 'Murfreesboro', name: 'Murfreesboro', redfin: 'Murfreesboro, TN', county: 'Rutherford County, TN' },
  // Nashville areas below are neighborhoods, not cities: Redfin neighborhood data, Zillow's index for their ZIP code(s), and Davidson County for Realtor.com.
  // They appear only in the Market Temperature tool and Market Data charts (not in the monthly report or newsletter) and have no pages of their own.
  { slug: 'east-nashville', area: true, name: 'East Nashville', redfinNeighborhood: 'East Nashville', zillowZips: ['37206'], county: 'Davidson County, TN', geography: 'East Nashville neighborhood' },
  { slug: 'donelson-hermitage', area: true, name: 'Donelson–Hermitage', redfinNeighborhood: 'Donelson-Hermitage-Old Hickory', zillowZips: ['37214', '37076'], county: 'Davidson County, TN', geography: 'Donelson-Hermitage-Old Hickory neighborhood' },
  { slug: 'bellevue', area: true, name: 'Bellevue', redfinNeighborhood: 'Bellevue', zillowZips: ['37221'], county: 'Davidson County, TN', geography: 'Bellevue neighborhood' },
];

// Redfin's current Data Center files (the older redfin_market_tracker files stopped updating in June 2026).
export const REDFIN_BASE = 'https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_data_center/housing_market/monthly';
// Data older than this is flagged on the site instead of being presented as current.
export const MAX_AGE_DAYS = 62;
export const HISTORY_MONTHS = 36;

// Zillow Research public files (Market Temperature Index). Free; credit Zillow and link to zillow.com/research/data.
export const ZILLOW_BASE = 'https://files.zillowstatic.com/research/public_csvs/market_temp_index';
// Realtor.com Research data library (county level). Free; credit Realtor.com and link to realtor.com/research/data.
export const REALTOR_CORE = 'https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_County_History.csv';
export const REALTOR_HOT = 'https://econdata.s3-us-west-2.amazonaws.com/Reports/Hotness/RDC_Inventory_Hotness_Metrics_County_History.csv';
