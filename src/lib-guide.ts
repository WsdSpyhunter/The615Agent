import market from '../public/data/market.json';
import history from '../public/data/market-history.json';
import census from '../public/data/census-acs.json';
export const C: any = census;
export const M: any = market;
export const H: any = history;
export const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
export const dateLong = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
export const monthYear = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
export const monthShort = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' });
export const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1) + '%';
export const word = (n: number) => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');
// SVG line chart built at build time: fast, no JavaScript, readable by crawlers via the table beside it.
export function chart(points: (number | null)[], color: string) {
  const v = points.map((p, i) => [i, p] as const).filter(([, p]) => p != null) as [number, number][];
  if (v.length < 2) return null;
  const lo = Math.min(...v.map((x) => x[1])), hi = Math.max(...v.map((x) => x[1])), span = hi - lo || 1;
  const X = (i: number) => 10 + (540 * i) / (points.length - 1), Y = (p: number) => 130 - ((p - lo) / span) * 120;
  const d = v.map(([i, p], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
  const last = v.at(-1)!;
  return { line: d, area: `${d} L${X(last[0]).toFixed(1)},140 L${X(v[0][0]).toFixed(1)},140 Z`, cx: X(last[0]).toFixed(1), cy: Y(last[1]).toFixed(1), color };
}
export const num = (n: number) => Math.round(n).toLocaleString('en-US');
export const censusRows = () => Object.entries(C.cities).sort((a: any, b: any) => (a[0] === 'franklin' ? -1 : b[0] === 'franklin' ? 1 : a[1].name.localeCompare(b[1].name))) as [string, any][];
export const CITY_TAX_RATE = 0.296; // City of Franklin, per $100 of assessed value (FY2026 approved; FY2027 proposed unchanged), franklintn.gov
// Two lines on one shared scale (for city-vs-city charts).
export function chart2(a: (number | null)[], b: (number | null)[]) {
  const vals = [...a, ...b].filter((x): x is number => x != null);
  if (vals.length < 4) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1, n = Math.max(a.length, b.length);
  const X = (i: number) => 10 + (540 * i) / (n - 1), Y = (p: number) => 130 - ((p - lo) / span) * 120;
  const path = (s: (number | null)[]) => s.map((p, i) => [i, p] as const).filter(([, p]) => p != null).map(([i, p], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p as number).toFixed(1)}`).join(' ');
  return { a: path(a), b: path(b) };
}
export const pct = (n: number) => n.toFixed(1) + '%';
export const builtSince2010 = (c: any) => c.builtPct.b2020 + c.builtPct.b2010;
export const builtBefore1980 = (c: any) => c.builtPct.b1970 + c.builtPct.b1960 + c.builtPct.b1950 + c.builtPct.b1940 + c.builtPct.b1939;
export const builtBefore1970 = (c: any) => c.builtPct.b1960 + c.builtPct.b1950 + c.builtPct.b1940 + c.builtPct.b1939;
