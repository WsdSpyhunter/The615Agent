# `public/data/market.json`

Read by `<tpa-market-temperature>` and `<tpa-mortgage-calculator>` (for the rate). The Phase B monthly pipeline writes this file. Nothing else needs to change.

```jsonc
{
  "stale": false,                          // true when the data is older than 62 days; the widget then warns visitors
  "note": "Redfin figures are rolling 3-month values ending on the as-of date.",
  "sample": false,                         // true shows a "Sample numbers" tag (placeholder data only)
  "asOf": "2026-09-30",                    // date the data describes
  "sources": [                             // every source used, shown (and linked) under the widget
    { "name": "Redfin Data Center", "url": "https://www.redfin.com/news/data-center/", "note": "median sale price, days on market..." }
    // a plain string is also accepted
  ],
  "mortgageRate30": 6.34,                  // percent, from FRED. null if unavailable
  "mortgageRateAsOf": "2026-10-01",        // week the rate is for
  "cities": {
    "franklin": {                          // slug, used by the city buttons and the "city" attribute
      "name": "Franklin",
      "monthsSupply": 3.4,                 // required. <4 seller, 4-6 balanced, >6 buyer
      "medianPrice": 925000,               // dollars, or null
      "yoy": 2.1,                          // percent change year over year, or null
      "dom": 28,                           // median days on market, or null
      "saleToList": 98.6,                  // percent, or null
      "inventory": 412,                    // active listings, or null
      "asOf": "2026-09-30",                // optional, overrides the file-level date for this city
      "geography": null                    // optional. If a city is missing, set e.g. "Williamson County" so it is labeled
    }
  }
}
```

Each city may also carry a blended `temperature` object (written by `scripts/data/temperature-build.mjs`):

```jsonc
"temperature": {
  "score": 0.09,                    // -2 (buyers) .. +2 (sellers)
  "level": "balanced",              // sellers | seller-leaning | balanced | buyer-leaning | buyers
  "label": "Balanced market", "tilt": null,   // or "buyers" / "sellers" when balanced but leaning
  "mixed": false,                   // sources disagree widely
  "small": false,                   // fewer than 150 active listings
  "confidence": "high",             // high = 3 sources, medium = 2, low = 1
  "trend": { "points": -6, "direction": "cooling" },     // Zillow index change over 3 months
  "readings": [ { "key": "zillow", "title": "...", "detail": "...", "reading": "Neutral", "level": "balanced" } ]
}
```
The widget falls back to Redfin's months of supply when `temperature` is missing. A source older than 62 days is left out of the blend.

Rules: never invent numbers; use `null` for anything the sources do not provide (the widget shows a dash). Every stat must be traceable to a source listed in `sources`.
