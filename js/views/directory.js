// Browse teachers: class teachers, extracurricular instructors and one-time event performers.
import { api } from '../api/index.js';
import { fresh, withLoader, loaderHTML, html, esc, $, $$, toast, rupees, yrs, km, initials, modal, on } from '../lib/dom.js';
import { ACTIVITIES, SKILLS, LANGUAGES, WORK_LABEL } from '../lib/constants.js';
import { distanceKm, geocode } from '../lib/geo.js';
import { options } from './widgets.js';
import { state } from '../app.js';

const MODES = [
  ['all', 'All teachers', ''],
  ['class', 'Class teachers', '🏫'],
  ['extracurricular', 'Extracurricular', '🎨'],
  ['event', 'One-time events', '🎉'],
];
const willTravel = (t, d) => d == null || !t.travel_km || t.travel_km >= 50 || d <= t.travel_km;
const worksOf = (t) => (t.work_types && t.work_types.length ? t.work_types : ['class']);

export async function browseTeachers(el, _p, q) {
  el = fresh(el);
  const u = state.user;
  const full = u?.role === 'admin' || (u?.role === 'school' && state.profile?.status === 'approved');
  const rows = await withLoader(api.listTeacherDirectory(full), 1600);
  const f = {
    mode: MODES.some((m) => m[0] === q.type) ? q.type : 'all',
    picks: q.activity ? [q.activity] : [],
    dist: 51, exp: 0, budget: '', lang: '', video: false, sort: 'near',
    origin: (u?.role === 'school' || u?.role === 'teacher') && state.profile?.lat != null ? { lat: state.profile.lat, lng: state.profile.lng, label: u.role === 'school' ? 'your school' : 'your home' } : null,
  };
  if (f.origin) f.dist = 25;
  const allActs = [...new Set([...ACTIVITIES, ...rows.flatMap((t) => t.activities || [])])];

  el.innerHTML = esc(html`<section class="page wide">
    <div class="page-head"><div><p class="eyebrow">Browse teachers</p><h1>Find teachers near you</h1>
      <p class="muted">Class teachers, plus instructors for yoga, dance, art, pottery and more — for weekly classes or one-time events.</p></div>
      ${!u ? html`<a class="btn btn-primary" href="#/register?as=school">Register your school</a>` : ''}</div>
    ${!full ? html`<div class="note note-info limited-note">${u?.role === 'school'
      ? 'You\'ll see full names, contact details and teaching videos once your school is verified.'
      : html`You're seeing a preview: first names and approximate locations. <a href="#/register?as=school">Verified schools</a> see full profiles, contact details and teaching videos.`}</div>` : ''}
    <div class="mode-tabs" role="group" aria-label="Type of teacher">${MODES.map(([k, l, i]) => html`<button class="mode-tab" data-mode="${k}" aria-pressed="${f.mode === k}">${i ? i + ' ' : ''}${l}</button>`)}</div>
    <div class="finder">
      <aside class="filters card" aria-label="Filters"><h2>Filters</h2>
        <label>Near<div class="near"><input type="search" data-near placeholder="Area or pincode" value="${f.origin && u?.role !== 'school' && u?.role !== 'teacher' ? f.origin.label : ''}"><button type="button" class="btn btn-ghost btn-sm" data-me title="Use my location">📍</button></div>
          <small class="hint" data-origin>${f.origin ? `Distances from ${f.origin.label}` : 'Set a location to sort by distance'}</small></label>
        <label data-distwrap ${f.origin ? '' : 'hidden'}>Within: <strong data-distlabel></strong><input type="range" name="dist" min="1" max="51" value="${f.dist}"></label>
        <fieldset><legend data-pickslabel></legend><div class="chip-picks small" data-picks></div></fieldset>
        <label>Minimum experience<select name="exp">${options([[0, 'Any'], [1, '1+ yr'], [2, '2+ yrs'], [3, '3+ yrs'], [5, '5+ yrs'], [8, '8+ yrs']], 0)}</select></label>
        <label data-budgetlabel>Budget up to (₹)<input type="number" name="budget" min="0" step="100" placeholder="Any"></label>
        <label>Speaks<select name="lang">${options(LANGUAGES, '', { placeholder: 'Any language' })}</select></label>
        <label class="check"><input type="checkbox" name="video"> Has a teaching video</label>
        <label class="check" data-radiuswrap ${f.origin ? '' : 'hidden'}><input type="checkbox" name="radius" checked> Only teachers willing to travel this far</label>
        <label>Sort by<select name="sort">${options([['near', 'Nearest first'], ['exp', 'Most experienced'], ['price', 'Lowest price']], f.sort)}</select></label>
      </aside>
      <div class="results"><div class="results-head"><p data-count></p></div><div class="cards" data-list></div></div>
    </div></section>`);

  const panel = $('.filters', el);
  const price = (t) => (f.mode === 'extracurricular' ? t.session_fee : f.mode === 'event' ? t.event_fee : t.expected_salary);
  const priceLine = (t) => {
    const w = worksOf(t), parts = [];
    if (w.includes('class') && t.expected_salary && f.mode !== 'extracurricular' && f.mode !== 'event') parts.push(`${rupees(t.expected_salary)}/month`);
    if (w.includes('extracurricular') && t.session_fee && (f.mode === 'all' || f.mode === 'extracurricular')) parts.push(`${rupees(t.session_fee)}/session`);
    if (w.includes('event') && t.event_fee && (f.mode === 'all' || f.mode === 'event')) parts.push(`events from ${rupees(t.event_fee)}`);
    return parts.join(' · ');
  };

  const renderPicks = () => {
    const list = f.mode === 'class' ? SKILLS : f.mode === 'all' ? [...new Set([...allActs, ...SKILLS])] : allActs;
    $('[data-pickslabel]', el).textContent = f.mode === 'class' ? 'Special skills' : 'Activity';
    $('[data-picks]', el).innerHTML = esc(html`${list.map((s) => html`<label class="chip-pick"><input type="checkbox" name="picks" value="${s}" ${f.picks.includes(s) ? 'checked' : ''}><span>${s}</span></label>`)}`);
    $('[data-budgetlabel]', el).firstChild.textContent = f.mode === 'extracurricular' ? 'Fee per session up to (₹)' : f.mode === 'event' ? 'Event fee up to (₹)' : 'Monthly salary up to (₹)';
    $$('[data-mode]', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === f.mode));
  };

  const card = (t) => {
    const d = f.origin ? t._dist : null;
    const acts = t.activities || [];
    const tags = [...acts, ...(t.skills || []).filter((s) => !acts.includes(s))];
    const picks = new Set(f.picks);
    const pl = priceLine(t);
    return html`<article class="tcard">
      <div class="tcard-top"><span class="avatar">${initials(t.full_name)}</span>
        <div class="grow"><a class="tname" href="#/teachers/${t.id}" data-open="${t.id}">${t.full_name}</a>
          <div class="muted small">${t.qualification || (worksOf(t).includes('class') ? 'Preschool teacher' : 'Extracurricular instructor')}</div></div>
        ${d != null ? html`<span class="dist">📍 ${km(d)}</span>` : ''}</div>
      <div class="chips">${worksOf(t).map((w) => html`<span class="chip chip-work">${WORK_LABEL[w] || w}</span>`)}</div>
      <div class="tfacts"><span>🎓 ${yrs(t.experience_years)}</span>${pl ? html`<span class="fee">💰 ${pl}</span>` : ''}
        ${t.video_path || t.video_link || t.has_video ? html`<span class="good">🎬 Video</span>` : ''}${t.travel_km ? (d != null && !willTravel(t, d) ? html`<span class="beyond-badge">🚗 Usually ≤ ${t.travel_km} km</span>` : html`<span>🚗 Travels ${t.travel_km >= 50 ? '50+' : t.travel_km} km</span>`) : ''}</div>
      <div class="chips">${tags.slice(0, 7).map((s) => html`<span class="chip ${picks.has(s) ? 'chip-match' : 'chip-skill'}">${s}</span>`)}</div>
      ${t.about ? html`<p class="small muted clamp">${t.about}</p>` : ''}
      <div class="row"><a class="btn ${full ? 'btn-primary' : 'btn-ghost'} btn-sm" href="#/teachers/${t.id}" data-open="${t.id}">View profile</a>
        ${full && t.phone ? html`<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/91${t.whatsapp || t.phone}">💬 WhatsApp</a>` : ''}</div>
    </article>`;
  };

  const render = () => {
    const v = (n) => panel.querySelector(`[name=${n}]`);
    f.dist = Number(v('dist').value); f.exp = Number(v('exp').value); f.budget = v('budget').value; f.lang = v('lang').value;
    f.video = v('video').checked; f.sort = v('sort').value;
    f.picks = $$('[name=picks]:checked', panel).map((c) => c.value);
    $('[data-distlabel]', el).textContent = f.dist > 50 ? 'Any distance' : `${f.dist} km`;
    const list = rows.map((t) => ({ ...t, _dist: f.origin ? distanceKm(f.origin, t) : null })).filter((t) => {
      const w = worksOf(t);
      if (f.mode !== 'all' && !w.includes(f.mode)) return false;
      if (f.origin && f.dist <= 50 && (t._dist == null || t._dist > f.dist)) return false;
      if ((Number(t.experience_years) || 0) < f.exp) return false;
      if (f.budget && f.mode !== 'all') { const p = price(t); if (p && p > Number(f.budget)) return false; }
      if (f.budget && f.mode === 'all') { const ps = [t.expected_salary, t.session_fee, t.event_fee].filter(Boolean); if (ps.length && Math.min(...ps) > Number(f.budget)) return false; }
      if (f.picks.length) { const have = new Set([...(t.activities || []), ...(t.skills || [])]); if (!f.picks.some((p) => have.has(p))) return false; }
      if (f.lang && !(t.languages || []).some((l) => l.language?.toLowerCase() === f.lang.toLowerCase())) return false;
      if (f.video && !(t.video_path || t.video_link || t.has_video)) return false;
      if (f.origin && v('radius').checked && !willTravel(t, t._dist)) return false;
      return true;
    }).sort((a, b) => (f.sort === 'exp' ? (b.experience_years || 0) - (a.experience_years || 0)
      : f.sort === 'price' ? (price(a) || 1e9) - (price(b) || 1e9)
      : (a._dist ?? 1e9) - (b._dist ?? 1e9) || (b.experience_years || 0) - (a.experience_years || 0)));
    const label = { all: 'teacher', class: 'class teacher', extracurricular: 'extracurricular teacher', event: 'event performer' }[f.mode];
    $('[data-count]', el).innerHTML = esc(html`<strong>${list.length}</strong> ${label}${list.length === 1 ? '' : 's'}${f.picks.length ? ` for ${f.picks.join(' / ')}` : ''}${f.origin && f.dist <= 50 ? ` within ${f.dist} km of ${f.origin.label}` : ''}`);
    $('[data-list]', el).innerHTML = list.length ? esc(html`${list.map(card)}`)
      : esc(html`<div class="empty"><div class="big-ico">🔍</div><p>No teachers match yet. Try a wider distance or fewer filters.</p></div>`);
  };

  const setOrigin = (o) => {
    f.origin = o; $('[data-origin]', el).textContent = o ? `Distances from ${o.label}` : 'Set a location to sort by distance';
    $('[data-distwrap]', el).hidden = !o; $('[data-radiuswrap]', el).hidden = !o; if (o && Number(panel.querySelector('[name=dist]').value) > 50) panel.querySelector('[name=dist]').value = 15;
    render();
  };
  on(el, 'click', '[data-mode]', (e, b) => {
    f.mode = b.dataset.mode; renderPicks();
    $('[data-count]', el).innerHTML = ''; $('[data-list]', el).innerHTML = loaderHTML({ class: 'Finding class teachers', extracurricular: 'Finding instructors', event: 'Finding event performers' }[f.mode] || 'Finding teachers', { compact: true });
    clearTimeout(el._t); el._t = setTimeout(render, 700); history.replaceState(null, '', `#/teachers${f.mode !== 'all' ? '?type=' + f.mode : ''}`); });
  panel.addEventListener('input', (e) => { if (!e.target.matches('[data-near]')) render(); });
  $('[data-me]', el).onclick = () => {
    if (!navigator.geolocation) return toast('Location isn\'t available in this browser', 'error');
    navigator.geolocation.getCurrentPosition((p) => setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'you' }), () => toast('Couldn\'t get your location — type an area instead', 'error'), { timeout: 10000 });
  };
  $('[data-near]', el).addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return; e.preventDefault();
    const q2 = e.target.value.trim(); if (!q2) return setOrigin(null);
    try { const r = await geocode(q2); if (!r.length) return toast('Couldn\'t find that place', 'error'); setOrigin({ lat: r[0].lat, lng: r[0].lng, label: q2 }); }
    catch { toast('Location search is unavailable right now', 'error'); }
  });
  $('[data-near]', el).addEventListener('change', (e) => { if (!e.target.value.trim() && u?.role !== 'school' && u?.role !== 'teacher') setOrigin(null); });
  if (!full) on(el, 'click', '[data-open]', (e, a) => {
    if (u?.role === 'teacher' && a.dataset.open === u.id) return; // their own profile is fine
    e.preventDefault();
    modal(html`<h2>See the full profile</h2><p>Full names, contact details and teaching videos are shared only with <strong>verified schools</strong>, to keep teachers safe.</p>
      <div class="row-end">${u ? html`<a class="btn btn-ghost" href="#/school/profile">School profile</a>` : html`<a class="btn btn-ghost" href="#/login?as=school">Log in</a><a class="btn btn-primary" href="#/register?as=school">Register your school</a>`}</div>`);
  });
  renderPicks(); render();
}
