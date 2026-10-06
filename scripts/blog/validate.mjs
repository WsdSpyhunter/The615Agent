import { words, numbersIn } from './lib.mjs';
import { BANNED } from './prompt.mjs';
import { complianceIssues } from './compliance.mjs';

const STEERING = /\b(good|great|best|top|bad|worst|safe|safest|dangerous|desirable|undesirable|prestigious|exclusive|upscale|ghetto|sketchy)\s+(school|schools|neighborhood|neighborhoods|area|areas|community|communities|district|districts)\b|\b(crime|crime rate)\b|\bfamily[- ]friendly\b|\bpeople like you\b|\bdemographic/i;

/** Returns a list of problems; an empty list means the post passes the automatic checks. */
export function validatePost(post, ctx) {
  const issues = [];
  const body = post.body || '';
  const wc = words(body);
  if (wc < 800 || wc > 1200) issues.push(`Body is ${wc} words; it must be 800 to 1,200.`);
  if (!post.title || post.title.length > 68) issues.push('Title is missing or longer than 68 characters.');
  if (!post.description || post.description.length < 110 || post.description.length > 160) issues.push(`Meta description is ${post.description?.length ?? 0} characters; it must be about 130 to 155.`);
  if (!Array.isArray(post.faq) || post.faq.length < 3 || post.faq.length > 5) issues.push('FAQ must have 3 to 5 questions.');
  if (!/\n##\s/.test('\n' + body)) issues.push('Body needs ## section headings.');
  if (/https?:\/\//i.test(body)) issues.push('Body contains a raw URL; use link tokens only.');
  const lower = (body + ' ' + post.title).toLowerCase();
  for (const b of BANNED) if (lower.includes(b)) issues.push(`Uses the banned phrase "${b}".`);
  if (/!\s/.test(body) && /\w!/.test(body)) issues.push('Uses an exclamation mark.');
  if (STEERING.test(body + ' ' + (post.faq || []).map((f) => f.q + ' ' + f.a).join(' '))) issues.push('Contains language that could read as steering (Fair Housing).');

  issues.push(...complianceIssues(post).hard);
  if (/\]\(\s*\[|\]\(\s*\{\{/.test(body)) issues.push('Link tokens are wrapped in markdown link syntax; use only {{link:ID|anchor text}}.');

  const tokens = [...body.matchAll(/\{\{link:([a-z0-9-]+)\|([^}]+)\}\}/g)];
  const outIds = new Set(ctx.outbound.map((l) => l.id)), inIds = new Set(ctx.inbound.map((l) => l.id));
  const unknown = tokens.filter((t) => !outIds.has(t[1]) && !inIds.has(t[1])).map((t) => t[1]);
  if (unknown.length) issues.push(`Unknown link IDs: ${unknown.join(', ')}.`);
  const outCount = tokens.filter((t) => outIds.has(t[1])).length, inCount = tokens.filter((t) => inIds.has(t[1])).length;
  if (outCount < 3 || outCount > 6) issues.push(`Needs 3 to 6 outbound links; has ${outCount}.`);
  if (inCount < 2) issues.push(`Needs at least 2 site-page links; has ${inCount}.`);

  // Every number must come from the supplied facts, or be a small count or a recent year.
  const allText = body + ' ' + (post.faq || []).map((f) => f.q + ' ' + f.a).join(' ');
  const marketNums = new Set(numbersIn(ctx.marketFacts.join(' ')));
  const bad = [];
  for (const n of numbersIn(allText.replace(/\{\{link:[^}]*\}\}/g, ''))) {
    const v = Number(n);
    const ok = ctx.allowedNumbers.has(n) || ctx.allowedNumbers.has(String(v)) || (Number.isInteger(v) && v >= 0 && v <= 12) || (Number.isInteger(v) && v >= 2024 && v <= 2030);
    if (!ok) bad.push(n);
  }
  if (bad.length) issues.push(`Numbers not found in the supplied facts: ${[...new Set(bad)].slice(0, 8).join(', ')}.`);
  const usedMarket = numbersIn(allText).some((n) => marketNums.has(n) && Number(n) > 12);
  if (ctx.marketFacts.length && !usedMarket) issues.push('Must include at least one real market number from the market facts.');
  return issues;
}
