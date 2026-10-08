// The Franklin Real Estate Guide: hub plus a ring of pages. Add a page here when it ships.
// Only pages with live:true are linked, so the site never links to a page that does not exist.
// Set INDEXABLE to true only after the page copy has been approved.
export const INDEXABLE = false;

export const guidePages = [
  { slug: 'housing-market', label: 'Housing market', live: true },
  { slug: 'home-prices', label: 'Home prices', live: true },
  { slug: 'neighborhoods', label: 'Neighborhoods', live: false },
  { slug: 'property-taxes', label: 'Property taxes', live: false },
  { slug: 'schools', label: 'Schools', live: false },
  { slug: 'commute', label: 'Commute', live: false },
  { slug: 'cost-of-living', label: 'Cost of living', live: false },
  { slug: 'new-construction', label: 'New construction', live: false },
  { slug: 'buying-in-franklin', label: 'Buying in Franklin', live: true },
  { slug: 'selling-in-franklin', label: 'Selling in Franklin', live: false },
];
export const livePages = guidePages.filter((p) => p.live);
