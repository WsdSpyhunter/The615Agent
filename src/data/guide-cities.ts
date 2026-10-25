// City guides. Each city here gets the same set of pages at /<city>/... (see src/pages/[city]/[page].astro and src/guide/*).
// Everything city-specific lives in this file; the page templates stay the same for every city.
// To add a city: add it here (plus its Census ZIP data in public/data/census-acs.json), then send the guide proof email.
export type TaxScenario = { label: string; parts: { name: string; rate: number }[] };
export interface GuideCity {
  slug: string; name: string; enabled: boolean;
  zips: string[];                       // Franklin: all three ZIPs; others: their main ZIPs
  zipNote?: string; zipLead?: string;   // optional wording for a city with a long ZIP list (Nashville)
  peers: string[];                      // slugs shown in comparison cards/pages (must exist in market.json and census-acs.json)
  countyNote: string; hubFact: string;                   // one factual sentence about the county / county overlap
  tax: { kind?: 'split' | 'county' | 'metro'; year?: string; countyName?: string; rateSheetText?: string; extraSources?: { label: string; url: string; what?: string }[]; cityRate: number; cityLabel: string; scenarios: TaxScenario[]; sourceNote: string; cityRateSource: { label: string; url: string; short: string; what?: string }; costNote: string };
  schools: { intro: string; districts: { name: string; text: string; link: { label: string; url: string } }[]; sourcesNote: string; faqDistrict: { q: string; a: string }; faqFind: { q: string; a: string } };
}

const COUNTY_SHEET = { label: 'Williamson County 2026 Property Tax Rates', url: 'https://www.williamsoncounty-tn.gov/DocumentCenter/View/28580' };

