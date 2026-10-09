// Approval for Google. src/data/guide-approved/ holds one small file per approved page, named <city>__<page>.txt
// (the hub page is "<city>__index.txt"). One file each so several approvals at once never collide.
// Until a page is approved it is noindex and left out of the sitemap.
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pagesFor } from './guide-pages.ts';
import { guideCities } from './guide-cities.ts';

const dir = join(process.cwd(), 'src/data/guide-approved');
export const approved: string[] = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.txt')).map((f) => f.slice(0, -4)) : [];
export const isIndexable = (city: string, slug: string) => approved.includes(`${city}__${slug || 'index'}`);
// The page links shown under a city's guide title. Every page in the template is live for every enabled city.
export const livePagesFor = (city: string) => pagesFor(city);
export const guideCitySlugs = Object.keys(guideCities).filter((c) => guideCities[c].enabled);
