import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const SITE = 'https://the615agent.com';
export const readJson = (p, d = null) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return d; } };
export const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
export const slugify = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70).replace(/-$/, '');
export const words = (md) => (md.replace(/[#>*_`\[\]\(\)!|-]/g, ' ').match(/\b[\w'’]+\b/g) || []).length;
export const hashInt = (s) => parseInt(createHash('sha1').update(s).digest('hex').slice(0, 8), 16);
export const today = () => new Date().toISOString().slice(0, 10);
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const listDir = (d) => (existsSync(d) ? readdirSync(d) : []);

/** Minimal front-matter reader for existing posts (flat key: value lines only). */
export function readPostMeta(file) {
  const t = readFileSync(file, 'utf8');
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  const meta = {};
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^([A-Za-z]+):\s*(.*)$/); if (k) meta[k[1]] = k[2].replace(/^["']|["']$/g, ''); }
  return meta;
}

export const numbersIn = (s) => (s.match(/\d[\d,]*\.?\d*/g) || []).map((n) => n.replace(/,/g, '').replace(/\.$/, ''));
