import { api } from '../api/index.js?v=20261001-10';
import { fresh, withLoader, showLoader, loaderHTML, html, esc, $, $$, toast, setBusy, salaryRange, payRange, km, ago, statusBadge, langList, yesNo, modal } from '../lib/dom.js?v=20261001-10';
import { distanceKm, baseMap, pinIcon, gmapsDirections, gmapsUrl } from '../lib/geo.js?v=20261001-10';
import { options } from './widgets.js?v=20261001-10';
import { JOB_TYPE_LABEL, jobWorkType } from '../lib/constants.js?v=20261001-10';

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
import { state } from '../app.js?v=20261001-10';

export function jobCard(j, { dist, app } = {}) {
  return html`<a class="jcard" href="#/jobs/${j.id}">
    <div class="jcard-top"><span class="avatar avatar-school">${{ extracurricular: '🎨', event: '🎉' }[j.job_type] || '🏫'}</span>
      <div class="grow"><h3>${j.title}</h3><p class="muted small">${j.school?.name || ''}</p></div>
      ${dist != null ? html`<span class="dist">📍 ${km(dist)}</span>` : ''}</div>
    <div class="tfacts"><span class="good">💰 ${payRange(j.salary_min, j.salary_max, j.pay_unit)}</span>${j.job_type === 'event' && j.event_date ? html`<span>📅 ${fmtDate(j.event_date)}</span>` : html`<span>🕘 ${j.timings || '—'}</span>`}
      <span>${j.openings} opening${j.openings > 1 ? 's' : ''}</span></div>
    <div class="chips">${j.job_type && j.job_type !== 'full_time' ? html`<span class="chip chip-type-${j.job_type}">${JOB_TYPE_LABEL[j.job_type]}</span>` : ''}${j.activity ? html`<span class="chip chip-match">${j.activity}</span>` : ''}${j.curriculum && jobWorkType(j.job_type) === 'class' ? html`<span class="chip">${j.curriculum}</span>` : ''}${j.bus_provided ? html`<span class="chip chip-skill">🚌 Bus</span>` : ''}${j.food_provided ? html`<span class="chip chip-skill">🍱 Food</span>` : ''}
      ${(j.languages || []).slice(0, 3).map((l) => html`<span class="chip">${l.language}</span>`)}</div>
    <div class="jcard-foot"><span class="muted small">${j.address?.split(',').slice(-3, -1).join(',').trim() || ''} · ${ago(j.created_at)}</span>${app ? statusBadge(app.status) : html`<span class="jcard-more">View job →</span>`}</div>
  </a>`;
}

