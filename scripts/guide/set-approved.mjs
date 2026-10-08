// Marks Franklin guide pages as approved for Google. Run by the guide-publish workflow when you press Approve in the email.
//   node scripts/guide/set-approved.mjs <slug|all>      (the hub page is "index")
import { readFileSync, writeFileSync } from 'node:fs';
const slug = process.argv[2];
const pages = JSON.parse(readFileSync('src/data/franklin-pages.json', 'utf8')).pages.filter((p) => p.live).map((p) => p.slug);
const all = ['index', ...pages];
const file = 'src/data/franklin-approved.json';
const cur = JSON.parse(readFileSync(file, 'utf8'));
const add = slug === 'all' ? all : all.includes(slug) ? [slug] : [];
if (!add.length) { console.log(`"${slug}" is not a live guide page.`); process.exit(1); }
cur.approved = [...new Set([...cur.approved, ...add])];
writeFileSync(file, JSON.stringify(cur, null, 1) + '\n');
console.log(`Approved for Google: ${add.join(', ')}`);
