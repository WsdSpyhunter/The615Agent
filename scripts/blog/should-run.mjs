// Guard for the scheduled run: GitHub cron is in UTC, so the workflow starts twice and this decides which start counts.
// It runs when it is Mon/Wed/Fri between 8:00 and 9:59 AM Central and nothing was generated today. Manual runs (the Run button, or Regenerate in a proof email) always go ahead.
import { appendFileSync } from 'node:fs';
import { readJson, listDir } from './lib.mjs';

const out = (v, why) => { console.log(`run=${v} (${why})`); if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${v}\n`); };
if (['workflow_dispatch', 'repository_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) { out(true, 'manual run or Regenerate button'); process.exit(0); }
const now = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map((p) => [p.type, p.value]));
const day = `${parts.year}-${parts.month}-${parts.day}`, hour = +parts.hour % 24;
if (!['Mon', 'Wed', 'Fri'].includes(parts.weekday)) { out(false, `${parts.weekday} is not a posting day`); process.exit(0); }
if (hour < 8 || hour > 9) { out(false, `it is ${hour}:xx Central, not the 8 AM window`); process.exit(0); }
const topics = readJson('topics.json', { topics: [] }).topics;
const drafts = listDir('drafts').filter((f) => f.endsWith('.json')).map((f) => readJson(`drafts/${f}`));
if (topics.some((t) => t.usedOn === day && ['draft', 'published'].includes(t.status)) || drafts.some((d) => d?.created === day)) { out(false, 'already generated today'); process.exit(0); }
out(true, `${parts.weekday} ${hour}:xx Central`);
