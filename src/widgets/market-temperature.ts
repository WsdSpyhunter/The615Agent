import './css/market-temperature.css';
import { getJSON, esc, flag, emit } from './lib/data';

/**
 * <tpa-market-temperature>
 *
 * Attributes
 *   src            URL of the market JSON (default /data/market.json). See docs/data-contracts/market.md
 *   city           slug to show first (default: first city in the file)
 *   show-title     "false" hides the Market Temperature title box
 *   show-selector  "false" hides the city buttons (use select() or the "city" attribute instead)
 *
 * Events (bubble): tpa-market:ready {data}, tpa-market:city {slug, city, state}
 * Method: element.select(slug)
 * Styling: CSS variables starting with --tpa- (see docs/WIDGETS.md)
 */

export type MarketCity = {
  name: string; monthsSupply: number;
  commentary?: string | null; medianPrice?: number | null; yoy?: number | null; dom?: number | null; saleToList?: number | null; inventory?: number | null;
  asOf?: string | null; geography?: string | null;
};
export type MarketSource = string | { name: string; url?: string; note?: string };
export type MarketData = {
  sample?: boolean; stale?: boolean; note?: string; asOf?: string | null; sources?: MarketSource[]; mortgageRate30?: number | null; mortgageRateAsOf?: string | null;
  cities: Record<string, MarketCity>;
};

/** Seller's market under 4 months of supply, balanced 4 to 6, buyer's over 6. */
export const classify = (monthsSupply: number): 'hot' | 'mid' | 'cold' => (monthsSupply < 4 ? 'hot' : monthsSupply <= 6 ? 'mid' : 'cold');
export const label = (m: number) => (m < 4 ? "Seller's market" : m <= 6 ? 'Balanced market' : "Buyer's market");

const ICON = {
  hot: '<defs><linearGradient id="tpa-fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E0300A"/><stop offset=".6" stop-color="#FF6A1F"/><stop offset="1" stop-color="#FFA24D"/></linearGradient><linearGradient id="tpa-ig" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFB020"/><stop offset="1" stop-color="#FFF1B8"/></linearGradient></defs><g class="tpa-fl"><path d="M12.6 1.8c.5 3.3 2.8 4.8 4.5 7.1 1.3 1.8 2 3.5 2 5.4a7.1 7.1 0 0 1-14.2 0c0-2.4 1.1-4.1 2.6-5.4.3 1.7 1 2.7 2.1 3.2-.4-3.6.9-7.4 3-10.3z" fill="url(#tpa-fg)"/></g><g class="tpa-fl2"><path d="M12 21.6a3.9 3.9 0 0 1-3.9-3.9c0-2 1.5-3.2 2.6-4.7.5-.7.8-1.4.9-2.3 1.9 1.6 4.3 3.4 4.3 7a3.9 3.9 0 0 1-3.9 3.9z" fill="url(#tpa-ig)"/></g>',
  mid: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v8"/></g>',
  cold: '<g class="tpa-snow" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + [0, 60, 120].map((a) => `<g transform="rotate(${a} 12 12)"><path d="M12 2v20M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/></g>`).join('') + '</g>',
};

const dash = '—';
const longDate = (iso?: string | null) => (iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '');
const sourceHtml = (s: MarketSource) => (typeof s === 'string' ? esc(s) : `${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}${s.note ? ` (${esc(s.note)})` : ''}`);
const money = (v?: number | null) => (v == null ? dash : '$' + Math.round(v).toLocaleString());
const pct = (v?: number | null, sign = false) => (v == null ? dash : (sign && v > 0 ? '+' : '') + v.toFixed(1) + '%');
const num = (v?: number | null) => (v == null ? dash : Number(v).toLocaleString());

