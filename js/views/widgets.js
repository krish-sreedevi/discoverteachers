// Reusable form widgets: language/proficiency rows, experience rows, skill chips, selects.
import { html, esc, $$ } from '../lib/dom.js?v=20261001-6';
import { LANGUAGES, PROFICIENCY, SKILLS } from '../lib/constants.js?v=20261001-6';

export function options(list, selected, { placeholder } = {}) {
  return html`${placeholder != null ? html`<option value="">${placeholder}</option>` : ''}${list.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return html`<option value="${v}" ${String(v) === String(selected ?? '') ? 'selected' : ''}>${l}</option>`;
  })}`;
}

// ---------- languages ----------
function langRow(l = {}) {
  return html`<div class="rep-row lang-row">
    <input list="dl-langs" data-f="language" placeholder="Language" value="${l.language || ''}" aria-label="Language">
    <select data-f="proficiency" aria-label="Proficiency">${options(PROFICIENCY, l.proficiency || 'Fluent')}</select>
    <button type="button" class="icon-btn" data-rm aria-label="Remove">×</button></div>`;
}
export function languagesField(langs = [], { label = 'Languages known', hint = '' } = {}) {
  const rows = langs.length ? langs : [{ language: 'English', proficiency: 'Fluent' }];
  return html`<fieldset class="rep" data-repeat="languages">
    <legend>${label}</legend>${hint ? html`<p class="hint">${hint}</p>` : ''}
    <datalist id="dl-langs">${LANGUAGES.map((x) => html`<option value="${x}">`)}</datalist>
    <div data-rows>${rows.map(langRow)}</div>
    <button type="button" class="btn btn-ghost btn-sm" data-add>+ Add language</button></fieldset>`;
}

// ---------- experience ----------
function expRow(x = {}) {
  return html`<div class="rep-row exp-row">
    <input data-f="school" placeholder="School / centre name" value="${x.school || ''}" aria-label="School">
    <input data-f="role" placeholder="Role (e.g. Class teacher)" value="${x.role || ''}" aria-label="Role">
    <input data-f="from" placeholder="From (year)" inputmode="numeric" value="${x.from || ''}" aria-label="From year">
    <input data-f="to" placeholder="To (year / Present)" value="${x.to || ''}" aria-label="To year">
    <button type="button" class="icon-btn" data-rm aria-label="Remove">×</button>
    <input class="span-all" data-f="notes" placeholder="What did you teach / achieve? (optional)" value="${x.notes || ''}" aria-label="Notes"></div>`;
}
export function experienceField(list = []) {
  return html`<fieldset class="rep" data-repeat="experience">
    <legend>Previous experience</legend><p class="hint">Add each school you've taught at. Leave empty if you're a fresher.</p>
    <div data-rows>${list.map(expRow)}</div>
    <button type="button" class="btn btn-ghost btn-sm" data-add>+ Add a previous job</button></fieldset>`;
}

export function mountRepeaters(root) {
  $$('[data-repeat]', root).forEach((box) => {
    const kind = box.dataset.repeat;
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-rm]')) e.target.closest('.rep-row').remove();
      if (e.target.closest('[data-add]')) {
        const tpl = document.createElement('div');
        tpl.innerHTML = esc(kind === 'languages' ? langRow({ proficiency: 'Conversational' }) : expRow());
        box.querySelector('[data-rows]').appendChild(tpl.firstElementChild);
        box.querySelector('[data-rows] .rep-row:last-child input')?.focus();
      }
    });
  });
}

export function readRepeater(root, kind) {
  const box = root.querySelector(`[data-repeat="${kind}"]`);
  if (!box) return [];
  return $$('.rep-row', box).map((row) => {
    const o = {};
    $$('[data-f]', row).forEach((i) => { o[i.dataset.f] = i.value.trim(); });
    return o;
  }).filter((o) => (kind === 'languages' ? o.language : o.school || o.role));
}

// ---------- skills ----------
export function skillsField(selected = [], { name = 'skills', label = 'Special skills', other = '', otherName = 'skills_other', list = SKILLS, otherLabel = 'Other skills', otherPlaceholder = 'e.g. Bharatanatyam, Carnatic vocals, sign language' } = {}) {
  const set = new Set(selected);
  return html`<fieldset class="chips-field"><legend>${label}</legend>
    <div class="chip-picks">${[...new Set([...list, ...selected])].map((s) => html`<label class="chip-pick"><input type="checkbox" name="${name}" value="${s}" ${set.has(s) ? 'checked' : ''}><span>${s}</span></label>`)}</div>
    ${otherName ? html`<label class="mt">${otherLabel} <input name="${otherName}" value="${other}" placeholder="${otherPlaceholder}"></label>` : ''}
  </fieldset>`;
}

export function yesNoField(name, label, value) {
  return html`<div class="yn"><span>${label}</span>
    <label class="seg"><input type="radio" name="${name}" value="yes" ${value ? 'checked' : ''}><span>Yes</span></label>
    <label class="seg"><input type="radio" name="${name}" value="no" ${!value ? 'checked' : ''}><span>No</span></label></div>`;
}
