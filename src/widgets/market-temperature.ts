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
 *
 * Each city may carry a blended "temperature" reading (preferred). Without one, the widget falls back to Redfin months of supply.
 */

export type Reading = { key: string; title: string; detail: string; reading: string; level: string };
export type Temperature = {
  score: number; level: string; label: string; tilt: 'buyers' | 'sellers' | null; mixed: boolean; confidence: string;
  trend: { points: number; direction: 'cooling' | 'heating' | 'steady' } | null; small: boolean; readings: Reading[]; note?: string | null;
};
export type MarketCity = {
  name: string; monthsSupply: number; commentary?: string | null; temperature?: Temperature;
  medianPrice?: number | null; yoy?: number | null; dom?: number | null; saleToList?: number | null; inventory?: number | null;
  asOf?: string | null; geography?: string | null;
};
export type MarketSource = string | { name: string; url?: string; note?: string };
export type MarketData = {
  sample?: boolean; stale?: boolean; note?: string; temperatureMethod?: string; asOf?: string | null; sources?: MarketSource[];
  mortgageRate30?: number | null; mortgageRateAsOf?: string | null; cities: Record<string, MarketCity>;
};

// Old single-measure fallback: Seller's market under 4 months of supply, balanced 4 to 6, buyer's over 6.
export const classify = (m: number): 'hot' | 'mid' | 'cold' => (m < 4 ? 'hot' : m <= 6 ? 'mid' : 'cold');
export const label = (m: number) => (m < 4 ? "Seller's market" : m <= 6 ? 'Balanced market' : "Buyer's market");
// Three tiers. Flame (flickering): a confirmed seller's or buyer's market, which is active either way. Thermometer (lukewarm, still): a market leaning
// one way. Snowflake (cold): balanced, meaning nothing is moving decisively.
const kindOf = (level: string): 'hot' | 'mid' | 'cold' => (level === 'sellers' || level === 'buyers' ? 'hot' : level === 'seller-leaning' || level === 'buyer-leaning' ? 'mid' : 'cold');

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
        <div class="tpa-mt-gaugewrap"><svg class="tpa-mt-gauge" viewBox="0 -4 240 150" role="img" aria-label="Market gauge"></svg><div><div class="tpa-mt-verdict"></div><div class="tpa-mt-chips"></div></div></div>
        <p class="tpa-mt-comment" hidden></p>
        <div class="tpa-mt-read" hidden><h3>How we read it</h3><div class="tpa-mt-rows"></div></div>
        <div class="tpa-mt-stats"></div>
        <div class="tpa-mt-src"></div>
      </div>`;
    this.querySelectorAll<HTMLButtonElement>('.tpa-mt-pills button').forEach((b) => b.addEventListener('click', () => this.select(b.dataset.city!)));
  }
  private gauge(score: number | null, fallbackMonths: number | null) {
    // New 5-zone gauge when we have a blended score (+2 sellers on the left ... -2 buyers on the right); old 3-zone gauge otherwise.
    const cx = 120, cy = 125, r = 92;
    const arc = (a0: number, a1: number, cls: string) => {
      const p0 = [cx + r * Math.cos(a0), cy - r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy - r * Math.sin(a1)];
      return `<path class="${cls}" d="M${p0} A${r} ${r} 0 0 1 ${p1}" fill="none" stroke-width="16"/>`;
    };
    let arcs = '', ang = Math.PI / 2;
    if (score != null) {
      const ends = [2, 1.2, 0.4, -0.4, -1.2, -2], cls = ['tpa-arc-seller', 'tpa-arc-seller-leaning', 'tpa-arc-balanced', 'tpa-arc-buyer-leaning', 'tpa-arc-buyer'];
      const A = (s: number) => Math.PI * (1 - (2 - s) / 4);
      cls.forEach((c, i) => (arcs += arc(A(ends[i]), A(ends[i + 1]), c)));
      ang = A(Math.max(-2, Math.min(2, score)));
    } else if (fallbackMonths != null) {
      const A = (v: number) => Math.PI * (1 - v / 9);
      arcs = arc(A(0), A(4), 'tpa-arc-seller') + arc(A(4), A(6), 'tpa-arc-balanced') + arc(A(6), A(9), 'tpa-arc-buyer');
      ang = Math.PI * (1 - Math.min(fallbackMonths, 9) / 9);
    }
    const nx = cx + (r - 12) * Math.cos(ang), ny = cy - (r - 12) * Math.sin(ang);
    return arcs + `<line class="tpa-needle" x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke-width="4" stroke-linecap="round"/><circle class="tpa-hub" cx="${cx}" cy="${cy}" r="8"/>` +
      '<text class="tpa-glabel" x="10" y="143" font-size="10">Sellers</text><text class="tpa-glabel tpa-gmid" x="120" y="12" text-anchor="middle" font-size="11" font-weight="600">Balanced</text><text class="tpa-glabel" x="206" y="143" font-size="10">Buyers</text>';
  }
  private draw() {
    const d = this.data!, c = d.cities[this.slug], T = c.temperature;
    const m = c.monthsSupply;
    const level = T ? T.level : m < 4 ? 'sellers' : m <= 6 ? 'balanced' : 'buyers';
    const st = T ? kindOf(T.level) : classify(m);
    const q = <E extends Element>(s: string) => this.querySelector<E>(s)!;
    const title = q('.tpa-mt-title'); if (title) title.className = 'tpa-mt-title tpa-' + st;
    const icon = q('.tpa-mt-icon'); if (icon) { icon.setAttribute('class', 'tpa-mt-icon tpa-' + st); icon.innerHTML = ICON[st]; }
    q('.tpa-mt-gauge').innerHTML = this.gauge(T ? T.score : null, m);
    const verdictText = T ? T.label : label(m);
    const tilt = T?.tilt === 'buyers' ? 'Slightly toward buyers' : T?.tilt === 'sellers' ? 'Slightly toward sellers' : '';
    q('.tpa-mt-verdict').innerHTML = T
      ? `${esc(verdictText)}<small>${esc(tilt)}${tilt ? ' · ' : ''}${esc(T.confidence)} confidence</small>`
      : `${esc(verdictText)}<small>${m.toFixed(1)} months of supply${d.sample ? ' (sample)' : ''}</small>`;
    let chips = '';
    if (T?.trend) { const w = T.trend.direction === 'cooling' ? 'Cooling' : T.trend.direction === 'heating' ? 'Heating up' : 'Steady'; chips += `<span class="tpa-chip tpa-chip-${T.trend.direction}">${w}: Zillow index ${T.trend.points > 0 ? '+' : ''}${T.trend.points} in 3 months</span>`; }
    if (T?.mixed) chips += '<span class="tpa-chip tpa-chip-mix">Mixed signals</span>';
    if (T?.small) chips += '<span class="tpa-chip tpa-chip-small">Small market: numbers swing</span>';
    q('.tpa-mt-chips').innerHTML = chips;
    const com = q('.tpa-mt-comment') as HTMLElement;
    com.hidden = !c.commentary; com.textContent = c.commentary || '';
    const read = q('.tpa-mt-read') as HTMLElement;
    read.hidden = !(T && T.readings?.length);
    q('.tpa-mt-rows').innerHTML = (T?.readings || []).map((r) => `<div class="tpa-mt-row"><i class="tpa-dot tpa-lv-${esc(r.level)}"></i><div><b>${esc(r.title)}</b><span>${esc(r.detail)}</span></div><span class="tpa-pillr tpa-lv-${esc(r.level)}">${esc(r.reading)}</span></div>`).join('');
    const rows: [string, string][] = [
      ['Median price', money(c.medianPrice)], ['Change YoY', pct(c.yoy, true)], ['Days on market', num(c.dom)],
      ['Sale-to-list', pct(c.saleToList)], ['Active listings', num(c.inventory)], ['30-yr rate', d.mortgageRate30 == null ? dash : d.mortgageRate30.toFixed(2) + '%'],
    ];
    q('.tpa-mt-stats').innerHTML = rows.map(([k, v]) => `<div class="tpa-mt-stat"><span>${k}</span><b>${v}</b></div>`).join('');
    const asOf = c.asOf || d.asOf;
    const srcEl = q('.tpa-mt-src');
    if (d.sample) srcEl.textContent = 'Real figures, sources and the "as of" date will appear here from the monthly data files. The gauge position is a sample.';
    else srcEl.innerHTML = `${d.stale ? '<b class="tpa-mt-stale">This data is more than two months old. Updated figures are on the way.</b><br>' : ''}${T?.note ? `<b class="tpa-mt-stale">${esc(T.note)}</b><br>` : ''}${d.temperatureMethod ? esc(d.temperatureMethod) + ' ' : ''}Stat tiles: Redfin data as of ${esc(longDate(asOf))}${c.geography ? ` (${esc(c.geography)})` : ''}. ${d.note ? esc(d.note) + ' ' : ''}${d.mortgageRate30 != null && d.mortgageRateAsOf ? `30-year rate is for the week of ${esc(longDate(d.mortgageRateAsOf))}. ` : ''}Sources: ${(d.sources || []).map(sourceHtml).join('; ')}.`;
    this.querySelectorAll<HTMLButtonElement>('.tpa-mt-pills button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.city === this.slug)));
    emit(this, 'tpa-market:city', { slug: this.slug, city: c.name, state: st, level });
  }
}
if (!customElements.get('tpa-market-temperature')) customElements.define('tpa-market-temperature', TpaMarketTemperature);
