// Re-checks a saved draft that was blocked only by a fixable problem (a meta description a few characters too long).
// It trims the description the same way generate.mjs now does, then runs the real compliance review on the post
// and saves the real result in the draft. It never marks a draft as passing by hand.
//   node scripts/blog/recheck.mjs <slug>
import { readJson, writeJson, listDir, readPostMeta } from './lib.mjs';
import { buildContext } from './context.mjs';
import { reviewSystem } from './prompt.mjs';
import { ask, parseJson } from './claude.mjs';
import { complianceIssues } from './compliance.mjs';
import { fitDescription } from './validate.mjs';

const slug = process.argv[2];
if (!/^[a-z0-9-]+$/.test(slug || '')) { console.log('Bad slug'); process.exit(1); }
const file = `drafts/${slug}.json`;
const d = readJson(file);
if (!d) { console.log('No such draft'); process.exit(1); }
const old = d.checks?.review?.issues || [];
const descIssue = (s) => /^Meta description is \d+ characters/.test(s);
const other = old.filter((s) => !descIssue(s));
if (d.checks?.review?.ok !== false) { console.log('Draft already passed; nothing to recheck.'); process.exit(0); }

d.description = fitDescription(d.description);
const issues = [];
if (d.description.length < 110 || d.description.length > 160) issues.push(`Meta description is ${d.description.length} characters; it must be about 130 to 155.`);
issues.push(...other);
issues.push(...complianceIssues({ title: d.title, description: d.description, body: d.body, faq: d.faq }).hard);

let review = { ok: !issues.length, issues };
if (!issues.length) {
  const topic = (readJson('topics.json').topics || []).find((t) => t.id === d.topicId);
  const posts = listDir('src/content/posts').filter((f) => f.endsWith('.md')).map((f) => ({ title: readPostMeta(`src/content/posts/${f}`).title }));
  const ctx = buildContext(topic, posts);
  const input = `FACTS SUPPLIED:\n${ctx.factsText}\n\nPOST (markdown):\n# ${d.title}\n${d.body}\n\nFAQ:\n${d.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n')}`;
  let err = null;
  for (let t = 1; t <= 3; t++) {
    try { review = parseJson(await ask({ system: reviewSystem(), user: input, maxTokens: 3000 })); err = null; break; }
    catch (e) { err = e; console.log(`Compliance review attempt ${t} failed:`, e.message); }
  }
  if (err) review = { ok: false, issues: ['The compliance review could not run on the recheck.'] };
}
d.checks.review = { ok: !!review.ok, issues: review.issues || [] };
d.checks.failedChecks = !review.ok;
writeJson(file, d);
console.log(review.ok ? `Recheck passed (description ${d.description.length} characters).` : `Recheck still failing:\n - ${(review.issues || []).join('\n - ')}`);
