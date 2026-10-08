// The Franklin Real Estate Guide: hub plus a ring of pages.
// franklin-pages.json lists the pages (only live:true pages are linked, so the site never links to a page that does not exist).
// franklin-approved.json lists the pages you approved for Google. Approving in the email adds a page here; until then a page is noindex and left out of the sitemap.
// The hub page uses the name "index".
import pagesJson from './franklin-pages.json';
import approvedJson from './franklin-approved.json';

export const guidePages: { slug: string; label: string; live: boolean }[] = pagesJson.pages;
export const livePages = guidePages.filter((p) => p.live);
export const approved: string[] = approvedJson.approved;
export const isIndexable = (slug: string) => approved.includes(slug || 'index');
