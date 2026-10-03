# Plug-and-play widgets

The interactive tools on the site are built as **custom elements** (web components) that do not depend on the site's design, on Astro, or on any framework. If the design changes, you keep the tools and only restyle them.

```
src/widgets/
  market-temperature.ts   <tpa-market-temperature>   gauge, flame / snowflake, city selector, stats
  mortgage-calculator.ts  <tpa-mortgage-calculator>  payment, breakdown, amortization chart
  checklist.ts            <tpa-checklist>            tick-off checklists with saved progress
  testimonials.ts         <tpa-testimonials>         auto-scrolling review cards
  lead-form.ts            (behavior only)            sends any <form data-tpa-lead> to Web3Forms
  css/*.css               one small stylesheet per widget, driven by --tpa-* variables
  lib/data.ts             shared helpers
public/data/*.json        the data each widget reads (the "data contracts", see docs/data-contracts)
public/widgets/tpa-widgets.js + .css   the stand-alone bundle (created by `npm run build:widgets`)
public/widgets/demo.html  the same widgets in a totally different look, to prove the point
```

## Use them in any page or design

In an Astro layout the widgets are already loaded. In any other page (a new design, a different site, plain HTML):

```html
<link rel="stylesheet" href="/widgets/tpa-widgets.css">
<script type="module" src="/widgets/tpa-widgets.js"></script>

<tpa-market-temperature src="/data/market.json"></tpa-market-temperature>
<tpa-mortgage-calculator rate-src="/data/market.json" contact-url="/contact"></tpa-mortgage-calculator>
<tpa-checklist src="/data/checklists.json"></tpa-checklist>
<tpa-testimonials src="/data/testimonials.json"></tpa-testimonials>
```

Open `/widgets/demo.html` on the running site to see them in a completely different design.

## Restyle them with CSS variables

Every color, radius and font is a `--tpa-*` variable with a default. Set only what differs:

| Variable | Used for |
| --- | --- |
| `--tpa-font` | font family |
| `--tpa-primary`, `--tpa-primary-2` | main accent (buttons, selected states, progress bar) |
| `--tpa-accent`, `--tpa-warm` | secondary accents (gold, coral) |
| `--tpa-radius` | corner radius of the big panels |
| `--tpa-shadow` | panel shadow |
| `--tpa-panel-bg`, `--tpa-panel-fg`, `--tpa-panel-accent` | the dark panels (market panel, calculator results, review band text) |
| `--tpa-title-bg` | the Market Temperature title box |
| `--tpa-card-bg`, `--tpa-card-border`, `--tpa-input-bg`, `--tpa-text`, `--tpa-muted-light` | light cards and inputs (calculator inputs, checklist) |
| `--tpa-stat-bg`, `--tpa-stat-border`, `--tpa-chip-bg`, `--tpa-chip-border`, `--tpa-chip-fg`, `--tpa-muted` | small tiles and buttons inside dark panels |
| `--tpa-hot`, `--tpa-mid`, `--tpa-cold` | title and icon color for seller's / balanced / buyer's markets |
| `--tpa-gauge-seller`, `--tpa-gauge-balanced`, `--tpa-gauge-buyer`, `--tpa-needle` | the gauge arcs and needle |
| `--tpa-head-bg`, `--tpa-head-fg`, `--tpa-track`, `--tpa-rule` | checklist step headers, progress track, row rules |
| `--tpa-tcard-bg`, `--tpa-tcard-border` | review cards |
| `--tpa-cta-bg`, `--tpa-cta-fg` | the calculator's call-to-action button |

In this site the mapping lives in one place: the `:root` block at the top of `src/styles/global.css`.

## Attributes, methods and events

Each widget documents its attributes at the top of its `.ts` file. In short:

- `<tpa-market-temperature>`: `src`, `city`, `show-title`, `show-selector`. Method `select(slug)`. Events `tpa-market:ready`, `tpa-market:city`.
- `<tpa-mortgage-calculator>`: `rate-src`, `default-rate`, `default-price`, `default-down`, `default-tax`, `default-ins`, `contact-url`, `cta-label`, `cta`, `brand`. Event `tpa-mortgage:change`.
- `<tpa-checklist>`: `src`, `list`, `storage-key`, `tabs`, `labels`. Method `select(key)`. Event `tpa-checklist:progress`.
- `<tpa-testimonials>`: `src`, `show-placeholders`, `speed`.
- `lead-form`: add `data-tpa-lead` and `data-endpoint` to a form; include `[data-ok]` and `[data-err]` message elements.

Because they emit events, a new design can react to them (for example, change the page headline when the market city changes) without touching widget code.

## The data is separate from the design

Each widget reads plain JSON from `public/data/`. The monthly market-data pipeline (Phase B) only has to write `public/data/market.json` in the documented format, and the Zillow reviews feed only has to write `public/data/testimonials.json`. Neither knows anything about the design, so a redesign never requires touching the pipelines. Formats: `docs/data-contracts/`.

## Rules to keep it portable

1. A widget never imports anything from the site (`site.config.ts`, layouts, global CSS).
2. A widget's look comes only from `--tpa-*` variables and its own CSS file.
3. Anything site-specific (names, links, wording) comes in through attributes or JSON.
4. Pages and Astro components are thin wrappers that place the element and add headings around it.
