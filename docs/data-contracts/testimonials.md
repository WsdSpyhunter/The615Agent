# `public/data/testimonials.json`

Read by `<tpa-testimonials>`. In Phase B the Zillow (Bridge API) reviews job writes this file. Manual testimonials can be added by hand.

```jsonc
[
  {
    "quote": "What the client said",
    "name": "First name",
    "detail": "Bought in Franklin",
    "url": "https://www.zillow.com/profile/ScottDavisRealtor",   // optional "Verify" link
    "placeholder": false                                          // true while using sample cards
  }
]
```

Only publish reviews you have the right to use. Reviews from Zillow must come through Zillow's approved feed, not copied by hand.
