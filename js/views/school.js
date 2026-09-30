import { api } from '../api/index.js';
import { fresh, html, esc, $, $$, toast, setBusy, formData, num, rupees, salaryRange, yrs, km, ago, initials, statusBadge, langList, yesNo, confirmBox, on } from '../lib/dom.js';
import { SKILLS, APP_STATUSES, PROF_RANK, CURRICULA } from '../lib/constants.js';
import { locationField, mountLocationField, readLocation, distanceKm, baseMap, pinIcon } from '../lib/geo.js';
import { languagesField, skillsField, yesNoField, mountRepeaters, readRepeater, options } from './widgets.js';
import { state, go } from '../app.js';

function verifyBanner() {
  const s = state.profile;
  if (s.status === 'approved') return '';
  if (s.status === 'rejected') return html`<div class="note note-error">Your school wasn't approved${s.admin_note ? html`: <em>${s.admin_note}</em>` : ''}. <a href="#/school/profile">Update your details</a> and we'll review again.</div>`;
  return html`<div class="note note-warn">⏳ <strong>Your school is being verified.</strong> You can prepare job listings now — they go live and you can search teachers as soon as we approve your proof of establishment.</div>`;
}

// =====================================================================
export async function dashboard(el) {
  const [jobs, apps] = await Promise.all([api.listMyJobs(), api.schoolApplications().catch(() => [])]);
  const byJob = {};
  apps.forEach((a) => { (byJob[a.job_id] ||= []).push(a); });
  const open = jobs.filter((j) => j.status === 'open');
  const newApps = apps.filter((a) => a.status === 'applied');
  const shortlisted = apps.filter((a) => ['shortlisted', 'interview'].includes(a.status));
  el.innerHTML = esc(html`<section class="page">
    <div class="page-head"><div><p class="eyebrow">School dashboard</p><h1>${state.profile.name} ${statusBadge(state.profile.status)}</h1></div>
      <a class="btn btn-primary" href="#/school/jobs/new">+ Post a job</a></div>
    ${verifyBanner()}
    <div class="stats">
      <div class="stat"><b>${open.length}</b><span>Open listings</span></div>
      <div class="stat"><b>${newApps.length}</b><span>New applications</span></div>
      <div class="stat"><b>${shortlisted.length}</b><span>Shortlisted</span></div>
      <div class="stat"><b>${apps.filter((a) => a.status === 'hired').length}</b><span>Hired</span></div>
    </div>
    <div class="card"><h2>Your job listings</h2>
      ${jobs.length ? html`<div class="job-rows">${jobs.map((j) => {
        const a = byJob[j.id] || [];
        return html`<div class="job-row">
          <div class="grow"><a class="job-title" href="#/school/jobs/${j.id}">${j.title}</a> ${statusBadge(j.status)}
            <div class="muted small">${j.openings} opening${j.openings > 1 ? 's' : ''} · ${salaryRange(j.salary_min, j.salary_max)} · posted ${ago(j.created_at)}</div></div>
          <div class="job-row-count"><b>${a.filter((x) => x.status === 'applied').length}</b><small>new</small></div>
          <div class="job-row-count"><b>${a.length}</b><small>total</small></div>
          <div class="row"><a class="btn btn-primary btn-sm" href="#/school/jobs/${j.id}">Find teachers</a><a class="btn btn-ghost btn-sm" href="#/school/jobs/${j.id}/edit">Edit</a></div>
        </div>`;
      })}</div>` : html`<div class="empty"><div class="big-ico">📋</div><p>No listings yet. Post your first opening — we'll autofill it from your school profile.</p><a class="btn btn-primary" href="#/school/jobs/new">Post a job</a></div>`}
    </div>
    ${apps.length ? html`<div class="card"><h2>Recent activity</h2><ul class="activity">${apps.slice(0, 8).map((a) => html`<li>
      <span class="avatar avatar-sm">${initials(a.teacher?.full_name)}</span>
      <span class="grow"><a href="#/teachers/${a.teacher_id}?job=${a.job_id}">${a.teacher?.full_name || 'Teacher'}</a> · ${a.job?.title} <span class="muted small">${ago(a.updated_at)}</span></span>
      ${statusBadge(a.status)}</li>`)}</ul></div>` : ''}
  </section>`);
}

// =====================================================================
export async function jobForm(el, { id }) {
  const s = state.profile;
  let j = null;
  if (id) { j = (await api.listMyJobs()).find((x) => x.id === id); if (!j) { toast('Listing not found', 'error'); return go('/school'); } }
  const src = j || {
    title: 'Preschool Teacher', openings: 1, min_experience: 0, bus_provided: s.bus_service, food_provided: s.food_service,
    languages: s.languages || [], curriculum: s.curriculum, address: s.address, lat: s.lat, lng: s.lng,
    age_group: s.age_min != null && s.age_max != null ? `${s.age_min} – ${s.age_max} years` : '', timings: '9:00 AM – 3:00 PM', working_days: 'Monday – Friday', skills_preferred: [],
  };
  const expOpts = [[0, 'Freshers welcome'], [0.5, '6 months+'], [1, '1 year+'], [2, '2 years+'], [3, '3 years+'], [5, '5 years+'], [8, '8 years+']];
  el.innerHTML = esc(html`<section class="page narrow">
    <a class="back" href="#/school">← Dashboard</a>
    <h1>${j ? 'Edit job listing' : 'Post a job'}</h1>
    ${j ? '' : html`<div class="note note-info">✨ We've filled in your school's address, curriculum, languages, bus and food details. Change anything that's different for this role.</div>`}
    ${verifyBanner()}
    <form id="jf" class="form" novalidate>
      <div class="card"><h2>The role</h2>
        <label>Job title <span class="req">*</span><input name="title" required value="${src.title || ''}" placeholder="e.g. Nursery Class Teacher"></label>
        <div class="grid3">
          <label>Number of openings <span class="req">*</span><input name="openings" type="number" min="1" max="50" required value="${src.openings || 1}"></label>
          <label>Age group<input name="age_group" value="${src.age_group || ''}" placeholder="e.g. 3 – 4 years"></label>
          <label>Start date<input name="start_date" type="date" value="${src.start_date || ''}"></label>
        </div>
        <label>Job description <span class="req">*</span><textarea name="description" rows="4" required placeholder="Class size, responsibilities, a typical day…">${src.description || ''}</textarea></label>
        <label>Requirements<textarea name="requirements" rows="3" placeholder="Qualifications, qualities you're looking for…">${src.requirements || ''}</textarea></label>
        <label>Minimum experience<select name="min_experience">${options(expOpts, src.min_experience ?? 0)}</select></label>
      </div>
      <div class="card"><h2>Pay & timings</h2>
        <div class="grid2">
          <label>Salary from (₹ / month)<input name="salary_min" type="number" min="0" step="500" value="${src.salary_min ?? ''}" placeholder="e.g. 18000"></label>
          <label>Salary up to (₹ / month) <span class="req">*</span><input name="salary_max" type="number" min="0" step="500" required value="${src.salary_max ?? ''}" placeholder="e.g. 25000"></label>
          <label>Timings <span class="req">*</span><input name="timings" required value="${src.timings || ''}" placeholder="e.g. 8:30 AM – 3:30 PM"></label>
          <label>Working days<input name="working_days" value="${src.working_days || ''}" placeholder="e.g. Monday – Friday"></label>
        </div>
        ${yesNoField('bus_provided', 'School bus / pick-up for the teacher', src.bus_provided)}
        ${yesNoField('food_provided', 'Food provided for the teacher', src.food_provided)}
      </div>
      <div class="card"><h2>Teaching requirements</h2>
        <label>Curriculum<select name="curriculum">${options([...new Set([...CURRICULA, ...(src.curriculum ? [src.curriculum] : [])])], src.curriculum, { placeholder: 'Choose…' })}</select></label>
        ${languagesField(src.languages || [], { label: 'Language requirements', hint: 'Languages the teacher must speak and the minimum level.' })}
        ${skillsField(src.skills_preferred || [], { name: 'skills_preferred', label: 'Preferred special skills', otherName: null })}
      </div>
      <div class="card"><h2>Where</h2>
        ${locationField({ label: 'Job location', address: src.address, lat: src.lat, lng: src.lng, hint: 'Usually your school — change it if this role is at a different branch.' })}
      </div>
      <div class="form-actions">
        ${j ? html`<button type="button" class="btn btn-danger-ghost" data-del>Delete</button>
          <button type="button" class="btn btn-ghost" data-toggle>${j.status === 'open' ? 'Close listing' : 'Reopen listing'}</button>` : ''}
        <button class="btn btn-primary btn-lg" type="submit">${j ? 'Save changes' : 'Publish listing'}</button></div>
    </form></section>`);
  const form = $('#jf');
  mountRepeaters(form); mountLocationField(form);
  const collect = () => {
    const d = formData(form), loc = readLocation(form);
    const err = (m, f) => { toast(m, 'error'); if (f) form.querySelector(`[name=${f}]`)?.focus(); return null; };
    if (!d.title) return err('Please add a job title', 'title');
    if (!(Number(d.openings) > 0)) return err('Number of openings must be at least 1', 'openings');
    if (!d.description) return err('Please describe the job', 'description');
    if (!d.salary_max) return err('Please enter the salary offered', 'salary_max');
    if (d.salary_min && Number(d.salary_min) > Number(d.salary_max)) return err('"Salary from" is more than "up to"', 'salary_min');
    if (!d.timings) return err('Please add timings', 'timings');
    if (!loc || !d.address) return err('Please set the job location');
    return {
      id: j?.id, title: d.title, openings: Number(d.openings), age_group: d.age_group || null, start_date: d.start_date || null,
      description: d.description, requirements: d.requirements || null, min_experience: Number(d.min_experience || 0),
      salary_min: num(d.salary_min), salary_max: num(d.salary_max), timings: d.timings, working_days: d.working_days || null,
      bus_provided: d.bus_provided === 'yes', food_provided: d.food_provided === 'yes', curriculum: d.curriculum || null,
      languages: readRepeater(form, 'languages'), skills_preferred: d.skills_preferred || [], address: d.address, lat: loc.lat, lng: loc.lng,
      status: j?.status || 'open',
    };
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const job = collect(); if (!job) return;
    const btn = form.querySelector('[type=submit]'); setBusy(btn, true, 'Saving…');
    try {
      const saved = await api.saveJob(job);
      toast(j ? 'Listing updated' : 'Listing published 🎉');
      go(`/school/jobs/${saved.id}`);
    } catch (ex) { toast(ex.message, 'error'); } finally { setBusy(btn, false); }
  };
  form.querySelector('[data-toggle]')?.addEventListener('click', async () => {
    try { await api.saveJob({ ...j, status: j.status === 'open' ? 'closed' : 'open' }); toast(j.status === 'open' ? 'Listing closed' : 'Listing reopened'); go(`/school/jobs/${j.id}`); }
    catch (ex) { toast(ex.message, 'error'); }
  });
  form.querySelector('[data-del]')?.addEventListener('click', async () => {
    if (!(await confirmBox('Delete this listing and all its applications? This can\'t be undone.', 'Delete'))) return;
    try { await api.deleteJob(j.id); toast('Listing deleted'); go('/school'); } catch (ex) { toast(ex.message, 'error'); }
  });
}

// =====================================================================
// Candidates for a listing: filters + map + applicants
// =====================================================================
const speaks = (t, req) => (t.languages || []).some((l) => l.language?.toLowerCase() === req.language?.toLowerCase() && (PROF_RANK[l.proficiency] || 0) >= (PROF_RANK[req.proficiency] || 0));

export async function jobManage(el, { id }, q) {
  el = fresh(el);
  const job = (await api.listMyJobs()).find((x) => x.id === id);
  if (!job) { toast('Listing not found', 'error'); return go('/school'); }
  const approved = state.profile.status === 'approved';
  const [teachers, allApps] = await Promise.all([approved ? api.listTeachers() : [], api.schoolApplications().catch(() => [])]);
  let apps = allApps.filter((a) => a.job_id === id);
  const appByTeacher = () => Object.fromEntries(apps.map((a) => [a.teacher_id, a]));
  const pool = new Map(teachers.map((t) => [t.id, t]));
  apps.forEach((a) => { if (a.teacher && !pool.has(a.teacher_id)) pool.set(a.teacher_id, a.teacher); });
  const all = [...pool.values()].map((t) => ({ ...t, _dist: distanceKm(job, t) }));

  const f = { dist: Number(q.dist || 15), exp: job.min_experience || 0, maxSal: job.salary_max || '', skills: [], langs: [], video: false, sort: 'distance', tab: q.tab || 'find' };
  const langReqs = job.languages || [];

  el.innerHTML = esc(html`<section class="page wide">
    <a class="back" href="#/school">← Dashboard</a>
    <div class="page-head"><div><p class="eyebrow">Job listing ${statusBadge(job.status)}</p><h1>${job.title}</h1>
      <p class="muted">${job.openings} opening${job.openings > 1 ? 's' : ''} · ${salaryRange(job.salary_min, job.salary_max)}/month · ${job.timings || ''} · Bus ${job.bus_provided ? '✓' : '✗'} · Food ${job.food_provided ? '✓' : '✗'}</p></div>
      <div class="row"><a class="btn btn-ghost" href="#/jobs/${job.id}">Public view</a><a class="btn btn-ghost" href="#/school/jobs/${job.id}/edit">Edit</a></div></div>
    ${verifyBanner()}
    <div class="tabs" role="tablist">
      <button role="tab" data-tab="find">🔎 Find teachers</button>
      <button role="tab" data-tab="apps">📥 Applicants & invites <span class="count" data-appcount>${apps.length}</span></button>
    </div>
    <div data-pane="find">
      ${approved ? html`<div class="finder">
        <aside class="filters card" aria-label="Filters">
          <h2>Filters</h2>
          <label>Distance from ${job.address ? 'job' : 'school'}: <strong data-distlabel></strong>
            <input type="range" min="1" max="51" step="1" name="dist" value="${f.dist}"></label>
          <label>Minimum experience<select name="exp">${options([[0, 'Any'], [1, '1+ yr'], [2, '2+ yrs'], [3, '3+ yrs'], [5, '5+ yrs'], [8, '8+ yrs']], f.exp >= 1 ? Math.floor(f.exp) : 0)}</select></label>
          <label>Expected salary up to (₹)<input type="number" name="maxSal" step="1000" min="0" value="${f.maxSal}" placeholder="Any"></label>
          ${langReqs.length ? html`<fieldset><legend>Must speak</legend>${langReqs.map((l, i) => html`<label class="check"><input type="checkbox" name="langs" value="${i}"> ${l.language} <small class="muted">(${l.proficiency}+)</small></label>`)}</fieldset>` : ''}
          <fieldset><legend>Skills</legend><div class="chip-picks small">${[...new Set([...(job.skills_preferred || []), ...SKILLS])].map((s) => html`<label class="chip-pick"><input type="checkbox" name="skills" value="${s}"><span>${s}</span></label>`)}</div></fieldset>
          <label class="check"><input type="checkbox" name="video"> Has a teaching video</label>
          <label>Sort by<select name="sort">${options([['distance', 'Nearest first'], ['experience', 'Most experienced'], ['salary', 'Lowest expected salary'], ['match', 'Best match']], f.sort)}</select></label>
          <button type="button" class="btn btn-ghost btn-sm btn-block" data-clear>Reset filters</button>
        </aside>
        <div class="results">
          <div class="results-head"><p data-count></p><button type="button" class="btn btn-ghost btn-sm" data-maptoggle>🗺️ Map</button></div>
          <div class="result-map" data-map hidden></div>
          <div data-list class="cards"></div>
        </div></div>` : html`<div class="empty card"><div class="big-ico">🔒</div><p>Teacher search unlocks once your school is verified.</p></div>`}
    </div>
    <div data-pane="apps" hidden><div data-apps></div></div>
  </section>`);

  // ---- tabs ----
  const setTab = (t) => { f.tab = t; $$('[data-tab]', el).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === t)); $$('[data-pane]', el).forEach((p) => { p.hidden = p.dataset.pane !== t; }); if (t === 'find') setTimeout(() => map?.invalidateSize(), 50); };
  on(el, 'click', '[data-tab]', (e, b) => setTab(b.dataset.tab));

  // ---- applicants ----
  const renderApps = () => {
    const box = $('[data-apps]', el);
    $('[data-appcount]', el).textContent = apps.length;
    if (!apps.length) { box.innerHTML = esc(html`<div class="empty card"><div class="big-ico">📭</div><p>No applications or invitations yet. Use <strong>Find teachers</strong> to invite people near you.</p></div>`); return; }
    box.innerHTML = esc(html`<div class="cards">${apps.map((a) => {
      const t = a.teacher || pool.get(a.teacher_id) || {};
      const d = distanceKm(job, t);
      return html`<article class="tcard">
        <div class="tcard-top"><span class="avatar">${initials(t.full_name)}</span>
          <div class="grow"><a class="tname" href="#/teachers/${a.teacher_id}?job=${id}">${t.full_name || 'Teacher'}</a>
          <div class="muted small">${a.initiated_by === 'school' ? 'You invited' : 'Applied'} ${ago(a.created_at)}${d != null ? ` · ${km(d)} away` : ''} · ${yrs(t.experience_years)} · expects ${rupees(t.expected_salary)}</div></div>
          ${statusBadge(a.status)}</div>
        ${a.message ? html`<p class="quote">“${a.message}”</p>` : ''}
        <div class="row"><label class="inline">Status <select data-status="${a.id}">${options(APP_STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)]).concat(a.status === 'withdrawn' ? [['withdrawn', 'Withdrawn']] : []), a.status)}</select></label>
          <a class="btn btn-ghost btn-sm" href="#/teachers/${a.teacher_id}?job=${id}">View profile</a>
          ${t.phone ? html`<a class="btn btn-ghost btn-sm" href="tel:+91${t.phone}">📞 Call</a><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/91${t.whatsapp || t.phone}">💬 WhatsApp</a>` : ''}</div>
      </article>`;
    })}</div>`);
  };
  on(el, 'change', '[data-status]', async (e, s) => {
    try { const upd = await api.setApplicationStatus(s.dataset.status, s.value); apps = apps.map((a) => (a.id === upd.id ? { ...a, ...upd } : a)); toast('Status updated'); renderApps(); renderList(); }
    catch (ex) { toast(ex.message, 'error'); }
  });
  renderApps();

  if (!approved) { setTab(f.tab); return; }

  // ---- finder ----
  const filtersEl = $('.filters', el);
  let map = null, layer = null, circle = null;
  const read = () => {
    const d = formData(wrapForm(filtersEl));
    const checked = (n) => $$(`input[name=${n}]:checked`, filtersEl).map((c) => c.value);
    f.dist = Number(d.dist); f.exp = Number(d.exp); f.maxSal = d.maxSal; f.sort = d.sort; f.video = !!d.video;
    f.skills = checked('skills'); f.langs = checked('langs').map((i) => langReqs[Number(i)]);
    $('[data-distlabel]', el).textContent = f.dist > 50 ? 'Any' : `${f.dist} km`;
  };
  const score = (t) => {
    let s = 0;
    if (t._dist != null) s += Math.max(0, 30 - t._dist * 2);
    s += Math.min(Number(t.experience_years) || 0, 10) * 2;
    if (job.salary_max && t.expected_salary) s += t.expected_salary <= job.salary_max ? 15 : -10;
    s += (job.skills_preferred || []).filter((x) => (t.skills || []).includes(x)).length * 6;
    s += langReqs.filter((l) => speaks(t, l)).length * 5;
    if (t.video_path || t.video_link) s += 6;
    return s;
  };
  const filtered = () => all.filter((t) => {
    if (f.dist <= 50 && (t._dist == null || t._dist > f.dist)) return false;
    if ((Number(t.experience_years) || 0) < f.exp) return false;
    if (f.maxSal && t.expected_salary && t.expected_salary > Number(f.maxSal)) return false;
    if (f.skills.length && !f.skills.every((s) => (t.skills || []).includes(s))) return false;
    if (f.langs.length && !f.langs.every((l) => speaks(t, l))) return false;
    if (f.video && !(t.video_path || t.video_link)) return false;
    return true;
  }).sort((a, b) => ({
    distance: () => (a._dist ?? 1e9) - (b._dist ?? 1e9),
    experience: () => (b.experience_years || 0) - (a.experience_years || 0),
    salary: () => (a.expected_salary || 1e9) - (b.expected_salary || 1e9),
    match: () => score(b) - score(a),
  })[f.sort]());

  const card = (t) => {
    const a = appByTeacher()[t.id];
    const within = job.salary_max && t.expected_salary ? t.expected_salary <= job.salary_max : null;
    const pref = new Set(job.skills_preferred || []);
    return html`<article class="tcard">
      <div class="tcard-top"><span class="avatar">${initials(t.full_name)}</span>
        <div class="grow"><a class="tname" href="#/teachers/${t.id}?job=${id}">${t.full_name}</a>
          <div class="muted small">${t.qualification || 'Preschool teacher'}</div></div>
        ${t._dist != null ? html`<span class="dist">📍 ${km(t._dist)}</span>` : ''}</div>
      <div class="tfacts">
        <span>🎓 ${yrs(t.experience_years)}</span>
        <span class="${within === true ? 'good' : within === false ? 'warn' : ''}">💰 ${rupees(t.expected_salary)}${within === false ? ' (above budget)' : ''}</span>
        ${t.video_path || t.video_link ? html`<span class="good">🎬 Video</span>` : ''}
      </div>
      <div class="chips">${(t.skills || []).slice(0, 6).map((s) => html`<span class="chip ${pref.has(s) ? 'chip-match' : 'chip-skill'}">${s}</span>`)}</div>
      <div class="chips">${(t.languages || []).map((l) => html`<span class="chip ${langReqs.some((r) => r.language?.toLowerCase() === l.language?.toLowerCase()) ? 'chip-match' : ''}">${l.language} <small>· ${l.proficiency}</small></span>`)}</div>
      <div class="row">
        <a class="btn btn-ghost btn-sm" href="#/teachers/${t.id}?job=${id}">View profile</a>
        ${a ? statusBadge(a.status) : html`<button class="btn btn-primary btn-sm" data-inv="${t.id}" data-kind="invited">Invite to apply</button>
          <button class="btn btn-ghost btn-sm" data-inv="${t.id}" data-kind="shortlisted" title="Shortlist">⭐</button>`}
      </div></article>`;
  };

  const renderList = () => {
    const list = filtered();
    $('[data-count]', el).innerHTML = esc(html`<strong>${list.length}</strong> teacher${list.length === 1 ? '' : 's'} match${list.length === 1 ? 'es' : ''}${f.dist <= 50 ? html` within ${f.dist} km` : ''}`);
    $('[data-list]', el).innerHTML = list.length ? esc(html`${list.map(card)}`)
      : esc(html`<div class="empty"><div class="big-ico">🔍</div><p>No teachers match these filters. Try a larger distance or fewer skills.</p></div>`);
    if (map) drawMap(list);
  };
  const drawMap = (list) => {
    layer.clearLayers();
    if (circle) { circle.remove(); circle = null; }
    if (f.dist <= 50) circle = window.L.circle([job.lat, job.lng], { radius: f.dist * 1000, color: '#14A3A1', weight: 1, fillOpacity: 0.06 }).addTo(map);
    list.forEach((t) => { if (t.lat != null) window.L.marker([t.lat, t.lng], { icon: pinIcon('teacher') }).bindPopup(`<a href="#/teachers/${t.id}?job=${id}">${esc(t.full_name)}</a><br>${esc(km(t._dist))} · ${esc(yrs(t.experience_years))}`).addTo(layer); });
    if (circle) map.fitBounds(circle.getBounds(), { padding: [10, 10] });
  };
  $('[data-maptoggle]', el).onclick = () => {
    const m = $('[data-map]', el); m.hidden = !m.hidden;
    if (!m.hidden && !map && job.lat != null && window.L) {
      map = baseMap(m, [job.lat, job.lng], 12);
      window.L.marker([job.lat, job.lng], { icon: pinIcon('school') }).bindPopup(esc(state.profile.name)).addTo(map);
      layer = window.L.layerGroup().addTo(map);
      drawMap(filtered());
    } else if (map) setTimeout(() => map.invalidateSize(), 50);
  };
  filtersEl.addEventListener('input', () => { read(); renderList(); });
  $('[data-clear]', el).onclick = () => {
    filtersEl.querySelectorAll('input[type=checkbox]').forEach((c) => { c.checked = false; });
    filtersEl.querySelector('[name=dist]').value = 51; filtersEl.querySelector('[name=exp]').value = 0; filtersEl.querySelector('[name=maxSal]').value = '';
    read(); renderList();
  };
  on(el, 'click', '[data-inv]', async (e, b) => {
    setBusy(b, true);
    try {
      const a = await api.inviteTeacher(id, b.dataset.inv, b.dataset.kind);
      apps = [...apps.filter((x) => x.id !== a.id), { ...a, teacher: pool.get(a.teacher_id) }];
      toast(b.dataset.kind === 'invited' ? 'Invitation sent' : 'Added to shortlist');
      renderList(); renderApps();
    } catch (ex) { toast(ex.message, 'error'); setBusy(b, false); }
  });
  read(); renderList(); setTab(f.tab);
}

// formData() expects a <form>; the filter panel is an <aside>, so give it a form-like shim.
function wrapForm(node) { return { elements: node.querySelectorAll('input,select,textarea'), querySelectorAll: (s) => node.querySelectorAll(s) }; }
