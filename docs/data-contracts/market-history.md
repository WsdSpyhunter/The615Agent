# `public/data/market-history.json`

Read by `<tpa-market-chart>`. Written by the same monthly job as `market.json`.

```jsonc
{
  "generated": "2026-10-04",
  "source": "Redfin Data Center",
  "cities": {
    "franklin": {
      "name": "Franklin",
      "geography": null,                 // e.g. "Williamson County (county)" when city data is missing
      "months": [                         // oldest first, up to 36 months; null where a month is missing
        { "m": "2026-05", "price": 860000, "dom": 43, "inv": 533, "ms": 3.3, "s2l": 98.2 }
      ]
    }
  }
}
```
