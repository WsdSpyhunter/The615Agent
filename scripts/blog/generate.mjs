// Writes one blog draft: picks a topic, has Claude write it from supplied facts, checks it, verifies links, picks photos,
// and saves drafts/<slug>.json. The workflow then commits the draft and runs send-proof.mjs to email you the proof.
//   node scripts/blog/generate.mjs [--topic t07] [--idea "your own topic"] [--date 2026-10-02] [--regenerate <draft-slug>]
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { appendFileSync } from 'node:fs';
import { readJson, writeJson, today, slugify, listDir, readPostMeta, words } from './lib.mjs';
import { pickTopic } from './topics.mjs';
import { buildContext } from './context.mjs';
import { system, user, reviewSystem } from './prompt.mjs';
import { complianceIssues } from './compliance.mjs';
import { ask, parseJson, MODEL } from './claude.mjs';
import { validatePost } from './validate.mjs';
import { resolveLinks } from './links.mjs';
import { choosePhotos } from './images.mjs';

const log = (...a) => console.log(...a);
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
const flag = (n) => process.argv.includes(`--${n}`);

const topicsFile = readJson('topics.json');
const topics = topicsFile.topics;
const posts = listDir('src/content/posts').filter((f) => f.endsWith('.md')).map((f) => ({ file: f, ...readPostMeta(`src/content/posts/${f}`) }));
const drafts = listDir('drafts').filter((f) => f.endsWith('.json')).map((f) => readJson(`drafts/${f}`)).filter(Boolean);

// regenerate: free the old draft's topic and delete the draft
const regen = arg('regenerate');
let topic = null, carriedDate = null;
if (regen) {
  const old = readJson(`drafts/${regen}.json`);
  carriedDate = old?.pubDate || null;
  if (old) { topic = topics.find((t) => t.id === old.topicId); if (topic) { topic.status = 'unused'; topic.slug = null; } try { unlinkSync(`drafts/${regen}.json`); } catch {} }
}
const market = readJson('public/data/market.json', {});
const marketOk = !!market.cities && !market.sample && !market.stale && Object.values(market.cities).some((c) => c.temperature);
if (!topic && arg('topic')) topic = topics.find((t) => t.id === arg('topic'));

// A topic of your own: Claude only classifies it (category, keyword, link tags); the post is then written and checked like any other.
if (!topic && arg('idea')) {
  const idea = arg('idea').trim().slice(0, 300);
  const vocab = [...new Set([...readJson('src/data/blog-links.json', []), ...readJson('src/data/blog-internal.json', [])].flatMap((l) => l.tags || []).concat(Object.keys(market.cities || {})))];
  const cats = ['Buyers', 'Sellers', 'Relocation', 'Investors', 'Market Update', 'New Construction', 'Schools', 'Cost of Living', 'Property Taxes', 'Commute'];
  const c = parseJson(await ask({ system: 'You classify a blog topic for a Tennessee real estate site. Return ONLY JSON: {"category": one of ' + JSON.stringify(cats) + ', "keyword": a 3 to 6 word search phrase, "related": [3 short related search terms], "linkTags": [up to 6 tags chosen ONLY from this list: ' + vocab.join(', ') + '], "type": "data" if the topic is mainly about current local market numbers, else "evergreen"}.', user: idea, maxTokens: 400 }));
  const n = topics.filter((t) => String(t.id).startsWith('c')).length + 1;
  topic = { id: `c${String(n).padStart(2, '0')}`, category: cats.includes(c.category) ? c.category : 'Buyers', type: c.type === 'data' ? 'data' : 'evergreen', idea, keyword: String(c.keyword || idea).slice(0, 80), related: (c.related || []).slice(0, 4), linkTags: (c.linkTags || []).filter((t) => vocab.includes(t)), status: 'unused', custom: true };
  topics.push(topic);
}
if (!topic) {
  const recent = [...posts.map((p) => ({ category: p.category, keyword: p.keyword, type: 'evergreen', date: p.pubDate })), ...drafts.map((d) => ({ category: d.category, keyword: d.keyword, type: topics.find((t) => t.id === d.topicId)?.type, date: d.created }))]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  topic = pickTopic({ topics, recent: [...topics.filter((t) => t.status === 'published' || t.status === 'draft').sort((a, b) => String(b.usedOn).localeCompare(String(a.usedOn))), ...recent].slice(0, 12), marketOk, date: today() });
}
if (!topic) { log('No unused topic is available. Add more to topics.json.'); process.exit(1); }
log(`Topic ${topic.id}: ${topic.idea}`);

