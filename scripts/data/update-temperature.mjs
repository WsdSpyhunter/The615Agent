// Re-runs only the blended temperature step (fast) and records the Zillow / Realtor.com file fingerprints.
import { applyTemperature } from './temperature-build.mjs';
import { SOURCES, stamp, writeState } from './source-state.mjs';
const patch = {};
for (const k of ['zillow', 'realtor']) { try { patch[k] = await stamp(SOURCES[k]); } catch (e) { console.log(`Could not read ${k} file date: ${e.message}`); } }
const ok = await applyTemperature();
if (ok) writeState(patch);
process.exit(ok ? 0 : 1);
