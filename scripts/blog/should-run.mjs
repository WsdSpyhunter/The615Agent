// Guard for the scheduled run: GitHub cron is in UTC, so the workflow starts twice and this decides which start counts.
// It runs on a weekday between 8:00 AM and 7:59 PM Central when the newest draft is at least 3 days old and fewer than 3 drafts are waiting for approval. The schedule fires every weekday (GitHub sometimes starts a scheduled run hours late, or drops it), so a missed Monday or Thursday is made up the next day instead of leaving a gap of a week. Manual runs (the Run button, or Regenerate in a proof email) always go ahead.
import { appendFileSync } from 'node:fs';
import { readJson, listDir } from './lib.mjs';

const out = (v, why) => { console.log(`run=${v} (${why})`); if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${v}\n`); };
if (['workflow_dispatch', 'repository_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) { out(true, 'manual run or Regenerate button'); process.exit(0); }
const now = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map((p) => [p.type, p.value]));
const day = `${parts.year}-${parts.month}-${parts.day}`, hour = +parts.hour % 24;
if (['Sat', 'Sun'].includes(parts.weekday)) { out(false, `${parts.weekday} is not a posting day`); process.exit(0); }
if (hour < 8 || hour > 19) { out(false, `it is ${hour}:xx Central, outside the 8 AM to 8 PM window`); process.exit(0); }
const topics = readJson('topics.json', { topics: [] }).topics;
const drafts = listDir('drafts').filter((f) => f.endsWith('.json')).map((f) => readJson(`drafts/${f}`));
if (topics.some((t) => t.usedOn === day && ['draft', 'published'].includes(t.status)) || drafts.some((d) => d?.created === day)) { out(false, 'already generated today'); process.exit(0); }
const pending = drafts.filter((d) => d && d.status === 'draft').length;
if (pending >= 3) { out(false, `${pending} drafts are already waiting for approval`); process.exit(0); }
const last = [...topics.filter((t) => ['draft', 'published'].includes(t.status)).map((t) => t.usedOn), ...drafts.map((d) => d?.created)].filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '')).sort().pop();
const daysSince = last ? Math.round((Date.parse(day) - Date.parse(last)) / 86400000) : 99;
const needed = parts.weekday === 'Fri' ? 2 : 3; // Friday counts one day early because Saturday and Sunday never run
if (daysSince < needed) { out(false, `last draft was ${daysSince} day(s) ago; the next one is due after ${needed} days`); process.exit(0); }
out(true, `${parts.weekday} ${hour}:xx Central, last draft ${daysSince} days ago`);
