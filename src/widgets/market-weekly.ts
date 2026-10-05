import './css/market-weekly.css';
import { getJSON, esc } from './lib/data';

/**
 * <tpa-market-weekly>
 * A compact "this week" strip for one metro area (rolling 4-week figures, refreshed weekly).
 * Attributes: src (default /data/market-weekly.json; format in docs/data-contracts/market-weekly.md), title (override the heading)
 */
type Weekly = {
  region: string; frequency?: string; asOf: string; periodBegin?: string; source?: { name: string; url?: string };
  latest: { homesSold: number | null; medianPrice: number | null; yoy: number | null; dom: number | null; saleToList: number | null; monthsSupply: number | null; newListings: number | null; activeListings: number | null; pending: number | null };
};
const dash = '—';
const money = (v: number | null) => (v == null ? dash : '$' + Math.round(v).toLocaleString());
const int = (v: number | null) => (v == null ? dash : Math.round(v).toLocaleString());
const pct = (v: number | null, sign = false) => (v == null ? dash : (sign && v > 0 ? '+' : '') + v.toFixed(1) + '%');
const date = (iso?: string) => (iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');
const label = (m: number) => (m < 4 ? "Seller's market" : m <= 6 ? 'Balanced market' : "Buyer's market");

class TpaMarketWeekly extends HTMLElement {
  async connectedCallback() {
    this.classList.add('tpa-mw');
    let d: Weekly;
    try { d = await getJSON<Weekly>(this.getAttribute('src') || '/data/market-weekly.json'); } catch { return; }
    const l = d.latest;
    const tiles: [string, string, string?][] = [
      ['Median sale price', money(l.medianPrice), l.yoy == null ? undefined : `${pct(l.yoy, true)} vs. last year`],
      ['Days on market', int(l.dom)],
      ['Sale-to-list', pct(l.saleToList)],
      ['Months of supply', l.monthsSupply == null ? dash : l.monthsSupply.toFixed(1), l.monthsSupply == null ? undefined : label(l.monthsSupply)],
      ['Homes sold', int(l.homesSold)],
      ['Active listings', int(l.activeListings)],
    ];
    this.innerHTML = `<div class="tpa-mw-panel">
      <div class="tpa-mw-head"><b>${esc(this.getAttribute('title') || `${d.region}: this week's pulse`)}</b><span>${esc(d.frequency || '')} · 4 weeks ending ${esc(date(d.asOf))}</span></div>
      <div class="tpa-mw-tiles">${tiles.map(([k, v, s]) => `<div class="tpa-mw-tile"><span>${esc(k)}</span><b>${esc(v)}</b>${s ? `<small>${esc(s)}</small>` : ''}</div>`).join('')}</div>
      <div class="tpa-mw-src">Covers the whole metro area, not a single city. Source: ${d.source?.url ? `<a href="${esc(d.source.url)}" target="_blank" rel="noopener">${esc(d.source.name)}</a>` : esc(d.source?.name || '')}.</div>
    </div>`;
  }
}
if (!customElements.get('tpa-market-weekly')) customElements.define('tpa-market-weekly', TpaMarketWeekly);
