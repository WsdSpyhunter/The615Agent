# The615Agent.com

Website for Scott Davis, Realtor at Hive Nashville. Built with [Astro](https://astro.build) as a static site (very fast, free to host).

## Run it on your computer

```bash
npm install
npm run dev      # opens at http://localhost:4321
npm run build    # builds the finished site into /dist
```

## Built to be moved to a new design

The tools (market temperature, mortgage calculator, checklists, reviews, forms) are plug-and-play web components that read plain JSON files in `public/data/`. A redesign only restyles them with CSS variables. See `docs/WIDGETS.md`, and open `/widgets/demo.html` to see them in a different design.

## Where to change things

| I want to change... | Edit this file |
| --- | --- |
| Phone, email, license, brokerage, social links, Web3Forms key, Buttondown username, Cloudflare analytics token | `src/site.config.ts` |
| Menu items | `nav` in `src/site.config.ts` |
| Resource links | `src/data/resources.json` |
| Testimonials (placeholders are labeled) | `public/data/testimonials.json`, then set `showPlaceholderTestimonials` to `false` in `site.config.ts` once real ones are in |
| City guides (text, FAQ, links) | `src/data/areas.json` |
| Market numbers (replaced monthly automatically in Phase B) | `public/data/market.json` (format: `docs/data-contracts/market.md`) |
| Checklist wording (the online version) | `public/data/checklists.json` |
| Checklist PDFs | replace the files in `public/downloads/` keeping the same names |
| Blog posts | add a `.md` file to `src/content/posts/` (see the sample post for the format) |
| Colors and fonts | `src/styles/global.css` (the `:root` block at the top) |

Check that all outbound links still work: `npm run check-links`.

## Remove the sample blog post

`src/content/posts/getting-ready-to-buy-in-middle-tennessee.md` is a sample (`sample: true`). Delete it, or keep it as a real post.

## Enable IDX later (Phase 2)

There is no MLS search at launch. When your IDX provider gives you an embed snippet or a search URL:

1. Open `src/site.config.ts`.
2. Set `idx.enabled` to `true`.
3. Paste the provider's embed code into `idx.embedHtml`, or the search page URL into `idx.searchUrl`.

The search section then appears on the Buy page (`src/pages/buy.astro`). Do not scrape other websites' listings.

## Put the site online (GitHub Pages + Cloudflare + GoDaddy)

1. Push this repo to GitHub, then in the repo go to Settings, Pages, and set Source to **GitHub Actions**. Every push to `main` then deploys automatically (`.github/workflows/deploy.yml`).
2. The file `public/CNAME` already contains `the615agent.com`.
3. In Cloudflare, add the site `the615agent.com`. Cloudflare gives you two nameservers. In GoDaddy, set the domain's nameservers to those two.
4. In Cloudflare DNS add:
   - Four **A** records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - A **CNAME** for `www` pointing to `<your-github-username>.github.io`
5. In the repo's Pages settings, enter the custom domain `the615agent.com` and tick **Enforce HTTPS** once it is available.
6. In Cloudflare, set SSL/TLS to **Full** and turn on **Always Use HTTPS**.

(Check GitHub's current instructions for the IP addresses before you enter them: docs.github.com, "Managing a custom domain for your GitHub Pages site".)

## Secrets (never put these in the repo)

Added in the repo under Settings, Secrets and variables, Actions. Needed in later phases:

- `BRIDGE_API_TOKEN` (Zillow reviews, Phase B)
- `FRED_API_KEY` (mortgage rate, Phase B)
- `ANTHROPIC_API_KEY`, `PEXELS_API_KEY`, `RESEND_API_KEY` (blog automation, Phase C)

`.env.example` shows the names. Real values go in `.env` locally, which Git ignores.

## Not yet built (later phases)

- Phase B: monthly market data pipeline, charts, and live Zillow reviews.
- Phase C: automatic blog drafts with approval emails.
- Phase D: SEO launch checklist (Search Console, Google Business Profile).
