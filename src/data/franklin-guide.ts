// The Franklin Real Estate Guide: hub plus a ring of pages.
// franklin-pages.json lists the pages (only live:true pages are linked, so the site never links to a page that does not exist).
// src/data/franklin-approved/ holds one small file per page you approved for Google (one file each so several approvals at once never collide). Approving in the email adds a file here; until then a page is noindex and left out of the sitemap.
// The hub page uses the name "index".
import pagesJson from './franklin-pages.json';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const guidePages: { slug: string; label: string; live: boolean }[] = pagesJson.pages;
export const livePages = guidePages.filter((p) => p.live);
const dir = join(process.cwd(), 'src/data/franklin-approved');
export const approved: string[] = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.txt')).map((f) => f.slice(0, -4)) : [];
export const isIndexable = (slug: string) => approved.includes(slug || 'index');
