// Tiny DOM helpers: safe HTML templating, toasts, modals, formatting.

export class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s ?? '');

export function esc(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(esc).join('');
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s + (i < vals.length ? esc(vals[i]) : ''); });
  return raw(out);
}

// Swap a view container for a fresh one so delegated listeners from a previous render don't pile up.
export function fresh(el) { const n = document.createElement('div'); n.className = 'view'; el.replaceWith(n); return n; }

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function on(root, event, selector, fn) {
  root.addEventListener(event, (e) => {
    const t = e.target.closest(selector);
    if (t && root.contains(t)) fn(e, t);
  });
}

// ---------- toasts ----------
export function toast(msg, kind = 'ok') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'error' ? 6000 : 3500);
}

// ---------- modal ----------
export function modal(content, { wide = false, onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
    <button class="modal-x" aria-label="Close">×</button><div class="modal-body">${esc(content)}</div></div>`;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', key); onClose && onClose(); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('.modal-x') || e.target.closest('a[href^="#"]')) close(); });
  document.addEventListener('keydown', key);
  document.body.appendChild(wrap);
  return { el: wrap.querySelector('.modal-body'), close };
}

export function confirmBox(message, okLabel = 'Confirm') {
  return new Promise((resolve) => {
    let done = false;
    const m = modal(html`<p class="confirm-msg">${message}</p>
      <div class="row-end"><button class="btn btn-ghost" data-no>Cancel</button><button class="btn btn-primary" data-yes>${okLabel}</button></div>`,
      { onClose: () => { if (!done) resolve(false); } });
    m.el.querySelector('[data-yes]').onclick = () => { done = true; m.close(); resolve(true); };
    m.el.querySelector('[data-no]').onclick = () => { done = true; m.close(); resolve(false); };
  });
}

// ---------- formatting ----------
const inr = new Intl.NumberFormat('en-IN');
export const rupees = (n) => (n == null || n === '' ? '—' : '₹' + inr.format(Number(n)));
export function salaryRange(min, max) {
  if (!min && !max) return 'Not specified';
  if (min && max && min !== max) return `${rupees(min)} – ${rupees(max)}`;
  return rupees(min || max);
}
export const km = (d) => (d == null || !isFinite(d) ? '' : d < 1 ? `${Math.round(d * 1000)} m` : `${d < 10 ? d.toFixed(1) : Math.round(d)} km`);
export const yrs = (n) => { n = Number(n || 0); return n === 0 ? 'Fresher' : `${n % 1 ? n.toFixed(1) : n} yr${n === 1 ? '' : 's'}`; };
export function ago(ts) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

export function statusBadge(status) {
  const label = { pending: 'Pending review', approved: 'Verified', rejected: 'Rejected', open: 'Open', closed: 'Closed',
    applied: 'Applied', invited: 'Invited', shortlisted: 'Shortlisted', interview: 'Interview', hired: 'Hired', withdrawn: 'Withdrawn' }[status] || status;
  return html`<span class="badge badge-${status}">${label}</span>`;
}

export function langList(langs) {
  if (!langs || !langs.length) return html`<span class="muted">—</span>`;
  return html`${langs.map((l) => html`<span class="chip">${l.language}${l.proficiency ? html` <small>· ${l.proficiency}</small>` : ''}</span>`)}`;
}

export function yesNo(v) { return v ? html`<span class="yes">✓ Yes</span>` : html`<span class="no">✗ No</span>`; }

// Serialize a form into an object. Checkbox groups (same name, several boxes) → arrays.
export function formData(form) {
  const out = {};
  const groups = {};
  $$('input[type=checkbox]', form).forEach((c) => { groups[c.name] = (groups[c.name] || 0) + 1; });
  for (const el of form.elements) {
    if (!el.name || el.disabled || el.type === 'file' || el.type === 'submit' || el.type === 'button') continue;
    if (el.closest('[data-repeat]')) continue; // handled by repeaters
    if (el.type === 'checkbox') {
      if (groups[el.name] > 1) { out[el.name] = out[el.name] || []; if (el.checked) out[el.name].push(el.value); }
      else out[el.name] = el.checked;
    } else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
    else out[el.name] = el.value.trim();
  }
  return out;
}

export const num = (v) => (v === '' || v == null ? null : Number(v));

export function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span>${label || 'Please wait…'}`; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}

const PAY_UNIT = { month: '/month', session: '/session', event: ' total', hour: '/hour' };
export function payRange(min, max, unit = 'month') {
  const r = salaryRange(min, max);
  return r === 'Not specified' ? r : r + (PAY_UNIT[unit] || '');
}
