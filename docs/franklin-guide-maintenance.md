# Franklin Real Estate Guide: yearly upkeep

Market numbers (Redfin, Zillow, Realtor.com, Freddie Mac) refresh automatically with the monthly data job. These need a hand:

1. **Census numbers (once a year, about December).** The ACS 5-year release lands each December. Request a free key (api.census.gov/data/key_signup.html), copy it, and ask Claude to refresh `public/data/census-acs.json` (income, rent, home value, commute, housing age, value shares, ZIP codes). Update the vintage text on the pages if the years change.
2. **Property tax rates (once a year, about November to January).** County rates: Williamson County "Property Tax Rates" sheet (williamsoncounty-tn.gov, Trustee). City of Franklin rate: franklintn.gov budget pages (set each fiscal year, July 1). Update `CITY_TAX_RATE` in `src/lib-guide.ts` and the county constants (`R`) in `src/pages/franklin/property-taxes.astro`, plus the "2025 tax year" wording.
3. **School districts.** Re-check the Franklin Special School District school list (fssd.org) and the zoning tool links once a year.
4. **New pages.** Add them to `src/data/franklin-pages.json`, build, run the text through `scripts/blog/compliance.mjs`, then send the guide proof email (push a change to `.github/guide-proof-request`). Approving adds a file to `src/data/franklin-approved/`.
