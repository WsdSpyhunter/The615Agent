// Adds two photos to a monthly report draft so a long run of numbers does not look sterile.
// Photos come from the same picker as the blog posts (Pixabay, each one checked by Claude: homes and neighborhoods only,
// no people, animals, vehicles or logos). They sit after the second city section and just before the last city section ends.
import { choosePhotos } from './images.mjs';

export const stripMarkers = (s) => s.replace(/\n*\{\{img:\d\}\}\n*/g, '\n\n');

export async function addReportPhotos(draft, log = console.log) {
  const photos = await choosePhotos(['suburban neighborhood Tennessee homes', 'house front porch', 'home exterior autumn'], process.env, log, { title: draft.title, keyword: draft.keyword, category: 'Market Update' });
  const picks = [photos.hero, ...photos.inline].filter(Boolean).slice(0, 2);
  if (!picks.length) { log('No report photos added (no photo key or no photo passed the check).'); return draft; }
  const parts = stripMarkers(draft.body).split(/\n(?=##\s)/);
  const where = parts.length > 4 ? [2, parts.length - 2] : [Math.max(1, parts.length - 2)];
  picks.forEach((_, i) => { if (where[i] != null && parts[where[i]]) parts[where[i]] = parts[where[i]].replace(/\s+$/, '') + `\n\n{{img:${i}}}\n`; });
  draft.body = parts.join('\n');
  draft.inline = picks; draft.choices = photos.choices;
  log(`Added ${picks.length} report photo(s).`);
  return draft;
}
