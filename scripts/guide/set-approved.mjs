// Marks guide pages as approved for Google. Run by the guide-publish workflow when you press Approve in the email.
//   node scripts/guide/set-approved.mjs <city>__<page>     (the hub page is <city>__index)
//   node scripts/guide/set-approved.mjs <city>__all        (every page of a city)
//   node scripts/guide/set-approved.mjs all                (every page of every enabled city)
// One small file per page (src/data/guide-approved/<city>__<page>.txt), so several approvals at once never collide.
import { writeFileSync, mkdirSync } from 'node:fs';
import { listAllPages } from './pages-list.mjs';
let key = process.argv[2] || '';
if (key && key !== 'all' && !key.includes('__')) key = `franklin__${key}`; // links in older Franklin proof emails carry just the page name
const all = listAllPages();            // ['franklin__index', 'franklin__housing-market', ...]
const add = key === 'all' ? all : key.endsWith('__all') ? all.filter((k) => k.startsWith(key.slice(0, -3))) : all.includes(key) ? [key] : [];
if (!add.length) { console.log(`"${key}" is not a live guide page.`); process.exit(1); }
mkdirSync('src/data/guide-approved', { recursive: true });
for (const k of add) writeFileSync(`src/data/guide-approved/${k}.txt`, 'approved\n');
console.log(`Approved for Google: ${add.join(', ')}`);