// Only live posts may be mentioned: a pending or replaced draft is not on the site (this caused a reference to a post that never existed).
const existing = posts.map((p) => ({ title: p.title }));
const ctx = buildContext(topic, existing);

async function writePost() {
  let extra = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    let post;
    if (process.env.BLOG_FIXTURE) post = readJson(process.env.BLOG_FIXTURE);
    else post = parseJson(await ask({ system: system(), user: user(topic, ctx, extra) }));
    const issues = validatePost(post, ctx);
    let review = { ok: true, issues: [] };
    if (!issues.length && !process.env.BLOG_FIXTURE) {
      const reviewInput = `FACTS SUPPLIED:\n${ctx.factsText}\n\nPOST (markdown):\n# ${post.title}\n${post.body}\n\nFAQ:\n${post.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n')}`;
      let lastError = null;
      for (let t = 1; t <= 3; t++) {
        try { review = parseJson(await ask({ system: reviewSystem(), user: reviewInput, maxTokens: 3000 })); lastError = null; break; }
        catch (e) { lastError = e; log(`Compliance review attempt ${t} failed:`, e.message); }
      }
      if (lastError) review = { ok: true, issues: ['The automatic compliance review could not run; please read carefully.'] };
    }
    const all = [...issues, ...(review.ok ? [] : review.issues)];
    if (!all.length) return { post, review, attempt };
    log(`Attempt ${attempt} rejected:\n - ${all.join('\n - ')}`);
    extra = `\nYOUR PREVIOUS DRAFT WAS REJECTED FOR THESE REASONS. Fix every one and return the full JSON again:\n- ${all.join('\n- ')}\n`;
    if (attempt === 3) return { post, review: { ok: false, issues: all }, attempt, failed: true };
  }
}

const { post, review, failed } = await writePost();
const links = await resolveLinks(post.body, ctx);
log(`Links: ${links.outboundKept} outbound kept, ${links.dropped.length} dropped, ${links.internalKept} site links`);

const photos = await choosePhotos(post.imageQueries || [topic.keyword, topic.category, 'home'], process.env, log, { title: post.title, keyword: topic.keyword, category: topic.category });

// place inline photo markers after the 1st and 3rd section headings' first paragraph
let body = links.markdown;
const parts = body.split(/\n(?=##\s)/);
photos.inline.slice(0, 2).forEach((_, i) => {
  const idx = i === 0 ? 1 : Math.min(3, parts.length - 1);
  if (parts[idx]) parts[idx] = parts[idx].replace(/\n\n/, `\n\n{{img:${i}}}\n\n`);
});
body = parts.join('\n');

const slug = slugify(post.slug || post.title);
const pubDate = /^\d{4}-\d{2}-\d{2}$/.test(arg('date') || '') ? arg('date') : carriedDate;
const draft = {
  version: 1, slug, topicId: topic.id, created: today(), ...(pubDate ? { pubDate } : {}), status: 'draft',
  title: post.title.trim(), description: post.description.trim(), category: topic.category, keyword: topic.keyword,
  body, faq: post.faq, hero: photos.hero, inline: photos.inline.slice(0, 2), choices: photos.choices,
  checks: { words: words(body), linksChecked: links.checked, dropped: links.dropped, review, compliance: complianceIssues({ ...post, body: links.markdown }), dataPointsUsed: post.dataPointsUsed || [], model: MODEL, failedChecks: !!failed },
};
if (existsSync(`drafts/${slug}.json`)) draft.slug = `${slug}-${today()}`;
writeJson(`drafts/${draft.slug}.json`, draft);
topic.status = 'draft'; topic.slug = draft.slug; topic.usedOn = today();
writeJson('topics.json', topicsFile);
log(`Draft saved: drafts/${draft.slug}.json (${draft.checks.words} words)`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `slug=${draft.slug}\n`);
