// Remembers when each source file last changed, so the daily job only does real work when Redfin publishes new data.
import { readFileSync, writeFileSync } from 'node:fs';
import { REDFIN_BASE, ZILLOW_BASE, REALTOR_CORE, REALTOR_HOT } from './config.mjs';

export const STATE_FILE = 'scripts/data/state.json';
export const SOURCES = {
  monthly: `${REDFIN_BASE}/all_cities.csv`,
  weekly: `${REDFIN_BASE.replace('/monthly', '/weekly')}/all_metros.csv`,
  zillow: `${ZILLOW_BASE}/City_market_temp_index_uc_sfrcondo_month.csv`,
  realtor: [REALTOR_CORE, REALTOR_HOT],
};

export const readState = () => { try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } };
export const writeState = (patch) => writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), ...patch }, null, 2) + '\n');

/** A cheap fingerprint of a remote file (a HEAD request, no download). */
export async function stamp(source) {
  if (Array.isArray(source)) return (await Promise.all(source.map(stamp))).join(' + ');
  const res = await fetch(source, { method: 'HEAD', headers: { 'user-agent': 'Mozilla/5.0 (compatible; the615agent-data-job)' } });
  if (!res.ok) throw new Error(`HEAD ${source} -> HTTP ${res.status}`);
  return `${res.headers.get('last-modified')}|${res.headers.get('content-length')}`;
}