export async function browse(el, _p, q) {
  const me = state.user?.role === 'teacher' ? state.profile : null;
  const [jobs, apps] = await withLoader(Promise.all([api.listOpenJobs(), me ? api.myApplications().catch(() => []) : []]), 1600);
  const appBy = Object.fromEntries(apps.map((a) => [a.job_id, a]));
  const all = jobs.map((j) => ({ ...j, _dist: me ? distanceKm(me, j) : null }));
  // Teachers start on the kind of work they're looking for; everyone else on class-teacher jobs
  const startMode = ['class', 'extracurricular', 'event'].includes(q.type) ? q.type : (me?.work_types?.[0] || 'class');
  const curricula = [...new Set(all.map((j) => j.curriculum).filter(Boolean))];
  el.innerHTML = esc(html`<section class="page wide">
    <div class="page-head"><div><p class="eyebrow">Preschool jobs</p><h1>${me ? 'Jobs near you' : 'Open teaching jobs'}</h1></div>
      ${!state.user ? html`<a class="btn btn-primary" href="#/register?as=teacher">Create teacher profile</a>` : ''}</div>
    <div class="mode-tabs" role="group" aria-label="Type of job">${[['class', '🏫 Class teacher'], ['extracurricular', '🎨 Extracurricular'], ['event', '🎉 One-time events']].map(([k, l]) => html`<button class="mode-tab" data-mode="${k}" aria-pressed="${startMode === k}">${l}</button>`)}</div>
    <div class="finder">
      <aside class="filters card" aria-label="Filters"><h2>Filters</h2>
        <label>Search<input type="search" name="q" value="${q.q || ''}" placeholder="Title, school, area…"></label>
        ${me ? html`<label>Distance from home: <strong data-distlabel></strong><input type="range" name="dist" min="1" max="51" value="${q.dist || (me?.travel_km ? Math.min(me.travel_km, 51) : 51)}"></label>` : ''}
        <label data-minlabel>Minimum pay (₹)<input type="number" name="minSal" step="100" min="0" placeholder="Any"></label>
        <label>Curriculum<select name="curr">${options(curricula, '', { placeholder: 'Any' })}</select></label>
        <label class="check"><input type="checkbox" name="bus"> Bus / pick-up provided</label>
        <label class="check"><input type="checkbox" name="food"> Food provided</label>
        <label>Sort by<select name="sort">${options([['new', 'Newest'], ...(me ? [['near', 'Nearest']] : []), ['pay', 'Highest pay']], me ? 'near' : 'new')}</select></label>
      </aside>
      <div class="results"><div class="results-head"><p data-count></p></div><div class="cards" data-list></div></div>
    </div></section>`);
  const panel = $('.filters', el);
  let mode = startMode;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    mode = b.dataset.mode; el.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    history.replaceState(null, '', `#/jobs?type=${mode}`);
    $('[data-count]', el).innerHTML = ''; $('[data-list]', el).innerHTML = loaderHTML('Finding jobs', { compact: true });
    clearTimeout(el._t); el._t = setTimeout(render, 700);
  });
  const render = () => {
    $('[data-minlabel]', el).firstChild.textContent = { all: 'Minimum pay (₹)', class: 'Minimum salary (₹/month)', extracurricular: 'Minimum fee per session (₹)', event: 'Minimum event fee (₹)' }[mode];
    const v = (n) => panel.querySelector(`[name=${n}]`);
    const text = v('q').value.trim().toLowerCase(), dist = v('dist') ? Number(v('dist').value) : 51;
    if (v('dist')) $('[data-distlabel]', el).textContent = dist > 50 ? 'Any' : `${dist} km`;
    const minSal = Number(v('minSal').value || 0), curr = v('curr').value, bus = v('bus').checked, food = v('food').checked, sort = v('sort').value;
    const list = all.filter((j) => (mode === 'all' || jobWorkType(j.job_type) === mode) && (!text || `${j.title} ${j.school?.name} ${j.address} ${j.description} ${j.activity || ''}`.toLowerCase().includes(text))
      && (dist > 50 || (j._dist != null && j._dist <= dist)) && (!minSal || (j.salary_max || 0) >= minSal)
      && (!curr || j.curriculum === curr) && (!bus || j.bus_provided) && (!food || j.food_provided))
      .sort((a, b) => (sort === 'near' ? (a._dist ?? 1e9) - (b._dist ?? 1e9) : sort === 'pay' ? (b.salary_max || 0) - (a.salary_max || 0) : b.created_at.localeCompare(a.created_at)));
    $('[data-count]', el).innerHTML = esc(html`<strong>${list.length}</strong> open job${list.length === 1 ? '' : 's'}`);
    $('[data-list]', el).innerHTML = list.length ? esc(html`${list.map((j) => jobCard(j, { dist: j._dist, app: appBy[j.id] }))}`)
      : esc(html`<div class="empty"><div class="big-ico">🧸</div><p>No jobs match yet. Widen your filters or check back soon.</p></div>`);
  };
  panel.addEventListener('input', render);
  render();
}

