import './css/market-chart.css';
import { getJSON, esc, flag, emit } from './lib/data';

/**
 * <tpa-market-chart>
 *
 * Attributes
 *   src            URL of the history JSON (default /data/market-history.json). See docs/data-contracts/market-history.md
 *   city           slug to show first (default: first city)
 *   metric         price | dom | inventory | supply | s2l   (default price)
 *   show-selector  "false" hides the city buttons
 *   show-metrics   "false" hides the metric tabs
 *   follow         "true" makes the chart follow a <tpa-market-temperature> on the same page
 * Method: element.select(slug), element.setMetric(key)
 */
type Month = { m: string; price: number | null; dom: number | null; inv: number | null; ms: number | null; s2l: number | null };
type History = { generated?: string; source?: string; cities: Record<string, { name: string; geography?: string | null; months: Month[] }> };

const METRICS: Record<string, { label: string; key: keyof Month; fmt: (v: number) => string; axis: (v: number) => string }> = {
  price: { label: 'Median sale price', key: 'price', fmt: (v) => '$' + Math.round(v).toLocaleString(), axis: (v) => '$' + (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.round(v / 1000) + 'k') },
  dom: { label: 'Days on market', key: 'dom', fmt: (v) => Math.round(v) + ' days', axis: (v) => String(Math.round(v)) },
  inventory: { label: 'Active listings', key: 'inv', fmt: (v) => Math.round(v).toLocaleString(), axis: (v) => String(Math.round(v)) },
  supply: { label: 'Months of supply', key: 'ms', fmt: (v) => v.toFixed(1) + ' months', axis: (v) => v.toFixed(1) },
  s2l: { label: 'Sale-to-list ratio', key: 's2l', fmt: (v) => v.toFixed(1) + '%', axis: (v) => v.toFixed(0) + '%' },
};
const mon = (ym: string, withYear = true) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' }); };

