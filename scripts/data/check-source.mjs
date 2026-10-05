// Daily guard: has Redfin published a new monthly or weekly file since we last updated?
// Prints monthly=true/false and weekly=true/false for the workflow (GITHUB_OUTPUT). FORCE=true says "yes" to both.
import { appendFileSync } from 'node:fs';
import { SOURCES, readState, stamp } from './source-state.mjs';

const state = readState();
const force = process.env.FORCE === 'true';
const out = {};
for (const key of Object.keys(SOURCES)) {
  try {
    const now = await stamp(SOURCES[key]);
    out[key] = force || state[key] !== now;
    console.log(`${key}: ${out[key] ? 'CHANGED' : 'unchanged'} (${now})`);
  } catch (e) {
    out[key] = force;
    console.log(`${key}: could not check (${e.message}); ${force ? 'forcing' : 'skipping'}`);
  }
}
const lines = Object.entries(out).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines);
