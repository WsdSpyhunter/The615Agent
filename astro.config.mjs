import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import trailingSlash from './scripts/trailing-slash.mjs';
import { isIndexable, guideCitySlugs } from './src/data/franklin-guide.ts';

export default defineConfig({
  site: 'https://the615agent.com',
  integrations: [trailingSlash(), sitemap({ filter: (u) => { const parts = new URL(u).pathname.split('/').filter(Boolean); if (!guideCitySlugs.includes(parts[0])) return true; return isIndexable(parts[0], parts.slice(1).join('/')); } })],
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
});
