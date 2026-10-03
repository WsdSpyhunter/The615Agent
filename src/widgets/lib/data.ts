// Tiny shared helpers for the widgets. No design or site-specific code in here.
const cache = new Map<string, Promise<any>>();

/** Fetch JSON once per URL per page load. */
export function getJSON<T = any>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(url, fetch(url, { headers: { Accept: 'application/json' } }).then((r) => {
      if (!r.ok) throw new Error(`${url} returned ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(url)!;
}

export const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const money0 = (v: number) => '$' + Math.round(v).toLocaleString();
export const money2 = (v: number) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Read a boolean attribute: present and not "false" = true. */
export const flag = (el: Element, name: string, dflt = false) => {
  if (!el.hasAttribute(name)) return dflt;
  const v = el.getAttribute(name);
  return v !== 'false' && v !== '0';
};

/** Dispatch a bubbling CustomEvent so any page can react to a widget. */
export const emit = (el: Element, name: string, detail: unknown) =>
  el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
