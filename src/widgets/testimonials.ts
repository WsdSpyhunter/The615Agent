import './css/testimonials.css';
import { getJSON, esc, flag } from './lib/data';

/**
 * <tpa-testimonials>
 *
 * Attributes
 *   src                JSON URL: [ {quote, name, detail, url?, placeholder?} ]  (see docs/data-contracts/testimonials.md)
 *   show-placeholders  "false" hides items marked placeholder:true (default true)
 *   speed              seconds for one full scroll (default 70)
 * Renders one auto-scrolling row of cards plus a pause button. It pauses on hover/focus and
 * becomes a normal swipeable row for visitors who prefer reduced motion. Put your own heading around it.
 */
type T = { quote: string; name: string; detail?: string; url?: string; rating?: number | null; date?: string | null; source?: string; placeholder?: boolean };
const stars = (n?: number | null) => { const r = Math.max(0, Math.min(5, Math.round(n ?? 5))); return '★'.repeat(r) + '☆'.repeat(5 - r); };
const when = (d?: string | null) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

class TpaTestimonials extends HTMLElement {
  async connectedCallback() {
    this.classList.add('tpa-t');
    let items: T[] = [];
    try { items = await getJSON(this.getAttribute('src') || '/data/testimonials.json'); } catch { return; }
    if (!flag(this, 'show-placeholders', true)) items = items.filter((t) => !t.placeholder);
    if (!items.length) { this.innerHTML = ''; return; }
    const card = (t: T, dup: boolean) => `<figure class="tpa-t-card"${dup ? ' aria-hidden="true"' : ''}><div class="tpa-t-stars" aria-label="${t.rating ?? 5} out of 5 stars">${stars(t.rating)}</div><p class="tpa-t-quote">“${esc(t.quote)}”</p><figcaption><span class="tpa-t-av">${esc(t.name[0])}</span><span><b>${esc(t.name)}</b>${esc([t.detail, when(t.date)].filter(Boolean).join(' · '))}${t.url ? `<br><a href="${esc(t.url)}" rel="noopener" target="_blank">${t.source ? `Reviewed on ${esc(t.source)}` : 'Verify'} ↗</a>` : ''}</span></figcaption></figure>`;
    this.innerHTML = `<div class="tpa-t-mask"><div class="tpa-t-row" style="animation-duration:${this.getAttribute('speed') || 70}s">${[0, 1].map((d) => items.map((t) => card(t, !!d)).join('')).join('')}</div></div><div class="tpa-t-ctl"><button type="button">Pause scrolling</button><span>Hover to pause.</span></div>`;
    const btn = this.querySelector('button')!;
    btn.addEventListener('click', () => { const p = this.classList.toggle('tpa-paused'); btn.textContent = p ? 'Resume scrolling' : 'Pause scrolling'; });
  }
}
if (!customElements.get('tpa-testimonials')) customElements.define('tpa-testimonials', TpaTestimonials);
