// Emails you the proof of a saved draft, with signed Approve / Edit / Regenerate / Reject buttons.
//   node scripts/blog/send-proof.mjs <slug>      (add --preview to write proof-preview.html instead of sending)
import { writeFileSync } from 'node:fs';
import { readJson } from './lib.mjs';
import { signToken } from './sign.mjs';
import { approvalEmail } from './render-email.mjs';
import { sendEmail } from './email.mjs';

const slug = process.argv[2];
const draft = readJson(`drafts/${slug}.json`);
if (!draft) { console.log(`No draft "${slug}".`); process.exit(1); }
const secret = process.env.APPROVAL_SECRET, worker = (process.env.WORKER_URL || '').replace(/\/$/, ''), to = process.env.APPROVAL_EMAIL || 'scott@hivenashville.com';
if (process.argv.includes('--preview') || !secret || !worker) {
  writeFileSync('proof-preview.html', approvalEmail(draft, { approve: '#', edit: '#', regenerate: '#', reject: '#' }));
  console.log('Wrote proof-preview.html (no email sent: preview mode, or APPROVAL_SECRET / WORKER_URL missing).');
  process.exit(process.argv.includes('--preview') ? 0 : 1);
}
const link = (path, act) => `${worker}/${path}?t=${signToken({ s: slug, a: act }, secret)}`;
const html = approvalEmail(draft, { approve: link('act', 'approve'), edit: link('edit', 'edit'), regenerate: link('act', 'regenerate'), reject: link('act', 'reject') });
await sendEmail({ to, subject: `Blog draft for approval: ${draft.title}`, html });
console.log(`Proof email sent to ${to}.`);
