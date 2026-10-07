// Runs when you press Approve: turns drafts/<slug>.json into a live post (photos downloaded and resized), then confirms by email.
//   node scripts/blog/publish.mjs publish <slug>   |   node scripts/blog/publish.mjs reject <slug>
import { mkdirSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs';
import sharp from 'sharp';
import { readJson, writeJson, today, SITE } from './lib.mjs';
import { confirmEmail } from './render-email.mjs';
import { sendEmail, emailConfigured } from './email.mjs';
import { complianceIssues } from './compliance.mjs';
import { unwrapTokens } from './links.mjs';

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

// Final gate: runs on the text as it is NOW, including any edits made in the editor. Hard problems stop the publish.
draft.body = unwrapTokens(draft.body).replace(/\[([^\]]+)\]\(\[[^\]]+\]\(([^)]+)\)\)/g, '[$1]($2)');
const gate = complianceIssues(draft);
if (gate.hard.length) {
  log(`NOT published. Realtor-rules checks failed:\n - ${gate.hard.join('\n - ')}`);
  if (emailConfigured()) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px"><h2>Not published: ${draft.title.replace(/</g, '&lt;')}</h2><p>The Realtor-rules checks found problems, so nothing went live. Open the draft's Edit link from the proof email (or ask for a Regenerate) and fix:</p><ul>${gate.hard.map((h) => `<li>${h.replace(/</g, '&lt;')}</li>`).join('')}</ul></div>`;
    try { await sendEmail({ to: process.env.APPROVAL_EMAIL || 'scott@hivenashville.com', subject: `NOT published (rules check): ${draft.title}`, html }); } catch (e) { log('Email failed:', e.message); }
  }
  writeJson(`drafts/${slug}.json`, draft);
  process.exit(0);
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
else if (draft.heroLocal) heroPath = draft.heroLocal.path; // a photo already on the site (used by the monthly report)
const inlinePaths = [];
for (let i = 0; i < (draft.inline || []).length; i++) inlinePaths.push(await download(draft.inline[i], `inline-${i + 1}`, 1000, 625));

let body = draft.body.replace(/\{\{img:(\d)\}\}/g, (all, n) => {
  const im = (draft.inline || [])[+n]; if (!im) return '';
  return `![${(im.alt || '').replace(/[\[\]]/g, '')}](${inlinePaths[+n]})\n\n*Photo by [${im.credit}](${im.creditUrl}) on [${im.provider || 'stock'}](${im.home || '#'})*`;
});

const fm = [
  '---', `title: ${q(draft.title)}`, `description: ${q(draft.description)}`, `pubDate: ${draft.pubDate || today()}`, `category: ${draft.category}`, `keyword: ${q(draft.keyword)}`,
  ...(draft.hero ? [`heroImage: ${heroPath}`, `heroAlt: ${q(draft.hero.alt)}`, `heroCredit: ${q(`${draft.hero.credit} on ${draft.hero.provider || 'stock'}`)}`, `heroCreditUrl: ${q(draft.hero.creditUrl)}`] : draft.heroLocal ? [`heroImage: ${heroPath}`, `heroAlt: ${q(draft.heroLocal.alt)}`] : []),
  ...((draft.faq || []).length ? ['faq:', ...draft.faq.flatMap((f) => [`  - q: ${q(f.q)}`, `    a: ${q(f.a)}`])] : []), '---', '',
].join('\n');
writeFileSync(`src/content/posts/${slug}.md`, fm + body.trim() + '\n');
unlinkSync(`drafts/${slug}.json`);
if (topic) { topic.status = 'published'; topic.usedOn = today(); }
writeJson('topics.json', topicsFile);
log(`Published src/content/posts/${slug}.md`);

const url = `${SITE}/blog/${slug}`;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\ntitle=${draft.title}\n`);
if (emailConfigured()) {
  try { await sendEmail({ to: process.env.APPROVAL_EMAIL || 'scott@hivenashville.com', subject: `Published: ${draft.title}`, html: confirmEmail(draft.title, url) }); log('Confirmation email sent.'); }
  catch (e) { log('Confirmation email failed:', e.message); }
}
