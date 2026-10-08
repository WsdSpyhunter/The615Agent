import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { INDEXABLE } from './src/data/franklin-guide.ts';

export default defineConfig({
  site: 'https://the615agent.com',
  integrations: [sitemap({ filter: (u) => INDEXABLE || !new URL(u).pathname.startsWith('/franklin') })],
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
});
