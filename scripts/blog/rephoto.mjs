// Re-picks the photos of an already published post (hero + two inline), with the same Claude photo check used for new drafts.
//   node scripts/blog/rephoto.mjs <slug>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { ask, parseJson } from './claude.mjs';
import { choosePhotos } from './images.mjs';

const slug = process.argv[2];
const file = `src/content/posts/${slug}.md`;
let md;
try { md = readFileSync(file, 'utf8'); } catch { console.log(`No post "${slug}".`); process.exit(1); }
const fm = (k) => (md.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm')) || [])[1] || '';
const title = fm('title'), keyword = fm('keyword'), category = fm('category'), description = fm('description');

const q = parseJson(await ask({
  system: 'You write stock-photo search phrases for a Tennessee real estate blog post. Return ONLY JSON: {"queries": [three short phrases, 2 to 4 words each]}. The first is for a hero image and should show a home, a home exterior or the property type in the topic; the other two are inline images showing concrete things the post discusses. No people, no names, no places.',
  user: `Title: ${title}\nDescription: ${description}\nKeyword: ${keyword}`, maxTokens: 300,
}));
console.log('Queries:', q.queries.join(' | '));
const photos = await choosePhotos(q.queries, process.env, console.log, { title, keyword, category });
if (!photos.hero) { console.log('No suitable photo found; nothing changed.'); process.exit(0); }

const dir = `public/img/blog/${slug}`; mkdirSync(dir, { recursive: true });
async function save(img, name, w, h) {
  const buf = Buffer.from(await (await fetch(img.url)).arrayBuffer());
  const pipe = sharp(buf).resize(w, h, { fit: 'cover' });
  await pipe.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(`${dir}/${name}.jpg`);
  await pipe.clone().webp({ quality: 76 }).toFile(`${dir}/${name}.webp`);
}
const Q = (s) => JSON.stringify(String(s ?? ''));
await save(photos.hero, 'hero', 1200, 600);
md = md.replace(/^heroAlt:.*$/m, `heroAlt: ${Q(photos.hero.alt)}`)
  .replace(/^heroCredit:.*$/m, `heroCredit: ${Q(`${photos.hero.credit} on ${photos.hero.provider}`)}`)
  .replace(/^heroCreditUrl:.*$/m, `heroCreditUrl: ${Q(photos.hero.creditUrl)}`);
for (let i = 0; i < 2; i++) {
  const im = photos.inline[i]; if (!im) continue;
  await save(im, `inline-${i + 1}`, 1000, 625);
  const re = new RegExp(`!\\[[^\\]]*\\]\\(/img/blog/${slug}/inline-${i + 1}\\.jpg\\)(\\n\\n\\*Photo by .*\\*)?`);
  md = md.replace(re, `![${(im.alt || '').replace(/[\[\]]/g, '')}](/img/blog/${slug}/inline-${i + 1}.jpg)\n\n*Photo by [${im.credit}](${im.creditUrl}) on [${im.provider}](${im.home})*`);
}
writeFileSync(file, md);
console.log(`Updated photos for ${slug}: hero "${photos.hero.alt}"`);