class TpaMarketChart extends HTMLElement {
  private data?: History;
  private slug = '';
  private metric = 'price';
  async connectedCallback() {
    this.classList.add('tpa-mch');
    try { this.data = await getJSON<History>(this.getAttribute('src') || '/data/market-history.json'); } catch { this.innerHTML = '<p class="tpa-mch-err">Chart data is not available right now.</p>'; return; }
    const keys = Object.keys(this.data.cities);
    const want = this.getAttribute('city');
    this.slug = want && this.data.cities[want] ? want : keys[0];
    if (METRICS[this.getAttribute('metric') || '']) this.metric = this.getAttribute('metric')!;
    this.build(); this.draw();
    if (flag(this, 'follow')) document.addEventListener('tpa-market:city', (e: any) => this.select(e.detail.slug));
  }
  select(slug: string) { if (this.data?.cities[slug]) { this.slug = slug; this.draw(); } }
  setMetric(k: string) { if (METRICS[k]) { this.metric = k; this.draw(); } }
  private build() {
    const d = this.data!;
    const sel = flag(this, 'show-selector', true), met = flag(this, 'show-metrics', true);
    this.innerHTML = `<div class="tpa-mch-panel">
      ${met ? `<div class="tpa-mch-tabs" role="tablist" aria-label="Choose a measure">${Object.entries(METRICS).map(([k, m]) => `<button type="button" role="tab" data-metric="${k}">${m.label}</button>`).join('')}</div>` : ''}
      ${sel ? `<div class="tpa-mch-pills" role="group" aria-label="Choose a city">${Object.entries(d.cities).map(([k, c]) => `<button type="button" data-city="${esc(k)}">${esc(c.name)}</button>`).join('')}</div>` : ''}
      <div class="tpa-mch-head"><b class="tpa-mch-title"></b><span class="tpa-mch-read"></span></div>
      <svg class="tpa-mch-svg" viewBox="0 0 640 280" role="img"></svg>
      <div class="tpa-mch-src"></div>
    </div>`;
    this.querySelectorAll<HTMLButtonElement>('[data-metric]').forEach((b) => b.addEventListener('click', () => this.setMetric(b.dataset.metric!)));
    this.querySelectorAll<HTMLButtonElement>('[data-city]').forEach((b) => b.addEventListener('click', () => { this.select(b.dataset.city!); emit(this, 'tpa-chart:city', { slug: b.dataset.city }); }));
  }
  private draw() {
    const d = this.data!, c = d.cities[this.slug], M = METRICS[this.metric];
    const pts = c.months.map((m, i) => ({ i, m: m.m, v: m[M.key] as number | null }));
    const vals = pts.filter((p) => p.v != null) as { i: number; m: string; v: number }[];
    const q = <T extends Element>(s: string) => this.querySelector<T>(s)!;
    q('.tpa-mch-title').textContent = `${c.name}: ${M.label.toLowerCase()}`;
    this.querySelectorAll<HTMLButtonElement>('[data-metric]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.metric === this.metric)));
    this.querySelectorAll<HTMLButtonElement>('[data-city]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.city === this.slug)));
    const svg = q<SVGSVGElement>('.tpa-mch-svg');
    if (vals.length < 2) { svg.innerHTML = '<text x="320" y="140" text-anchor="middle" class="tpa-mch-t">Not enough data</text>'; q('.tpa-mch-read').textContent = ''; return; }
    const W = 640, H = 280, pl = 58, pr = 16, pt = 14, pb = 30;
    let lo = Math.min(...vals.map((p) => p.v)), hi = Math.max(...vals.map((p) => p.v));
    const pad = (hi - lo || hi * 0.1 || 1) * 0.12; lo = Math.max(0, lo - pad); hi += pad;
    const X = (i: number) => pl + (i / (pts.length - 1)) * (W - pl - pr), Y = (v: number) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = lo + ((hi - lo) * k) / 4; g += `<line class="tpa-mch-grid" x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="tpa-mch-t" x="${pl - 8}" y="${Y(v) + 4}" text-anchor="end">${M.axis(v)}</text>`; }
    pts.forEach((p, i) => { if (i % 6 === 0 || i === pts.length - 1) g += `<text class="tpa-mch-t" x="${X(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${mon(p.m, i % 12 === 0 || i === pts.length - 1)}</text>`; });
    let path = '', area = '', open = false;
    pts.forEach((p) => { if (p.v == null) { open = false; return; } path += `${open ? 'L' : 'M'}${X(p.i).toFixed(1)} ${Y(p.v).toFixed(1)}`; open = true; });
    const first = vals[0], last = vals[vals.length - 1];
    area = `${path}L${X(last.i)} ${H - pb}L${X(first.i)} ${H - pb}Z`;
    svg.innerHTML = g + `<path class="tpa-mch-area" d="${area}"/><path class="tpa-mch-line" d="${path}" fill="none" stroke-width="2.5" stroke-linejoin="round"/><circle class="tpa-mch-dot" cx="${X(last.i)}" cy="${Y(last.v)}" r="4.5"/><g class="tpa-mch-hover" style="display:none"><line class="tpa-mch-cross" y1="${pt}" y2="${H - pb}"/><circle class="tpa-mch-hdot" r="5"/></g><rect class="tpa-mch-hit" x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="transparent"/>`;
    const read = q('.tpa-mch-read'), set = (p: { m: string; v: number }) => (read.textContent = `${mon(p.m)}: ${M.fmt(p.v)}`);
    set(last);
    const hov = svg.querySelector<SVGGElement>('.tpa-mch-hover')!, cross = svg.querySelector('.tpa-mch-cross')!, hdot = svg.querySelector('.tpa-mch-hdot')!, hit = svg.querySelector('.tpa-mch-hit')!;
    const move = (ev: PointerEvent) => {
      const r = svg.getBoundingClientRect(), x = ((ev.clientX - r.left) / r.width) * W;
      const idx = Math.max(0, Math.min(pts.length - 1, Math.round(((x - pl) / (W - pl - pr)) * (pts.length - 1))));
      const p = pts[idx]; if (p.v == null) return;
      hov.style.display = ''; cross.setAttribute('x1', String(X(idx))); cross.setAttribute('x2', String(X(idx))); hdot.setAttribute('cx', String(X(idx))); hdot.setAttribute('cy', String(Y(p.v))); set({ m: p.m, v: p.v });
    };
    hit.addEventListener('pointermove', move as any); hit.addEventListener('pointerleave', () => { hov.style.display = 'none'; set(last); });
    const srcEl = q('.tpa-mch-src');
    srcEl.innerHTML = `Data through ${esc(mon(c.months[c.months.length - 1].m))}${c.geography ? ` (${esc(c.geography)})` : ''}. Source: <a href="https://www.redfin.com/news/data-center/" target="_blank" rel="noopener">Redfin Data Center</a>.`;
  }
}
if (!customElements.get('tpa-market-chart')) customElements.define('tpa-market-chart', TpaMarketChart);
