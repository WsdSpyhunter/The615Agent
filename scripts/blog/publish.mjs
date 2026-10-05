// Runs when you press Approve: turns drafts/<slug>.json into a live post (photos downloaded and resized), then confirms by email.
//   node scripts/blog/publish.mjs publish <slug>   |   node scripts/blog/publish.mjs reject <slug>
import { mkdirSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs';
import sharp from 'sharp';
import { readJson, writeJson, today, SITE } from './lib.mjs';
import { confirmEmail } from './render-email.mjs';
import { sendEmail } from './email.mjs';

const [cmd, slug] = process.argv.slice(2);
const log = console.log;
const topicsFile = readJson('topics.json');
const draft = readJson(`drafts/${slug}.json`);
if (!draft) { log(`No draft found for "${slug}". Already published or rejected?`); process.exit(0); }
const topic = topicsFile.topics.find((t) => t.id === draft.topicId);

if (cmd === 'reject') {
  unlinkSync(`drafts/${slug}.json`);
  if (topic) topic.status = 'rejected';
  writeJson('topics.json', topicsFile); log(`Rejected ${slug}.`); process.exit(0);
}

async function download(img, name, width, height) {
  const res = await fetch(img.url);
  if (!res.ok) throw new Error(`Photo download failed (${res.status}) for ${img.id}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const dir = `public/img/blog/${slug}`; mkdirSync(dir, { recursive: true });
  const pipe = sharp(buf).resize(width, height, { fit: 'cover' });
  await pipe.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(`${dir}/${name}.jpg`);
  await pipe.clone().webp({ quality: 76 }).toFile(`${dir}/${name}.webp`);
  return `/img/blog/${slug}/${name}.jpg`;
}

const q = (s) => JSON.stringify(String(s ?? ''));
let heroPath = '';
if (draft.hero) heroPath = await download(draft.hero, 'hero', 1200, 600);
const inlinePaths = [];
for (let i = 0; i < draft.inline.length; i++) inlinePaths.push(await download(draft.inline[i], `inline-${i + 1}`, 1000, 625));

let body = draft.body.replace(/\{\{img:(\d)\}\}/g, (all, n) => {
  const im = draft.inline[+n]; if (!im) return '';
  return `![${(im.alt || '').replace(/[\[\]]/g, '')}](${inlinePaths[+n]})\n\n*Photo by [${im.credit}](${im.creditUrl}) on [Pexels](https://www.pexels.com)*`;
});

const fm = [
  '---', `title: ${q(draft.title)}`, `description: ${q(draft.description)}`, `pubDate: ${today()}`, `category: ${draft.category}`, `keyword: ${q(draft.keyword)}`,
  ...(heroPath ? [`heroImage: ${heroPath}`, `heroAlt: ${q(draft.hero.alt)}`, `heroCredit: ${q(`${draft.hero.credit} on Pexels`)}`, `heroCreditUrl: ${q(draft.hero.creditUrl)}`] : []),
  'faq:', ...draft.faq.flatMap((f) => [`  - q: ${q(f.q)}`, `    a: ${q(f.a)}`]), '---', '',
].join('\n');
writeFileSync(`src/content/posts/${slug}.md`, fm + body.trim() + '\n');
unlinkSync(`drafts/${slug}.json`);
if (topic) { topic.status = 'published'; topic.usedOn = today(); }
writeJson('topics.json', topicsFile);
log(`Published src/content/posts/${slug}.md`);

const url = `${SITE}/blog/${slug}`;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\ntitle=${draft.title}\n`);
if (process.env.RESEND_API_KEY) {
  try { await sendEmail({ to: process.env.APPROVAL_EMAIL || 'scott@hivenashville.com', subject: `Published: ${draft.title}`, html: confirmEmail(draft.title, url) }); log('Confirmation email sent.'); }
  catch (e) { log('Confirmation email failed:', e.message); }
}
