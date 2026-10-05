# `public/data/market-weekly.json`

Read by `<tpa-market-weekly>`. Written by `scripts/data/update-weekly.mjs` whenever Redfin publishes a new weekly file.

```jsonc
{
  "region": "Nashville metro area",
  "frequency": "Rolling 4 weeks, updated weekly",
  "asOf": "2026-09-27",            // last day of the 4-week window
  "periodBegin": "2026-08-31",
  "source": { "name": "Redfin Data Center", "url": "https://www.redfin.com/news/data-center/" },
  "latest": { "medianPrice": 461491, "yoy": 2.55, "dom": 68, "saleToList": 97.79, "monthsSupply": 5.6,
              "homesSold": 2471, "activeListings": 17927, "newListings": 3897, "pending": 2397 },
  "history": [ /* the last 26 windows, same fields plus periodBegin/periodEnd */ ]
}
```
