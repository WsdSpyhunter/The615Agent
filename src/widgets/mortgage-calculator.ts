import './css/mortgage-calculator.css';
import { getJSON, money0, money2, flag, emit } from './lib/data';

/**
 * <tpa-mortgage-calculator>
 *
 * Attributes (all optional)
 *   rate-src        JSON URL with a "mortgageRate30" number (e.g. /data/market.json) used as the default rate
 *   default-rate    fallback rate if rate-src is missing/empty (default 6.5)
 *   default-price   (default 600000)   default-down (percent, default 20)
 *   default-tax     property tax % of price per year (default 0.65, an example value; used when the area list cannot load)
 *   tax-src         JSON URL with the area tax rates (e.g. /data/property-tax-rates.json); shows an optional area list that fills in the tax box
 *   default-area    which area in that list is selected first (default: the first one)
 *   default-ins     home insurance $ per year (default 1800, an example value)
 *   contact-url     where the "talk to me" button goes; the numbers are added as ?note=... (default /contact)
 *   cta-label       button text; set cta="false" to hide the button
 *   brand           name shown in the disclaimer (default "This site")
 *   logo-src        optional image shown at the top right of the results panel (use a light-on-transparent logo)
 *   logo-alt        alt text for that image (default: the brand name)
 * Events: tpa-mortgage:change {total, loan, interest, ...}
 */

const COLORS = { pi: '#1473E6', tax: '#FFC20E', ins: '#F2593A', mi: '#A5D8FF', hoa: '#8B95A3' } as const;
const NOTES: Record<string, string> = {
  conv: 'Mortgage insurance (PMI) is estimated at 0.5% of the loan per year when your down payment is under 20%. Your actual cost depends on your credit and down payment.',
  fha: 'Estimates a 1.75% upfront premium added to the loan and a 0.55% annual premium. FHA allows as little as 3.5% down.',
  va: 'No monthly mortgage insurance. A VA funding fee may apply and is not included.',
};

/** Standard fixed-rate payment. */
export const payment = (loan: number, annualRatePct: number, months: number) => {
  const r = annualRatePct / 1200;
  return r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months));
};

export interface CalcInput { price: number; downPct: number; rate: number; years: number; type: 'conv' | 'fha' | 'va'; taxPct: number; insYear: number; hoa: number; extra: number }

export function calculate(i: CalcInput) {
  let dp = i.downPct;
  const dAmt = (i.price * dp) / 100;
  if (i.type === 'fha' && dp < 3.5) dp = 3.5;
  let L = i.price - (i.price * dp) / 100, mi = 0;
  if (i.type === 'fha') { L *= 1.0175; mi = (L * 0.0055) / 12; }
  else if (i.type === 'conv' && dp < 20) mi = (L * 0.005) / 12;
  const n = i.years * 12, pi = payment(L, i.rate, n);
  const tx = (i.price * i.taxPct) / 100 / 12, is = i.insYear / 12;
  const total = pi + tx + is + mi + i.hoa;
  const r = i.rate / 1200;
  let bal = L, cum = 0, m = 0;
  const pts = [{ m: 0, bal, int: 0 }];
  while (bal > 0.005 && m < n + 1) {
    const interest = bal * r; let pr = pi + i.extra - interest;
    if (pr > bal) pr = bal;
    bal -= pr; cum += interest; m++;
    pts.push({ m, bal: Math.max(bal, 0), int: cum });
  }
  let base = 0, bb = L; for (let k = 0; k < n; k++) { const x = bb * r; base += x; bb -= pi - x; }
  return { price: i.price, dAmt, loan: L, pi, tx, is, mi, hoa: i.hoa, total, pts, months: m, interest: cum, saved: Math.max(base - cum, 0), extra: i.extra };
}

