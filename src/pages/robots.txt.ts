import type { APIRoute } from 'astro';

// While PUBLIC_NOINDEX is "true" (set in .github/workflows/deploy.yml for the test site), search engines are told to stay away.
// Remove that line at launch and this file serves the normal rules.
export const GET: APIRoute = ({ site }) => {
  const noindex = import.meta.env.PUBLIC_NOINDEX === 'true';
  const body = noindex
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site).toString()}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
