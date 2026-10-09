// Saves a blog photo at full size (jpg + webp) plus smaller webp copies for phones (480 and 800 pixels wide),
// so a phone never downloads a 1200-pixel photo. The post template picks the right one with srcset.
import sharp from 'sharp';
export const SMALL_WIDTHS = [480, 800];
export async function savePhoto(buf, dir, name, width, height) {
  const pipe = sharp(buf).resize(width, height, { fit: 'cover' });
  await pipe.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(`${dir}/${name}.jpg`);
  await pipe.clone().webp({ quality: 76 }).toFile(`${dir}/${name}.webp`);
  for (const w of SMALL_WIDTHS) if (w < width) await sharp(buf).resize(w, Math.round((height * w) / width), { fit: 'cover' }).webp({ quality: 74 }).toFile(`${dir}/${name}-${w}.webp`);
}
