// Remembers when each source file last changed, so the daily job only does real work when Redfin publishes new data.
import { readFileSync, writeFileSync } from 'node:fs';
import { REDFIN_BASE } from './config.mjs';

export const STATE_FILE = 'scripts/data/state.json';
export const SOURCES = {
  monthly: `${REDFIN_BASE}/all_cities.csv`,
  weekly: `${REDFIN_BASE.replace('/monthly', '/weekly')}/all_metros.csv`,
};

export const readState = () => { try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } };
export const writeState = (patch) => writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), ...patch }, null, 2) + '\n');

/** A cheap fingerprint of a remote file (a HEAD request, no download). */
export async function stamp(url) {
  const res = await fetch(url, { method: 'HEAD', headers: { 'user-agent': 'the615agent-data-job' } });
  if (!res.ok) throw new Error(`HEAD ${url} -> HTTP ${res.status}`);
  return `${res.headers.get('last-modified')}|${res.headers.get('content-length')}`;
}
