// One place for everything you may want to change.
export const site = {
  name: 'The 615 Agent',
  url: 'https://the615agent.com',
  agent: 'Scott Davis',
  title: 'Realtor',
  brokerage: 'Hive Nashville',
  license: 'TN License #369664',
  licenseNumber: '369664',
  brokerLicense: '265453',
  phone: '(615) 326-4055',
  phoneHref: '+16153264055',
  email: 'scott@hivenashville.com',
  brokeragePhone: '(615) 579-8474',
  serviceArea: 'Williamson County and Middle Tennessee',
  tagline: 'Buying and selling across Middle Tennessee',
  social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    zillow: 'https://www.zillow.com/profile/ScottDavisRealtor',
  },
  // Public Web3Forms access key (safe in page code; it can only send to your email).
  web3formsKey: 'fb6d20db-acfa-46b8-bb9b-bc90dd526eb7',
  // Buttondown newsletter username for the monthly market report. Update when the new account exists.
  buttondownUser: 'the615agentNL',
  // Cloudflare Web Analytics token (public). Leave empty until you create it.
  cloudflareAnalyticsToken: '',
  // Show placeholder testimonials until real ones are in src/data/testimonials.json
  showPlaceholderTestimonials: true,
  // PHASE 2: IDX / MLS search.
  // When your IDX provider gives you an embed snippet or a search URL, set enabled to true
  // and paste it into embedHtml (iframe/script) or searchUrl. See README "Enable IDX".
  idx: {
    enabled: false,
    searchUrl: '',
    embedHtml: '',
  },
};

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Market Data', href: '/market-data' },
  { label: 'Mortgage Calculator', href: '/mortgage-calculator' },
  { label: 'Checklists', href: '/checklists' },
  { label: 'Blog', href: '/blog' },
  { label: 'Resources', href: '/resources' },
  { label: 'About', href: '/about' },
];

export const areas = [
  { slug: 'franklin', name: 'Franklin', tint: 'blue', blurb: 'Historic downtown and the Williamson County seat, with a wide mix of home styles.' },
  { slug: 'brentwood', name: 'Brentwood', tint: 'gold', blurb: 'Established neighborhoods just south of Nashville with quick access to the city.' },
  { slug: 'spring-hill', name: 'Spring Hill', tint: 'teal', blurb: 'A growing city along I-65 with many newer communities and new construction.' },
  { slug: 'thompsons-station', name: "Thompson's Station", tint: 'coral', blurb: 'More space and newer communities on the southern edge of Williamson County.' },
  { slug: 'nolensville', name: 'Nolensville', tint: 'blue', blurb: 'A small-town feel on the Williamson County line, with steady growth.' },
  { slug: 'columbia', name: 'Columbia', tint: 'coral', blurb: 'The Maury County seat, just south of Spring Hill.' },
  { slug: 'murfreesboro', name: 'Murfreesboro', tint: 'gold', blurb: 'The Rutherford County seat, southeast of Nashville.' },
] as const;

export type Area = (typeof areas)[number];