export class TpaMarketTemperature extends HTMLElement {
  data?: MarketData;
  slug = '';
  async connectedCallback() {
    this.classList.add('tpa-mt');
    try {
      this.data = (await getJSON<MarketData>(this.getAttribute('src') || '/data/market.json')) as MarketData;
    } catch (e) {
      this.innerHTML = '<p class="tpa-mt-err">Market data is not available right now.</p>';
      return;
    }
    const keys = Object.keys(this.data.cities);
    this.slug = this.getAttribute('city') && this.data.cities[this.getAttribute('city')!] ? this.getAttribute('city')! : keys[0];
    this.build();
    emit(this, 'tpa-market:ready', { data: this.data });
    this.draw();
  }
  select(slug: string) {
    if (this.data?.cities[slug]) { this.slug = slug; this.draw(); }
  }
  private build() {
    const d = this.data!;
    const showTitle = flag(this, 'show-title', true), showSel = flag(this, 'show-selector', true);
    this.innerHTML =
      (showTitle ? `<div class="tpa-mt-titlebox"><svg class="tpa-mt-icon" viewBox="0 0 24 24" aria-hidden="true"></svg><span class="tpa-mt-title">Market temperature</span></div>${d.sample ? '<span class="tpa-mt-sample">Sample numbers</span>' : ''}` : '') +
      `<div class="tpa-mt-panel">
        ${showSel ? `<div class="tpa-mt-pills" role="group" aria-label="Choose a city">${Object.entries(d.cities).map(([k, c]) => `<button type="button" data-city="${esc(k)}">${esc(c.name)}</button>`).join('')}</div>` : ''}
        <div class="tpa-mt-gaugewrap"><svg class="tpa-mt-gauge" viewBox="0 -4 240 144" role="img" aria-label="Market gauge"></svg><div class="tpa-mt-verdict"></div></div>
        <div class="tpa-mt-stats"></div>
        <p class="tpa-mt-comment" hidden></p>
        <div class="tpa-mt-src"></div>
      </div>`;
    this.querySelectorAll<HTMLButtonElement>('.tpa-mt-pills button').forEach((b) => b.addEventListener('click', () => this.select(b.dataset.city!)));
  }
  private draw() {
    const d = this.data!, c = d.cities[this.slug], m = c.monthsSupply, st = classify(m);
    const q = <T extends Element>(s: string) => this.querySelector<T>(s);
    const title = q('.tpa-mt-title'); if (title) title.className = 'tpa-mt-title tpa-' + st;
    const icon = q('.tpa-mt-icon'); if (icon) { icon.setAttribute('class', 'tpa-mt-icon tpa-' + st); icon.innerHTML = ICON[st]; }
    const t = Math.min(m, 9) / 9, ang = Math.PI * (1 - t), cx = 120, cy = 120, r = 90;
    const A = (v: number) => Math.PI * (1 - v / 9);
    const arc = (a0: number, a1: number, cls: string) => {
      const p0 = [cx + r * Math.cos(a0), cy - r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy - r * Math.sin(a1)];
      return `<path class="${cls}" d="M${p0} A${r} ${r} 0 0 1 ${p1}" fill="none" stroke-width="16"/>`;
    };
    const nx = cx + (r - 10) * Math.cos(ang), ny = cy - (r - 10) * Math.sin(ang);
    q('.tpa-mt-gauge')!.innerHTML = arc(A(0), A(4), 'tpa-arc-seller') + arc(A(4), A(6), 'tpa-arc-balanced') + arc(A(6), A(9), 'tpa-arc-buyer') +
      `<line class="tpa-needle" x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke-width="4" stroke-linecap="round"/><circle class="tpa-hub" cx="${cx}" cy="${cy}" r="8"/>` +
      '<text class="tpa-glabel" x="14" y="136" font-size="10">Seller</text><text class="tpa-glabel tpa-gmid" x="137" y="10" text-anchor="middle" font-size="11" font-weight="600">Balanced</text><text class="tpa-glabel" x="196" y="136" font-size="10">Buyer</text>';
    q('.tpa-mt-verdict')!.innerHTML = `${label(m)}<small>${m.toFixed(1)} months of supply${d.sample ? ' (sample)' : ''}</small>`;
    const rows: [string, string][] = [
      ['Median price', money(c.medianPrice)], ['Change YoY', pct(c.yoy, true)], ['Days on market', num(c.dom)],
      ['Sale-to-list', pct(c.saleToList)], ['Active listings', num(c.inventory)], ['30-yr rate', d.mortgageRate30 == null ? dash : d.mortgageRate30.toFixed(2) + '%'],
    ];
    q('.tpa-mt-stats')!.innerHTML = rows.map(([k, v]) => `<div class="tpa-mt-stat"><span>${k}</span><b>${v}</b></div>`).join('');
    const asOf = c.asOf || d.asOf;
    const com = q('.tpa-mt-comment') as HTMLElement;
    com.hidden = !c.commentary; com.textContent = c.commentary || '';
    const srcEl = q('.tpa-mt-src')!;
    if (d.sample) srcEl.textContent = 'Real figures, sources and the "as of" date will appear here from the monthly data files. The gauge position is a sample.';
    else srcEl.innerHTML = `${d.stale ? '<b class="tpa-mt-stale">This data is more than two months old. Updated figures are on the way.</b><br>' : ''}Data as of ${esc(longDate(asOf))}${c.geography ? ` (${esc(c.geography)})` : ''}. ${d.note ? esc(d.note) + ' ' : ''}${d.mortgageRate30 != null && d.mortgageRateAsOf ? `30-year rate is for the week of ${esc(longDate(d.mortgageRateAsOf))}. ` : ''}Sources: ${(d.sources || []).map(sourceHtml).join('; ')}.`;
    this.querySelectorAll<HTMLButtonElement>('.tpa-mt-pills button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.city === this.slug)));
    emit(this, 'tpa-market:city', { slug: this.slug, city: c.name, state: st });
  }
}
if (!customElements.get('tpa-market-temperature')) customElements.define('tpa-market-temperature', TpaMarketTemperature);
