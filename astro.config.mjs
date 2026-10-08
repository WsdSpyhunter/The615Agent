import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { isIndexable } from './src/data/franklin-guide.ts';

export default defineConfig({
  site: 'https://the615agent.com',
  integrations: [sitemap({ filter: (u) => (() => { const p = new URL(u).pathname.replace(/\/$/, ''); if (!p.startsWith('/franklin')) return true; return isIndexable(p.slice('/franklin'.length).replace(/^\//, '')); })() })],
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
});
