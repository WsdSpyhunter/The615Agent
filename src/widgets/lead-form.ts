/**
 * Lead-form behavior (no markup, no styling). Add data-tpa-lead to any <form> and it will:
 *   - POST the fields (as a FormData) to its data-endpoint (default https://api.web3forms.com/submit)
 *   - show the element with [data-ok] on success and [data-err] on failure
 *   - join multiple values of a repeated field named "areas" into one comma list
 * Needs inside the form: a submit button, optional [data-ok] and [data-err] message elements, and the
 * hidden Web3Forms fields (access_key, subject, ...). Fires a "tpa-lead:sent" event on success.
 */
function wire(form: HTMLFormElement) {
  if ((form as any).__tpa) return; (form as any).__tpa = true;
  // Reveal helper: a checkbox with data-reveals="x" shows the element with data-reveal-box="x" while it is ticked.
  const sync = () => form.querySelectorAll<HTMLInputElement>('[data-reveals]').forEach((cb) => {
    const box = form.querySelector<HTMLElement>(`[data-reveal-box="${cb.dataset.reveals}"]`);
    if (!box) return;
    box.hidden = !cb.checked;
    if (!cb.checked) box.querySelectorAll('input').forEach((i) => (i.value = ''));
  });
  form.addEventListener('change', sync);
  form.addEventListener('reset', () => setTimeout(sync));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = form.querySelector<HTMLElement>('[data-ok]'), err = form.querySelector<HTMLElement>('[data-err]');
    if (ok) ok.hidden = true; if (err) err.hidden = true;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]');
    const label = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    const fd = new FormData(form);
    const areas = fd.getAll('areas');
    if (areas.length) { fd.delete('areas'); fd.set('areas', areas.join(', ')); }
    try {
      const res = await fetch(form.dataset.endpoint || 'https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: fd });
      const data = await res.json();
      if (res.ok && data.success) { if (ok) ok.hidden = false; form.reset(); form.dispatchEvent(new CustomEvent('tpa-lead:sent', { bubbles: true })); }
      else if (err) err.hidden = false;
    } catch { if (err) err.hidden = false; }
    if (btn) { btn.disabled = false; btn.textContent = label ?? ''; }
  });
}
export const wireLeadForms = (root: ParentNode = document) => root.querySelectorAll<HTMLFormElement>('form[data-tpa-lead]').forEach(wire);
wireLeadForms();
