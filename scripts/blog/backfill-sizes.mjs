// One-off: adds the smaller phone-size copies (480 and 800 wide) for blog photos that were saved before this existed.
//   node scripts/blog/backfill-sizes.mjs
import { readdirSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { SMALL_WIDTHS } from './imgsizes.mjs';
let made = 0;
for (const slug of readdirSync('public/img/blog', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
  const dir = `public/img/blog/${slug}`;
  for (const f of readdirSync(dir).filter((f) => /^(hero|inline-\d)\.jpg$/.test(f))) {
    const name = f.replace('.jpg', ''); const meta = await sharp(`${dir}/${f}`).metadata();
    for (const w of SMALL_WIDTHS) {
      const out = `${dir}/${name}-${w}.webp`;
      if (w >= meta.width || existsSync(out)) continue;
      await sharp(`${dir}/${f}`).resize(w, Math.round((meta.height * w) / meta.width), { fit: 'cover' }).webp({ quality: 74 }).toFile(out); made++;
    }
  }
}
console.log(`Created ${made} smaller photo copies.`);
