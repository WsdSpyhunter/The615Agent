// City guides. Each city here gets the same set of pages at /<city>/... (see src/pages/[city]/[page].astro and src/guide/*).
// Everything city-specific lives in this file; the page templates stay the same for every city.
// To add a city: add it here (plus its Census ZIP data in public/data/census-acs.json), then send the guide proof email.
export type TaxScenario = { label: string; parts: { name: string; rate: number }[] };
export interface GuideCity {
  slug: string; name: string; enabled: boolean;
  zips: string[];                       // Franklin: all three ZIPs; others: their main ZIPs
  peers: string[];                      // slugs shown in comparison cards/pages (must exist in market.json and census-acs.json)
  countyNote: string; hubFact: string;                   // one factual sentence about the county / county overlap
  tax: { cityRate: number; cityLabel: string; scenarios: TaxScenario[]; sourceNote: string; cityRateSource: { label: string; url: string; short: string }; costNote: string };
  schools: { intro: string; districts: { name: string; text: string; link: { label: string; url: string } }[]; sourcesNote: string; faqDistrict: { q: string; a: string }; faqFind: { q: string; a: string } };
}

const COUNTY_SHEET = { label: 'Williamson County 2025 Property Tax Rates', url: 'https://www.williamsoncounty-tn.gov/DocumentCenter/View/28580' };

export const guideCities: Record<string, GuideCity> = {
  franklin: {
    slug: 'franklin', name: 'Franklin', enabled: true,
    zips: ['37064', '37067', '37069'],
    peers: ['brentwood', 'spring-hill', 'thompsons-station'],
    countyNote: 'Franklin is in Williamson County.', hubFact: 'Franklin is the Williamson County seat.',
    tax: {
      cityRate: 0.296, cityLabel: 'City of Franklin',
      scenarios: [
        { label: 'In the Franklin Special School District', parts: [{ name: 'county', rate: 1.18 }, { name: 'school district', rate: 0.5873 }, { name: 'city', rate: 0.296 }] },
        { label: 'Outside the district', parts: [{ name: 'county', rate: 1.27 }, { name: 'city', rate: 0.296 }] },
      ],
      sourceNote: 'The 2025 sheet is the most recent I found, and 2026 rates may differ.',
      cityRateSource: { label: 'City of Franklin 2026-2027 budget', url: 'https://www.franklintn.gov/Home/Components/News/News/11755/83', short: 'City of Franklin' },
      costNote: ' (fiscal 2026, with the proposed fiscal 2027 budget unchanged)',
    },
    schools: {
      intro: 'Franklin addresses are served by two public school districts, and which one applies depends on the exact address. The Franklin Special School District runs eight schools for pre-kindergarten through eighth grade. Williamson County Schools is the county district. The most reliable way to find the zoned school for a home is each district\'s own lookup tool.',
      districts: [
        { name: 'Franklin Special School District', text: 'Eight schools for pre-kindergarten through eighth grade: Franklin Elementary, Freedom Intermediate, Freedom Middle, Johnson Elementary, Liberty Elementary, Moore Elementary, Poplar Grove Elementary and Poplar Grove Middle.', link: { label: 'District map and zoning ↗', url: 'https://www.fssd.org/about-us/district-map' } },
        { name: 'Williamson County Schools', text: 'The county school district. Use its school zones page to determine the zoned school for an address.', link: { label: 'Determine my zoned school ↗', url: 'https://www.wcs.edu/about-us/school-zones' } },
      ],
      sourcesNote: 'fssd.org and wcs.edu',
      faqDistrict: { q: 'Which school district serves Franklin, TN?', a: 'Two districts serve Franklin addresses: the Franklin Special School District, which runs eight schools for pre-kindergarten through eighth grade, and Williamson County Schools. Which one applies depends on the exact address.' },
      faqFind: { q: 'How do I find the zoned school for a Franklin address?', a: 'Use each district\'s own zoning tool: the Franklin Special School District\'s district map and Williamson County Schools\' school zones page. School assignment depends on the exact address, so verify it with the district for any home you are serious about.' },
    },
  },
  brentwood: {
    slug: 'brentwood', name: 'Brentwood', enabled: true,
    zips: ['37027'],
    peers: ['nolensville', 'spring-hill', 'thompsons-station'],
    countyNote: 'Brentwood is in Williamson County.', hubFact: 'Brentwood is in Williamson County.',
    tax: {
      cityRate: 0.19, cityLabel: 'City of Brentwood',
      scenarios: [{ label: 'Inside Brentwood city limits', parts: [{ name: 'county', rate: 1.30 }, { name: 'city', rate: 0.19 }] }],
      sourceNote: 'The 2025 sheet is the most recent I found, and 2026 rates may differ.',
      cityRateSource: { label: COUNTY_SHEET.label, url: COUNTY_SHEET.url, short: COUNTY_SHEET.label },
      costNote: ' (2025 tax year)',
    },
    schools: {
      intro: 'Brentwood addresses are zoned through Williamson County Schools, the county district. The most reliable way to find the zoned school for a home is the district\'s own lookup tool.',
      districts: [
        { name: 'Williamson County Schools', text: 'The county school district. Use its school zones page to determine the zoned school for an address.', link: { label: 'Determine my zoned school ↗', url: 'https://www.wcs.edu/about-us/school-zones' } },
      ],
      sourcesNote: 'wcs.edu',
      faqDistrict: { q: 'Which school district serves Brentwood, TN?', a: 'Brentwood addresses are zoned through Williamson County Schools. Use the district\'s school zones page to determine the zoned school for an address.' },
      faqFind: { q: 'How do I find the zoned school for a Brentwood address?', a: 'Use the district\'s own zoning tool, the Williamson County Schools school zones page. School assignment depends on the exact address, so verify it with the district for any home you are serious about.' },
    },
  },
};
export const COUNTY_SHEET_LINK = COUNTY_SHEET;
export const enabledCities = Object.values(guideCities).filter((c) => c.enabled);

// Display names for every city the guides can mention (used for comparison page titles).
export const cityNames: Record<string, string> = { franklin: 'Franklin', brentwood: 'Brentwood', 'spring-hill': 'Spring Hill', 'thompsons-station': "Thompson's Station", nolensville: 'Nolensville', columbia: 'Columbia', murfreesboro: 'Murfreesboro', nashville: 'Nashville' };
