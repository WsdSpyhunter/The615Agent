// Verifies every outbound URL in the editable data files returns HTTP 200.
// Run: npm run check-links
// Some government sites block automated requests (403/429). Those are reported as "blocked" and
// should be opened in a browser once to confirm. Anything else that is not 200 is a failure.
import { readFileSync } from 'node:fs';

const urls = new Set();
const grab = (obj) => {
  if (Array.isArray(obj)) obj.forEach(grab);
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) (k === 'url' && typeof v === 'string') ? urls.add(v) : grab(v);
  }
};
for (const f of ['src/data/resources.json', 'src/data/areas.json']) grab(JSON.parse(readFileSync(f, 'utf8')));
urls.add('https://www.hud.gov/program_offices/fair_housing_equal_opp');
urls.add('https://www.zillow.com/profile/ScottDavisRealtor');

let bad = 0;
for (const url of urls) {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) link-check' } });
    const tag = res.status === 200 ? 'ok     ' : [403, 429].includes(res.status) ? 'blocked' : 'FAIL   ';
    if (tag === 'FAIL   ') bad++;
    console.log(`${tag} ${res.status} ${url}`);
  } catch (e) {
    bad++;
    console.log(`FAIL    --- ${url} (${e.message})`);
  }
}
console.log(bad ? `\n${bad} link(s) need attention.` : '\nAll links responded (blocked ones need a manual check).');
process.exit(bad ? 1 : 0);