export class TpaMortgageCalculator extends HTMLElement {
  private term = 30;
  private ltype: 'conv' | 'fha' | 'va' = 'conv';
  async connectedCallback() {
    this.classList.add('tpa-mc');
    let rate = +(this.getAttribute('default-rate') || 6.5);
    const rs = this.getAttribute('rate-src'), taxSrc = this.getAttribute('tax-src');
    // Load the rate and the area tax list at the same time so the calculator appears as soon as possible.
    const [rateData, taxData] = await Promise.all([rs ? getJSON(rs).catch(() => null) : null, taxSrc ? getJSON(taxSrc).catch(() => null) : null]);
    if (rateData && typeof rateData.mortgageRate30 === 'number') rate = rateData.mortgageRate30;
    const price = +(this.getAttribute('default-price') || 600000), down = +(this.getAttribute('default-down') || 20);
    const tax = this.getAttribute('default-tax') || '0.65', ins = this.getAttribute('default-ins') || '1800';
    const cta = flag(this, 'cta', true);
    // Optional area list: picking an area fills in the property tax box. The box stays editable, and "Other area" is always there.
    if (taxData && Array.isArray(taxData.areas) && taxData.areas.length) { this.areas = taxData.areas; this.ratio = +taxData.assessmentRatio || 0.25; this.taxYear = String(taxData.taxYear || ''); }
    const wantArea = this.getAttribute('default-area') || this.areas[0]?.key;
    const startArea = this.areas.find((a) => a.key === wantArea) ?? this.areas[0];
    const pct = (a: any) => +(a.rate * this.ratio).toFixed(3);
    const taxStart = startArea ? String(pct(startArea)) : tax;
    const areaField = this.areas.length ? `<div class="tpa-mc-field"><div class="tpa-mc-top"><label for="tpa-area">Property tax area</label></div><select id="tpa-area" data-f="area">${this.areas.map((a) => `<option value="${a.key}"${a === startArea ? ' selected' : ''}>${a.label}</option>`).join('')}<option value="other">Other area (enter your own %)</option></select><small data-o="areanote"></small></div>` : '';
    this.innerHTML = `
    <div class="tpa-mc-panel">
      <div class="tpa-mc-field"><div class="tpa-mc-top"><label for="tpa-price">Home price</label><output data-o="price"></output></div><input id="tpa-price" data-f="price" type="range" min="100000" max="2000000" step="5000" value="${price}">
        <div class="tpa-mc-num"><input data-f="pricenum" inputmode="numeric" aria-label="Home price in dollars" placeholder="Type a price"></div></div>
      <div class="tpa-mc-field"><div class="tpa-mc-top"><label for="tpa-down">Down payment</label><output data-o="down"></output></div><input id="tpa-down" data-f="down" type="range" min="0" max="50" step="0.5" value="${down}">
        <div class="tpa-mc-num"><input data-f="downamt" inputmode="numeric" aria-label="Down payment in dollars"><input data-f="downpct" inputmode="decimal" aria-label="Down payment percent"></div></div>
      <div class="tpa-mc-field"><div class="tpa-mc-top"><label for="tpa-rate">Interest rate</label><output data-o="rate"></output></div><input id="tpa-rate" data-f="rate" type="range" min="2" max="10" step="0.125" value="${rate}">
        <div class="tpa-mc-ratebox"><small>Example rate. Use the rate from your lender's quote, or type your own.</small><input data-f="ratenum" inputmode="decimal" aria-label="Interest rate percent"></div></div>
      <div class="tpa-mc-field"><div class="tpa-mc-top"><span>Loan term</span></div><div class="tpa-mc-seg" data-seg="term" role="group" aria-label="Loan term"><button type="button" data-v="30" aria-pressed="true">30 years</button><button type="button" data-v="20" aria-pressed="false">20 years</button><button type="button" data-v="15" aria-pressed="false">15 years</button></div></div>
      <div class="tpa-mc-field"><div class="tpa-mc-top"><span>Loan type</span></div><div class="tpa-mc-seg" data-seg="ltype" role="group" aria-label="Loan type"><button type="button" data-v="conv" aria-pressed="true">Conventional</button><button type="button" data-v="fha" aria-pressed="false">FHA</button><button type="button" data-v="va" aria-pressed="false">VA</button></div><small data-o="ltype"></small></div>
      ${areaField}
      <div class="tpa-mc-grid">
        <div class="tpa-mc-field"><div class="tpa-mc-top"><label for="tpa-tax">Property tax (% of price / yr)</label></div><input id="tpa-tax" data-f="tax" type="number" step="0.001" min="0" value="${taxStart}"></div>
        <div class="tpa-mc-field"><div class="tpa-mc-top"><label for="tpa-ins">Home insurance ($ / yr)</label></div><input id="tpa-ins" data-f="ins" type="number" step="50" min="0" value="${ins}"></div>
        <div class="tpa-mc-field tpa-mc-wide"><div class="tpa-mc-top"><label for="tpa-hoa">HOA ($ / month)</label></div><input id="tpa-hoa" data-f="hoa" type="number" step="10" min="0" value="0"></div>
      </div>
      <details class="tpa-mc-more"><summary>More options</summary>
        <div class="tpa-mc-field"><div class="tpa-mc-top"><label for="tpa-extra">Extra principal ($ / month)</label></div><input id="tpa-extra" data-f="extra" type="number" step="25" min="0" value="0"><small>Paying extra toward the loan each month shortens the loan and saves interest.</small></div>
      </details>
      <p class="tpa-mc-hint">Property tax is estimated from the area's ${this.taxYear || ''} rates applied to the purchase price. The county's appraisal, the exact address and later rate changes will differ. Insurance is an example value. Look up the specific property and get a quote for real numbers.</p>
    </div>
    <div class="tpa-mc-res" aria-live="polite">
      <div class="tpa-mc-head"><div><small>Estimated monthly payment</small><div class="tpa-mc-big" data-o="total"></div></div>${this.getAttribute('logo-src') ? `<img class="tpa-mc-logo" src="${this.getAttribute('logo-src')}" alt="${this.getAttribute('logo-alt') || this.getAttribute('brand') || ''}" loading="lazy">` : ''}</div>
      <div class="tpa-mc-donutwrap"><svg data-o="donut" viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="Payment breakdown"></svg><div class="tpa-mc-legend" data-o="legend"></div></div>
      <div class="tpa-mc-totals" data-o="totals"></div>
      <div class="tpa-mc-cash"><span>Estimated cash to close</span><b data-o="cash"></b><small>Your down payment plus about 2 to 4 percent of the price in closing costs. Earnest money and moving costs are extra.</small></div>
      <div class="tpa-mc-chart"><svg data-o="chart" viewBox="0 0 520 240" role="img" aria-label="Loan balance and cumulative interest over time"></svg></div>
      <p class="tpa-mc-note" data-o="chartnote"></p>
      ${cta ? `<a class="tpa-mc-cta" data-o="cta" href="${this.getAttribute('contact-url') || '/contact'}">${this.getAttribute('cta-label') || 'Talk to me about these numbers'}</a>` : ''}
      <p class="tpa-mc-note">Estimates only, not a loan offer or commitment to lend. Actual rates, taxes, insurance, mortgage insurance and fees vary. ${this.getAttribute('brand') || 'This site'} is not a lender. Equal Housing Opportunity.</p>
    </div>
    <div class="tpa-mc-bar" data-o="bar" role="button" tabindex="0" aria-label="Show the payment breakdown" hidden><span>Estimated payment</span><b data-o="barv"></b><i>Details ↓</i></div>`;
    const f = (k: string) => this.querySelector<HTMLInputElement>(`[data-f=${k}]`)!;
    ['down', 'ins', 'hoa', 'extra'].forEach((k) => f(k).addEventListener('input', () => this.render()));
    // The price slider and the typed price box control each other (the box can go beyond the slider's range).
    f('price').addEventListener('input', () => { f('pricenum').value = ''; this.render(); });
    f('pricenum').addEventListener('input', () => {
      const v = +f('pricenum').value.replace(/[^0-9]/g, '');
      if (v >= 10000 && v <= 50000000) f('price').value = String(Math.min(2000000, Math.max(100000, v)));
      this.render();
    });
    // The tax box and the area list: picking an area fills the box; typing your own switches the list to "Other area".
    f('tax').addEventListener('input', () => { const a = this.querySelector<HTMLSelectElement>('[data-f=area]'); if (a) a.value = 'other'; this.render(); });
    this.querySelector<HTMLSelectElement>('[data-f=area]')?.addEventListener('change', (e) => {
      const key = (e.target as HTMLSelectElement).value, a = this.areas.find((x) => x.key === key);
      if (a) f('tax').value = String(+(a.rate * this.ratio).toFixed(3));
      this.render();
    });
    // The rate slider and the typed rate box control each other.
    f('rate').addEventListener('input', () => { f('ratenum').value = ''; this.render(); });
    f('ratenum').addEventListener('input', () => {
      const v = parseFloat(f('ratenum').value.replace(/[^0-9.]/g, ''));
      if (isFinite(v) && v > 0 && v <= 25) f('rate').value = String(Math.min(10, Math.max(2, v)));
      this.render();
    });
    ['ratenum', 'downpct', 'downamt', 'pricenum'].forEach((k) => {
      f(k).addEventListener('focus', () => f(k).select());
      f(k).addEventListener('blur', () => this.render());
    });
    f('downamt').addEventListener('input', () => { const v = +f('downamt').value.replace(/[^0-9.]/g, ''); f('down').value = String(Math.min(50, Math.max(0, (v / this.priceVal()) * 100))); this.render(); });
    f('downpct').addEventListener('input', () => { const v = parseFloat(f('downpct').value.replace(/[^0-9.]/g, '')); if (!isNaN(v)) { f('down').value = String(Math.min(50, Math.max(0, v))); this.render(); } });
    this.querySelectorAll<HTMLElement>('[data-seg]').forEach((g) => g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      if (g.dataset.seg === 'term') this.term = +b.dataset.v!; else this.ltype = b.dataset.v as any;
      g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this.render();
    })));
    // Slim payment bar on phones: shows while the results panel is below the screen, tap to jump to it.
    const bar = this.querySelector<HTMLElement>('[data-o=bar]')!, res = this.querySelector<HTMLElement>('.tpa-mc-res')!;
    const jump = () => res.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    bar.addEventListener('click', jump);
    bar.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); } });
    // Shown from the start of the calculator until the bottom of the black results box has scrolled into view.
    const place = () => {
      const vh = window.innerHeight;
      bar.hidden = !(this.getBoundingClientRect().top < vh * 0.85 && res.getBoundingClientRect().bottom > vh);
    };
    window.addEventListener('scroll', place, { passive: true }); window.addEventListener('resize', place); place();
    this.render();
    this.classList.add('tpa-mc-ready');
  }
  private areas: any[] = [];
  private ratio = 0.25;
  private taxYear = '';
  /** The home price in use: the typed number if it is valid, otherwise the slider. */
  private priceVal() {
    const typed = +this.querySelector<HTMLInputElement>('[data-f=pricenum]')!.value.replace(/[^0-9]/g, '');
    return typed >= 10000 && typed <= 50000000 ? typed : +this.querySelector<HTMLInputElement>('[data-f=price]')!.value;
  }
  /** The interest rate in use: the typed number if it is valid, otherwise the slider. */
  private rateVal() {
    const typed = parseFloat(this.querySelector<HTMLInputElement>('[data-f=ratenum]')!.value.replace(/[^0-9.]/g, ''));
    return isFinite(typed) && typed > 0 && typed <= 25 ? typed : +this.querySelector<HTMLInputElement>('[data-f=rate]')!.value;
  }
  private render() {
    const f = (k: string) => this.querySelector<HTMLInputElement>(`[data-f=${k}]`)!;
    const o = (k: string) => this.querySelector<HTMLElement>(`[data-o=${k}]`)!;
    const price = this.priceVal();
    const c = calculate({ price, downPct: +f('down').value, rate: this.rateVal(), years: this.term, type: this.ltype, taxPct: +f('tax').value || 0, insYear: +f('ins').value || 0, hoa: +f('hoa').value || 0, extra: +f('extra').value || 0 });
    o('price').textContent = money0(c.price);
    if (document.activeElement !== f('pricenum')) f('pricenum').value = c.price.toLocaleString('en-US');
    o('rate').textContent = this.rateVal().toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0') + '%';
    if (document.activeElement !== f('ratenum')) f('ratenum').value = this.rateVal().toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0') + '%';
    o('down').textContent = `${money0(c.dAmt)} (${(+f('down').value).toFixed(1)}%)`;
    if (document.activeElement !== f('downamt')) f('downamt').value = Math.round(c.dAmt).toLocaleString();
    if (document.activeElement !== f('downpct')) f('downpct').value = (+f('down').value).toFixed(1) + '%';
    o('total').textContent = money2(c.total);
    const parts = [{ k: 'pi', n: 'Principal & interest', v: c.pi }, { k: 'tax', n: 'Property tax', v: c.tx }, { k: 'ins', n: 'Home insurance', v: c.is }, { k: 'mi', n: 'Mortgage insurance', v: c.mi }, { k: 'hoa', n: 'HOA', v: c.hoa }] as const;
    const tot = parts.reduce((a, p) => a + p.v, 0) || 1, R = 44, C = 2 * Math.PI * R; let off = 0;
    o('donut').innerHTML = '<circle class="tpa-mc-track" cx="60" cy="60" r="44" fill="none" stroke-width="16"/>' + parts.filter((p) => p.v > 0).map((p) => {
      const len = (p.v / tot) * C; const s = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${COLORS[p.k]}" stroke-width="16" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off += len; return s;
    }).join('');
    o('legend').innerHTML = parts.filter((p) => p.v > 0).map((p) => `<div><i style="background:${COLORS[p.k]}"></i>${p.n}<b>${money2(p.v)}</b></div>`).join('');
    const yrs = Math.floor(c.months / 12), mo = c.months % 12;
    o('totals').innerHTML = `<div><span>Loan amount</span><b>${money0(c.loan)}</b></div><div><span>Total interest</span><b>${money0(c.interest)}</b></div><div><span>Loan paid off in</span><b>${yrs} yr${mo ? ' ' + mo + ' mo' : ''}</b>${c.extra > 0 && this.term * 12 > c.months ? `<small class="tpa-mc-sub">${Math.floor((this.term * 12 - c.months) / 12)} yr ${(this.term * 12 - c.months) % 12} mo sooner</small>` : ''}</div><div><span>${c.extra > 0 ? 'Interest saved' : 'Down payment'}</span><b>${c.extra > 0 ? money0(c.saved) : money0(c.dAmt)}</b>${c.extra > 0 ? '<small class="tpa-mc-sub">compared with no extra payments</small>' : ''}</div>`;
    o('cash').textContent = `${money0(c.dAmt + c.price * 0.02)} to ${money0(c.dAmt + c.price * 0.04)}`;
    o('barv').textContent = money0(c.total) + '/mo';
    const area = this.areas.find((x) => x.key === this.querySelector<HTMLSelectElement>('[data-f=area]')?.value);
    const an = this.querySelector<HTMLElement>('[data-o=areanote]');
    if (an && this.areas.length) an.textContent = area ? `${this.taxYear} combined rate of $${area.rate} per $100 of assessed value. ${area.note}` : 'Type your own property tax percentage below, or look up the rate for the home you are considering.';
    this.chart(o('chart') as unknown as SVGElement, c);
    o('chartnote').textContent = c.mi > 0 && this.ltype === 'conv' ? 'Mortgage insurance typically ends once you reach 20% equity. The chart shows principal and interest only.' : 'The chart shows principal and interest only.';
    o('ltype').textContent = NOTES[this.ltype];
    const cta = this.querySelector<HTMLAnchorElement>('[data-o=cta]');
    if (cta) {
      const base = this.getAttribute('contact-url') || '/contact';
      const note = `Mortgage calculator numbers: price ${money0(c.price)}, down ${money0(c.dAmt)} (${(+f('down').value).toFixed(1)}%), ${this.term}-year ${this.ltype === 'conv' ? 'conventional' : this.ltype.toUpperCase()} at ${this.rateVal()}%, estimated payment ${money2(c.total)}/month.`;
      cta.href = base + (base.includes('?') ? '&' : '?') + 'note=' + encodeURIComponent(note);
    }
    emit(this, 'tpa-mortgage:change', { total: c.total, loan: c.loan, interest: c.interest, months: c.months, monthly: { pi: c.pi, tax: c.tx, insurance: c.is, mi: c.mi, hoa: c.hoa } });
  }
  private chart(svg: SVGElement, c: ReturnType<typeof calculate>) {
    const W = 520, H = 240, pl = 52, pr = 26, pt = 14, pb = 28;
    const maxM = c.pts[c.pts.length - 1].m || 1, maxY = Math.max(c.loan, c.interest, 1);
    const X = (m: number) => pl + (m / maxM) * (W - pl - pr), Y = (v: number) => pt + (1 - v / maxY) * (H - pt - pb);
    const path = (k: 'bal' | 'int') => c.pts.filter((_, i) => i % Math.ceil(c.pts.length / 120) === 0 || i === c.pts.length - 1).map((p, i) => `${i ? 'L' : 'M'}${X(p.m).toFixed(1)} ${Y(p[k]).toFixed(1)}`).join('');
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = (maxY * i) / 4; g += `<line class="tpa-mc-grid-l" x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="tpa-mc-axis" x="${pl - 6}" y="${Y(v) + 4}" font-size="10" text-anchor="end">$${v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.round(v / 1000) + 'k'}</text>`; }
    const yrs = Math.ceil(maxM / 12), step = yrs > 20 ? 10 : 5;
    for (let y = 0; y <= yrs; y += step) g += `<text class="tpa-mc-axis" x="${X(y * 12)}" y="${H - 8}" font-size="10" text-anchor="middle">${y === 0 ? 'Start' : 'Yr ' + y}</text>`;
    svg.innerHTML = g + `<path d="${path('bal')}" fill="none" stroke="#1473E6" stroke-width="2.5"/><path d="${path('int')}" fill="none" stroke="#FFC20E" stroke-width="2.5"/>` +
      `<g font-size="11"><rect x="${pl + 8}" y="${pt + 2}" width="10" height="10" rx="2" fill="#1473E6"/><text class="tpa-mc-axis2" x="${pl + 24}" y="${pt + 11}">Loan balance</text><rect x="${pl + 110}" y="${pt + 2}" width="10" height="10" rx="2" fill="#FFC20E"/><text class="tpa-mc-axis2" x="${pl + 126}" y="${pt + 11}">Total interest paid</text></g>`;
  }
}
if (!customElements.get('tpa-mortgage-calculator')) customElements.define('tpa-mortgage-calculator', TpaMortgageCalculator);