export const guideCities: Record<string, GuideCity> = {
  franklin: {
    slug: 'franklin', name: 'Franklin', enabled: true,
    zips: ['37064', '37067', '37069'],
    peers: ['brentwood', 'spring-hill', 'thompsons-station'],
    countyNote: 'Franklin is in Williamson County.', hubFact: 'Franklin is the Williamson County seat.',
    tax: {
      cityRate: 0.296, cityLabel: 'City of Franklin',
      scenarios: [
        { label: 'In the Franklin Special School District', parts: [{ name: 'county', rate: 1.18 }, { name: 'school district', rate: 0.7673 }, { name: 'city', rate: 0.296 }] },
        { label: 'Outside the district', parts: [{ name: 'county', rate: 1.27 }, { name: 'city', rate: 0.296 }] },
      ],
      sourceNote: 'These are the 2026 rates listed on the county sheet. Rates are set each year, so check for updates.',
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
      sourceNote: 'These are the 2026 rates listed on the county sheet. Rates are set each year, so check for updates.',
      cityRateSource: { label: COUNTY_SHEET.label, url: COUNTY_SHEET.url, short: COUNTY_SHEET.label },
      costNote: ' (2026 tax year)',
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
  'spring-hill': {
    slug: 'spring-hill', name: 'Spring Hill', enabled: true,
    zips: ['37174'],
    peers: ['thompsons-station', 'columbia', 'nolensville'],
    countyNote: 'Spring Hill includes parts of both Williamson and Maury counties.', hubFact: 'Spring Hill includes parts of both Williamson and Maury counties.',
    tax: {
      kind: 'split', cityRate: 0.739, cityLabel: 'City of Spring Hill',
      scenarios: [
        { label: 'Williamson County side of Spring Hill', parts: [{ name: 'county', rate: 1.27 }, { name: 'city', rate: 0.739 }] },
        { label: 'Maury County side of Spring Hill', parts: [{ name: 'county', rate: 1.91 }, { name: 'city', rate: 0.739 }] },
      ],
      sourceNote: 'The Williamson County sheet and the Spring Hill city rate are for the 2026 tax year. The Maury County figure is the Tennessee Comptroller\'s 2025 county tax rate, the latest I found. Maury County is in a 2026 reappraisal year, when rates are reset, so the 2026 county rate may be lower.',
      cityRateSource: { label: 'City of Spring Hill tax rates', url: 'https://springhilltn.org/999/Tax-Rates', short: 'City of Spring Hill' },
      extraSources: [{ label: 'Maury County community profile (cites the Tennessee Comptroller, Division of Property Assessments)', url: 'https://www.mtida.org/images/uploads/county_files/Spring_Hill_Maury_County_2026.pdf' }],
      costNote: ' (2025 and 2026-27, the same in both counties)',
    },
    schools: {
      intro: 'Spring Hill is in both Williamson and Maury counties, so a Spring Hill address is zoned through Williamson County Schools or Maury County Public Schools, depending on which county the address is in. The most reliable way to find the zoned school for a home is each district\'s own lookup tool.',
      districts: [
        { name: 'Williamson County Schools', text: 'The district for the Williamson County side of Spring Hill. Use its school zones page to determine the zoned school for an address.', link: { label: 'Determine my zoned school ↗', url: 'https://www.wcs.edu/about-us/school-zones' } },
        { name: 'Maury County Public Schools', text: 'The district for the Maury County side of Spring Hill. Use its "Find my zoned school" tool to check an address.', link: { label: 'Find my zoned school ↗', url: 'https://www.mauryk12.org/67925_2' } },
      ],
      sourcesNote: 'wcs.edu and mauryk12.org',
      faqDistrict: { q: 'Which school district serves Spring Hill, TN?', a: 'Spring Hill includes parts of both Williamson and Maury counties, so an address is zoned through Williamson County Schools or Maury County Public Schools depending on the county it is in. Verify the exact address with the district.' },
      faqFind: { q: 'How do I find the zoned school for a Spring Hill address?', a: 'Use each district\'s own zoning tool: the Williamson County Schools school zones page or the Maury County Public Schools "Find my zoned school" tool. School assignment depends on the exact address, so verify it with the district for any home you are serious about.' },
    },
  },
  'thompsons-station': {
    slug: 'thompsons-station', name: "Thompson's Station", enabled: true,
    zips: ['37179'],
    peers: ['franklin', 'spring-hill', 'nolensville'],
    countyNote: "Thompson's Station is in Williamson County.", hubFact: "Thompson's Station is in Williamson County.",
    tax: {
      cityRate: 0.103, cityLabel: "Town of Thompson's Station",
      scenarios: [{ label: "Inside Thompson's Station town limits", parts: [{ name: 'county', rate: 1.30 }, { name: 'city', rate: 0.103 }] }],
      sourceNote: 'These are the 2026 rates listed on the county sheet. Rates are set each year, so check for updates.',
      cityRateSource: { label: COUNTY_SHEET.label, url: COUNTY_SHEET.url, short: COUNTY_SHEET.label },
      costNote: ' (2026 tax year)',
    },
    schools: {
      intro: "Thompson's Station addresses are zoned through Williamson County Schools, the county district. The most reliable way to find the zoned school for a home is the district's own lookup tool.",
      districts: [
        { name: 'Williamson County Schools', text: 'The county school district. Use its school zones page to determine the zoned school for an address.', link: { label: 'Determine my zoned school ↗', url: 'https://www.wcs.edu/about-us/school-zones' } },
      ],
      sourcesNote: 'wcs.edu',
      faqDistrict: { q: "Which school district serves Thompson's Station, TN?", a: "Thompson's Station addresses are zoned through Williamson County Schools. Use the district's school zones page to determine the zoned school for an address." },
      faqFind: { q: "How do I find the zoned school for a Thompson's Station address?", a: "Use the district's own zoning tool, the Williamson County Schools school zones page. School assignment depends on the exact address, so verify it with the district for any home you are serious about." },
    },
  },
  nolensville: {
    slug: 'nolensville', name: 'Nolensville', enabled: true,
    zips: ['37135'],
    peers: ['franklin', 'brentwood', 'thompsons-station'],
    countyNote: 'Nolensville is in Williamson County.', hubFact: 'Nolensville is in Williamson County.',
    tax: {
      cityRate: 0.34, cityLabel: 'Town of Nolensville',
      scenarios: [{ label: 'Inside Nolensville town limits', parts: [{ name: 'county', rate: 1.30 }, { name: 'city', rate: 0.34 }] }],
      sourceNote: 'These are the 2026 rates listed on the county sheet. Rates are set each year, so check for updates.',
      cityRateSource: { label: COUNTY_SHEET.label, url: COUNTY_SHEET.url, short: COUNTY_SHEET.label },
      costNote: ' (2026 tax year)',
    },
    schools: {
      intro: "Nolensville addresses are zoned through Williamson County Schools, the county district. The most reliable way to find the zoned school for a home is the district's own lookup tool.",
      districts: [
        { name: 'Williamson County Schools', text: 'The county school district. Use its school zones page to determine the zoned school for an address.', link: { label: 'Determine my zoned school ↗', url: 'https://www.wcs.edu/about-us/school-zones' } },
      ],
      sourcesNote: 'wcs.edu',
      faqDistrict: { q: 'Which school district serves Nolensville, TN?', a: "Nolensville addresses are zoned through Williamson County Schools. Use the district's school zones page to determine the zoned school for an address." },
      faqFind: { q: 'How do I find the zoned school for a Nolensville address?', a: "Use the district's own zoning tool, the Williamson County Schools school zones page. School assignment depends on the exact address, so verify it with the district for any home you are serious about." },
    },
  },
  columbia: {
    slug: 'columbia', name: 'Columbia', enabled: true,
    zips: ['38401'],
    peers: ['spring-hill', 'franklin', 'murfreesboro'],
    countyNote: 'Columbia is the Maury County seat.', hubFact: 'Columbia is the Maury County seat.',
    tax: {
      kind: 'county', countyName: 'Maury', rateSheetText: "the Tennessee Comptroller's data (published in the Maury County community profile)", year: '2025', cityRate: 0.8251, cityLabel: 'City of Columbia',
      scenarios: [{ label: 'Inside Columbia city limits', parts: [{ name: 'county', rate: 1.91 }, { name: 'city', rate: 0.8251 }] }],
      sourceNote: 'These are the 2025 rates, the latest I found in the Tennessee Comptroller data. Maury County is in a 2026 reappraisal year, when rates are reset, so the 2026 rates may be lower. Check with the Maury County Trustee.',
      cityRateSource: { label: 'Maury County community profile: Columbia (cites the Tennessee Comptroller, Division of Property Assessments)', url: 'https://www.mtida.org/images/uploads/county_files/Columbia_Maury_County_2026.pdf', short: 'Columbia community profile' },
      costNote: ' (2025 tax year)',
    },
    schools: {
      intro: "Columbia addresses are zoned through Maury County Public Schools, the county district. The most reliable way to find the zoned school for a home is the district's own lookup tool.",
      districts: [
        { name: 'Maury County Public Schools', text: 'The county school district. Use its "Find my zoned school" tool to check an address.', link: { label: 'Find my zoned school ↗', url: 'https://www.mauryk12.org/67925_2' } },
      ],
      sourcesNote: 'mauryk12.org',
      faqDistrict: { q: 'Which school district serves Columbia, TN?', a: "Columbia addresses are zoned through Maury County Public Schools. Use the district's \"Find my zoned school\" tool to check an address." },
      faqFind: { q: 'How do I find the zoned school for a Columbia address?', a: "Use the district's own zoning tool, the Maury County Public Schools \"Find my zoned school\" page. School assignment depends on the exact address, so verify it with the district for any home you are serious about." },
    },
  },
  murfreesboro: {
    slug: 'murfreesboro', name: 'Murfreesboro', enabled: true,
    zips: ['37127', '37128', '37129', '37130'],
    peers: ['franklin', 'columbia', 'nolensville'],
    countyNote: 'Murfreesboro is the Rutherford County seat.', hubFact: 'Murfreesboro is the Rutherford County seat.',
    tax: {
      kind: 'county', countyName: 'Rutherford', rateSheetText: 'the county and city sources below', year: '2026', cityRate: 0.7529, cityLabel: 'City of Murfreesboro',
      scenarios: [{ label: 'Inside Murfreesboro city limits', parts: [{ name: 'county', rate: 1.4885 }, { name: 'city', rate: 0.7529 }] }],
      sourceNote: 'These are the 2026 rates after the countywide reappraisal, which lowered both rates (the county from $1.8762 and the city from $0.9526). The city rate is the certified rate presented to the City Council on July 2, 2026, so check the final adopted figure with the city.',
      cityRateSource: { label: 'Rutherford County: Commission approves budget (06/22/2026)', url: 'https://rutherfordcountytn.gov/index.asp?DE=9E55DABD-BC79-4E81-9034-7AF7D59E85E0&SEC=19F331FD-79E1-48F0-A344-4BE43713B14D', short: 'Rutherford County', what: 'county rate' },
      extraSources: [{ label: 'City of Murfreesboro City Council meeting minutes, July 2, 2026', url: 'https://www.murfreesborotn.gov/AgendaCenter/ViewFile/Minutes/_07022026-2476', what: 'city rate' }],
      costNote: ' (2026 tax year)',
    },
    schools: {
      intro: "Depending on the address, Murfreesboro students attend Murfreesboro City Schools, a district for pre-kindergarten through sixth grade, or Rutherford County Schools. The most reliable way to find the zoned school for a home is to ask each district.",
      districts: [
        { name: 'Murfreesboro City Schools', text: 'A city district that focuses on pre-kindergarten through sixth grade. Its zone waiver page explains how families can request a school other than the zoned one.', link: { label: 'Zone waivers and registration ↗', url: 'https://www.cityschools.net/student-info/registration/zone-waivers-2026-27' } },
        { name: 'Rutherford County Schools', text: 'The county district. Its bus routes and school zones page is the place to start for zoning.', link: { label: 'Bus routes and school zones ↗', url: 'https://www.rcschools.net/o/od/page/bus-routes-and-school-zones' } },
      ],
      sourcesNote: 'cityschools.net and rcschools.net',
      faqDistrict: { q: 'Which school district serves Murfreesboro, TN?', a: 'Depending on the address, Murfreesboro students attend Murfreesboro City Schools, a district for pre-kindergarten through sixth grade, or Rutherford County Schools. Confirm the zoned school for an exact address with each district.' },
      faqFind: { q: 'How do I find the zoned school for a Murfreesboro address?', a: "Start with each district's own pages: Murfreesboro City Schools and the Rutherford County Schools bus routes and school zones page. School assignment depends on the exact address, so verify it with the district for any home you are serious about." },
    },
  },
  nashville: {
    slug: 'nashville', name: 'Nashville', enabled: true,
    zips: ['37013', '37076', '37115', '37138', '37203', '37204', '37205', '37206', '37207', '37208', '37209', '37210', '37211', '37212', '37214', '37215', '37216', '37217', '37218', '37221'],
    zipNote: 'This page lists the ZIP codes in Davidson County that have at least 10,000 residents, in numeric order.',
    zipLead: 'Davidson County ZIP codes with at least 10,000 residents, side by side, with Census numbers and no rankings.',
    peers: ['franklin', 'brentwood', 'murfreesboro'],
    countyNote: 'Nashville is the county seat of Davidson County, and the two share one consolidated Metro government.', hubFact: 'Nashville and Davidson County share one consolidated Metro government.',
    tax: {
      kind: 'metro', countyName: 'Davidson', year: '2026', rateSheetText: "Metro Nashville's FY2027 budget documents and Metro's property tax history",
      cityRate: 2.814, cityLabel: 'Metro Nashville (Urban Services District)',
      scenarios: [
        { label: 'Urban Services District (roughly inside the old city limits)', parts: [{ name: 'Metro combined', rate: 2.814 }] },
        { label: 'General Services District (the rest of Davidson County)', parts: [{ name: 'Metro combined', rate: 2.782 }] },
      ],
      sourceNote: 'The Urban Services District rate of $2.814 is the combined rate in Metro\'s FY2027 recommended budget, and the council set the 2026-27 rate the same as the current year\'s on June 16, 2026. The General Services District rate of $2.782 is from Metro\'s property tax history for the 2025 tax year and has not been listed separately for 2026, so check it with Metro.',
      cityRateSource: { label: 'Metro Nashville FY27 Budget Overview (combined tax rate)', url: 'https://www.nashville.gov/sites/default/files/2026-05/FY27_BudgetOverview.pdf', short: 'Metro Nashville FY27 budget', what: 'Urban Services District rate' },
      extraSources: [
        { label: 'Metro Nashville FY27 Appendix 4: Property Tax Tables', url: 'https://www.nashville.gov/sites/default/files/2026-05/FY27_Appendix4_PropertyTaxTables.pdf', what: 'rate history, including the General Services District rate' },
        { label: 'Nashville Banner: Metro Council approves the 2026-27 budget (June 16, 2026)', url: 'https://nashvillebanner.com/2026/06/16/metro-council-city-budget-grocery-tax/', what: 'rate unchanged' },
      ],
      costNote: ' (2026 tax year)',
    },
    schools: {
      intro: "Nashville addresses are zoned through Metro Nashville Public Schools, the county district. The most reliable way to find the zoned school for a home is the district's own Find My School tool.",
      districts: [
        { name: 'Metro Nashville Public Schools', text: 'The district for Nashville and Davidson County. Enter an address in its Find My School tool to see the zoned school. Optional and magnet schools use separate applications.', link: { label: 'Find my school ↗', url: 'https://www.mnps.org/students-families/register-for-school/find-my-school' } },
      ],
      sourcesNote: 'mnps.org',
      faqDistrict: { q: 'Which school district serves Nashville, TN?', a: "Nashville addresses are zoned through Metro Nashville Public Schools. Use the district's Find My School tool to see the zoned school for an address." },
      faqFind: { q: 'How do I find the zoned school for a Nashville address?', a: "Use the district's own Find My School tool on mnps.org. School assignment depends on the exact address, so verify it with the district for any home you are serious about." },
    },
  },
};
export const COUNTY_SHEET_LINK = COUNTY_SHEET;
export const enabledCities = Object.values(guideCities).filter((c) => c.enabled);

// Display names for every city the guides can mention (used for comparison page titles).
export const cityNames: Record<string, string> = { franklin: 'Franklin', brentwood: 'Brentwood', 'spring-hill': 'Spring Hill', 'thompsons-station': "Thompson's Station", nolensville: 'Nolensville', columbia: 'Columbia', murfreesboro: 'Murfreesboro', nashville: 'Nashville' };
