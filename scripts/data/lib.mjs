import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';

export const norm = (s) => s.toLowerCase().replace(/[’'.]/g, '').replace(/\s+/g, ' ').trim();
export const unq = (s) => (s && s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s);
export const num = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s === 'NA' || s === 'null') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Stream a .tsv.gz over HTTP and call onRow(rowObject) for rows whose raw line passes quickFilter(line). */
export async function streamTsvGz(url, quickFilter, onRow) {
  const res = await fetch(url, { headers: { 'user-agent': 'the615agent-data-job' } });
  if (!res.ok || !res.body) throw new Error(`${url} -> HTTP ${res.status}`);
  const rl = createInterface({ input: Readable.fromWeb(res.body).pipe(createGunzip()), crlfDelay: Infinity });
  let header = null, total = 0, kept = 0;
  for await (const line of rl) {
    if (!header) { header = line.split('\t').map((h) => unq(h.trim()).toLowerCase()); continue; }
    total++;
    if (!quickFilter(line)) continue;
    const cells = line.split('\t').map((c) => unq(c));
    const row = {};
    header.forEach((h, i) => (row[h] = cells[i]));
    kept++;
    onRow(row);
  }
  return { total, kept, header };
}

/** Split one CSV line into fields, honoring "quoted, values". */
export function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Stream a plain .csv over HTTP; rows are objects keyed by lowercased header names. quickFilter(line) skips rows cheaply. */
export async function streamCsv(url, quickFilter, onRow) {
  const res = await fetch(url, { headers: { 'user-agent': 'the615agent-data-job' } });
  if (!res.ok || !res.body) throw new Error(`${url} -> HTTP ${res.status}`);
  const rl = createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
  let header = null, total = 0, kept = 0;
  for await (const line of rl) {
    if (!header) { header = parseCsvLine(line).map((h) => h.trim().toLowerCase()); continue; }
    total++;
    if (!quickFilter(line)) continue;
    const cells = parseCsvLine(line), row = {};
    header.forEach((h, i) => (row[h] = cells[i]));
    kept++; onRow(row);
  }
  return { total, kept, header };
}
