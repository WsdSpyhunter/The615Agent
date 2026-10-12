// Adds the two photos to a report draft that is already saved, then the workflow emails a fresh proof.
//   node scripts/blog/add-report-photos.mjs <draft-slug>
import { readJson, writeJson } from './lib.mjs';
import { addReportPhotos } from './report-photos.mjs';
const slug = process.argv[2];
const draft = readJson(`drafts/${slug}.json`);
if (!draft || draft.kind !== 'report') { console.log(`"${slug}" is not a saved report draft.`); process.exit(1); }
writeJson(`drafts/${slug}.json`, await addReportPhotos(draft));
