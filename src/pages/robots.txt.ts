import type { APIRoute } from 'astro';

// Served at /robots.txt. This is the only place robots.txt is generated (there is no file in public/).
export const GET: APIRoute = () => {
  const body = 'User-agent: *\nAllow: /\n\nSitemap: https://the615agent.com/sitemap-index.xml\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
