// Marks Franklin guide pages as approved for Google. Run by the guide-publish workflow when you press Approve in the email.
//   node scripts/guide/set-approved.mjs <slug|all>      (the hub page is "index")
// One small file per page (src/data/franklin-approved/<slug>.txt), so several approvals at once never collide.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const slug = process.argv[2];
const pages = JSON.parse(readFileSync('src/data/franklin-pages.json', 'utf8')).pages.filter((p) => p.live).map((p) => p.slug);
const all = ['index', ...pages];
const add = slug === 'all' ? all : all.includes(slug) ? [slug] : [];
if (!add.length) { console.log(`"${slug}" is not a live guide page.`); process.exit(1); }
mkdirSync('src/data/franklin-approved', { recursive: true });
for (const s of add) writeFileSync(`src/data/franklin-approved/${s}.txt`, 'approved\n');
console.log(`Approved for Google: ${add.join(', ')}`);
