import './css/checklist.css';
import { getJSON, esc, emit } from './lib/data';

/**
 * <tpa-checklist>
 *
 * Attributes
 *   src          JSON URL: { "buyer": [ {title, when, items[], tip} ], "seller": [...] }  (see docs/data-contracts/checklists.md)
 *   list         which key to show first (default: first key)
 *   storage-key  localStorage key for saved progress (default "tpa-checklist")
 *   tabs         "false" hides the tab switcher (use select() instead)
 *   labels       JSON object to rename tabs, e.g. {"buyer":"Buyer","seller":"Seller"}
 * Method: element.select(key)   Events: tpa-checklist:progress {list, done, total}
 * Any children inside the element before it loads are treated as a no-JS fallback and replaced.
 */
type Step = { title: string; when?: string; items: string[]; tip?: string };

class TpaChecklist extends HTMLElement {
  private lists: Record<string, Step[]> = {};
  private cur = '';
  private state: Record<string, number> = {};
  private key = 'tpa-checklist';
  async connectedCallback() {
    this.classList.add('tpa-cl');
    this.key = this.getAttribute('storage-key') || 'tpa-checklist';
    try { this.state = JSON.parse(localStorage.getItem(this.key) || '{}'); } catch {}
    try { this.lists = await getJSON(this.getAttribute('src') || '/data/checklists.json'); } catch { return; }
    const keys = Object.keys(this.lists);
    this.cur = this.lists[this.getAttribute('list') || ''] ? this.getAttribute('list')! : keys[0];
    this.build();
    this.draw();
  }
  select(key: string) {
    if (!this.lists[key]) return;
    this.cur = key; this.draw();
  }
  private labels(): Record<string, string> {
    try { return JSON.parse(this.getAttribute('labels') || '{}'); } catch { return {}; }
  }
  private build() {
    const keys = Object.keys(this.lists), lab = this.labels();
    const tabs = this.getAttribute('tabs') !== 'false' && keys.length > 1
      ? `<div class="tpa-cl-tabs" role="tablist">${keys.map((k) => `<button role="tab" data-key="${esc(k)}">${esc(lab[k] || k[0].toUpperCase() + k.slice(1))}</button>`).join('')}</div>` : '';
    this.innerHTML = `${tabs}<div class="tpa-cl-prog"><div class="tpa-cl-bar"><i></i></div><span class="tpa-cl-txt"></span><button type="button" class="tpa-cl-reset">Reset</button></div><div class="tpa-cl-steps"></div>`;
    this.querySelectorAll<HTMLButtonElement>('.tpa-cl-tabs button').forEach((b) => b.addEventListener('click', () => this.select(b.dataset.key!)));
    this.querySelector('.tpa-cl-reset')!.addEventListener('click', () => {
      Object.keys(this.state).forEach((k) => { if (k.startsWith(this.cur + '-')) delete this.state[k]; });
      this.save(); this.draw();
    });
    this.querySelector('.tpa-cl-steps')!.addEventListener('change', (e) => {
      const t = e.target as HTMLInputElement, id = t.dataset.id; if (!id) return;
      if (t.checked) this.state[id] = 1; else delete this.state[id];
      this.save(); this.progress();
    });
  }
  private save() { try { localStorage.setItem(this.key, JSON.stringify(this.state)); } catch {} }
  private draw() {
    this.querySelectorAll<HTMLElement>('.tpa-cl-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.key === this.cur)));
    this.querySelector('.tpa-cl-steps')!.innerHTML = this.lists[this.cur].map((s, i) =>
      `<section class="tpa-cl-step"><header><span class="tpa-cl-n">${i + 1}</span><h3>${esc(s.title)}</h3><span class="tpa-cl-when">${esc(s.when)}</span></header><ul>${
        s.items.map((it, j) => { const id = `${this.cur}-${i}-${j}`; return `<li><label><input type="checkbox" data-id="${id}"${this.state[id] ? ' checked' : ''}><span>${esc(it)}</span></label></li>`; }).join('')
      }</ul>${s.tip ? `<p class="tpa-cl-tip">${esc(s.tip)}</p>` : ''}</section>`).join('');
    this.progress();
  }
  private progress() {
    const all = this.querySelectorAll('.tpa-cl-steps input').length, done = this.querySelectorAll('.tpa-cl-steps input:checked').length;
    (this.querySelector('.tpa-cl-bar i') as HTMLElement).style.width = (all ? (done / all) * 100 : 0) + '%';
    this.querySelector('.tpa-cl-txt')!.textContent = `${done} of ${all} done`;
    emit(this, 'tpa-checklist:progress', { list: this.cur, done, total: all });
  }
}
if (!customElements.get('tpa-checklist')) customElements.define('tpa-checklist', TpaChecklist);