export async function detail(el, { id }) {
  el = fresh(el);
  if (!el.querySelector('.dt-loader')) showLoader(el, 'Loading job');
  const j = await withLoader(api.getJob(id), 600);
  if (!j) { el.innerHTML = esc(html`<section class="page narrow center"><h1>Job not found</h1><p class="muted">It may have been filled or closed.</p><a class="btn btn-primary" href="#/jobs">Browse jobs</a></section>`); return; }
  const u = state.user, me = u?.role === 'teacher' ? state.profile : null;
  const app = me ? (await api.myApplications()).find((a) => a.job_id === id) : null;
  const dist = me ? distanceKm(me, j) : null;
  const s = j.school || {};
  let cta;
  if (!u) cta = html`<a class="btn btn-primary btn-block" href="#/register?as=teacher">Create a teacher profile to apply</a><p class="small center mt">Already registered? <a href="#/login?as=teacher">Log in</a></p>`;
  else if (u.role === 'teacher') {
    if (app && app.status !== 'withdrawn') cta = html`<p class="center">${statusBadge(app.status)}</p>
      ${app.status === 'invited' ? html`<p class="small center">${s.name} invited you to apply!</p><button class="btn btn-primary btn-block" data-apply>Accept & apply</button>` : ''}
      ${['applied', 'invited', 'shortlisted'].includes(app.status) ? html`<button class="btn btn-ghost btn-block mt" data-withdraw>${app.status === 'invited' ? 'Not interested' : 'Withdraw application'}</button>` : ''}`;
    else if (me?.status !== 'approved') cta = html`<button class="btn btn-primary btn-block" disabled>Apply</button><p class="small center mt muted">You can apply once your profile is verified.</p>`;
    else cta = html`<button class="btn btn-primary btn-block" data-apply>Apply now</button>`;
  } else if (u.role === 'school' && j.school_id === u.id) cta = html`<a class="btn btn-primary btn-block" href="#/school/jobs/${j.id}">Manage this listing</a>`;
  else cta = '';

  el.innerHTML = esc(html`<section class="page narrow">
    <a class="back" href="#/jobs">← All jobs</a>
    <div class="card profile-head"><div class="avatar avatar-lg avatar-school">🏫</div>
      <div class="grow"><p class="eyebrow">${j.status === 'closed' ? statusBadge('closed') : ''} Posted ${ago(j.created_at)}</p><h1>${j.title}</h1>
        <p><a href="#/schools/${s.id}">${s.name}</a>${s.status === 'approved' ? html` ${statusBadge('approved')}` : ''}</p>
        <p class="facts"><span>💰 <strong>${payRange(j.salary_min, j.salary_max, j.pay_unit)}</strong></span>${j.timings || j.working_days ? html`<span>🕘 ${j.timings || ''}${j.timings && j.working_days ? ' · ' : ''}${j.working_days || ''}</span>` : ''}
        ${dist != null ? html`<span>📍 <strong>${km(dist)}</strong> from your home</span>` : ''}</p></div></div>
    <div class="grid-2-1"><div>
      <div class="card"><h2>About the role</h2><p class="pre">${j.description || ''}</p>
        ${j.requirements ? html`<h3>Requirements</h3><p class="pre">${j.requirements}</p>` : ''}</div>
      <div class="card"><h2>Location</h2><p>${j.address}</p><div class="mini-map" data-map></div>
        <p class="mt"><a href="${me ? gmapsDirections(me, j) : gmapsUrl(j.lat, j.lng)}" target="_blank" rel="noopener">🗺️ ${me ? 'Route from home on Google Maps' : 'Open in Google Maps'}</a></p></div>
    </div><div>
      <div class="card sticky">${cta}
        <dl class="kv mt">
          <dt>Type</dt><dd>${JOB_TYPE_LABEL[j.job_type] || 'Full-time'}</dd>
          ${j.activity ? html`<dt>Activity</dt><dd>${j.activity}</dd>` : ''}
          ${j.event_date ? html`<dt>Event date</dt><dd>${fmtDate(j.event_date)}</dd>` : ''}
          ${j.duration ? html`<dt>Duration</dt><dd>${j.duration}</dd>` : ''}
          <dt>Openings</dt><dd>${j.openings}</dd>
          <dt>Experience</dt><dd>${Number(j.min_experience) ? `${j.min_experience}+ yrs` : 'Freshers welcome'}</dd>
          ${j.age_group ? html`<dt>Age group</dt><dd>${j.age_group}</dd>` : ''}
          ${j.start_date ? html`<dt>Starts</dt><dd>${new Date(j.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</dd>` : ''}
          <dt>Curriculum</dt><dd>${j.curriculum || '—'}</dd>
          <dt>Bus / pick-up</dt><dd>${yesNo(j.bus_provided)}</dd>
          <dt>Food</dt><dd>${yesNo(j.food_provided)}</dd>
        </dl>
        <h3>Languages</h3><div class="chips">${langList(j.languages)}</div>
        ${(j.skills_preferred || []).length ? html`<h3>Nice-to-have skills</h3><div class="chips">${j.skills_preferred.map((x) => html`<span class="chip chip-skill">${x}</span>`)}</div>` : ''}
      </div></div></div></section>`);

  if (j.lat != null && window.L) {
    const m = baseMap($('[data-map]', el), [j.lat, j.lng], 14);
    window.L.marker([j.lat, j.lng], { icon: pinIcon('school') }).addTo(m);
    if (me?.lat != null) { window.L.marker([me.lat, me.lng], { icon: pinIcon('teacher') }).bindPopup('Your home').addTo(m); m.fitBounds([[j.lat, j.lng], [me.lat, me.lng]], { padding: [30, 30], maxZoom: 15 }); }
  }
  $('[data-apply]', el)?.addEventListener('click', () => {
    const md = modal(html`<h2>Apply to ${s.name}</h2><p class="muted">Your verified profile${me.video_path || me.video_link ? ' and teaching video' : ''} will be shared with the school.</p>
      <label>Message to the school (optional)<textarea rows="4" data-msg placeholder="Why you'd love this role, when you can start…"></textarea></label>
      <div class="row-end"><button class="btn btn-primary" data-send>Send application</button></div>`);
    md.el.querySelector('[data-send]').onclick = async (e) => {
      setBusy(e.target, true, 'Sending…');
      try { await api.applyToJob(id, md.el.querySelector('[data-msg]').value.trim()); md.close(); toast('Application sent 🎉'); detail(el, { id }); }
      catch (ex) { toast(ex.message, 'error'); setBusy(e.target, false); }
    };
  });
  $('[data-withdraw]', el)?.addEventListener('click', async () => {
    try { await api.setApplicationStatus(app.id, 'withdrawn'); toast('Done'); detail(el, { id }); } catch (ex) { toast(ex.message, 'error'); }
  });
}
