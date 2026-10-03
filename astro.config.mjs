import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://the615agent.com',
  integrations: [sitemap()],
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
});
