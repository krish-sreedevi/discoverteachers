import { api } from '../api/index.js';
import { fresh, withLoader, showLoader, html, esc, $, toast, salaryRange, payRange, ago, statusBadge, on } from '../lib/dom.js';
import { distanceKm } from '../lib/geo.js';
import { jobCard } from './jobs.js';
import { jobWorkType } from '../lib/constants.js';
import { state } from '../app.js';

export async function dashboard(el) {
  el = fresh(el);
  if (!el.querySelector('.dt-loader')) showLoader(el, 'Finding jobs for you');
  const t = state.profile;
  const [apps, jobs] = await withLoader(Promise.all([api.myApplications(), api.listOpenJobs()]), 900);
  const invites = apps.filter((a) => a.status === 'invited' && a.job);
  const active = apps.filter((a) => a.status !== 'invited' && a.job);
  const appBy = Object.fromEntries(apps.map((a) => [a.job_id, a]));
  const near = jobs.map((j) => ({ ...j, _dist: distanceKm(t, j) })).filter((j) => !appBy[j.id] && (t.work_types && t.work_types.length ? t.work_types : ['class']).includes(jobWorkType(j.job_type)))
    .sort((a, b) => (a._dist ?? 1e9) - (b._dist ?? 1e9)).slice(0, 4);

  const checks = [
    ['Basic details & Aadhaar', true],
    ['Home location', t.lat != null],
    ['Skills', (t.skills || []).length > 0 || !!t.skills_other],
    ['Languages', (t.languages || []).length > 0],
    ['Experience details', (t.experience || []).length > 0 || Number(t.experience_years) === 0],
    ['Teaching video', !!(t.video_path || t.video_link)],
  ];
  const pct = Math.round((checks.filter((c) => c[1]).length / checks.length) * 100);
  const statusMsg = {
    pending: html`<div class="note note-warn">⏳ <strong>Your profile is being verified.</strong> Once approved, schools near you can find you and you can apply to jobs.</div>`,
    rejected: html`<div class="note note-error">Your profile wasn't approved${t.admin_note ? html`: <em>${t.admin_note}</em>` : ''}. <a href="#/teacher/profile">Update it</a> and we'll review again.</div>`,
    approved: '',
  }[t.status];

  el.innerHTML = esc(html`<section class="page">
    <div class="page-head"><div><p class="eyebrow">Teacher dashboard</p><h1>Hi, ${t.full_name.split(' ')[0]} 👋 ${statusBadge(t.status)}</h1></div>
      <a class="btn btn-primary" href="#/jobs">Find jobs</a></div>
    ${statusMsg}
    <div class="grid-2-1">
      <div>
        ${invites.length ? html`<div class="card highlight"><h2>💌 Schools want you to apply</h2><ul class="activity">${invites.map((a) => html`<li>
          <span class="grow"><a href="#/jobs/${a.job_id}"><strong>${a.job.title}</strong></a><br><span class="muted small">${a.job.school?.name} · ${payRange(a.job.salary_min, a.job.salary_max, a.job.pay_unit)} · ${ago(a.created_at)}</span></span>
          <button class="btn btn-primary btn-sm" data-accept="${a.job_id}">Apply</button><button class="btn btn-ghost btn-sm" data-decline="${a.id}">No thanks</button></li>`)}</ul></div>` : ''}
        <div class="card"><h2>My applications</h2>
          ${active.length ? html`<ul class="activity">${active.map((a) => html`<li><span class="grow"><a href="#/jobs/${a.job_id}">${a.job.title}</a><br><span class="muted small">${a.job.school?.name} · updated ${ago(a.updated_at)}</span></span>${statusBadge(a.status)}</li>`)}</ul>`
            : html`<p class="muted">You haven't applied anywhere yet.</p>`}</div>
        <div class="card"><h2>Jobs near you</h2>${near.length ? html`<div class="cards">${near.map((j) => jobCard(j, { dist: j._dist }))}</div>
          <p class="mt"><a href="#/jobs">See all jobs →</a></p>` : html`<p class="muted">No open jobs right now — we'll show them here as schools post.</p>`}</div>
      </div>
      <div>
        <div class="card"><h2>Profile strength</h2>
          <div class="meter" role="meter" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
          <p class="small muted">${pct}% complete</p>
          <ul class="checklist">${checks.map(([l, ok]) => html`<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${l}${!ok && l === 'Teaching video' ? html` <span class="tag">Recommended</span>` : ''}</li>`)}</ul>
          <a class="btn btn-ghost btn-block" href="#/teacher/profile">Edit profile</a>
          <a class="btn btn-ghost btn-block mt" href="#/teachers/${t.id}">Preview as a school sees it</a>
        </div>
      </div>
    </div></section>`);

  on(el, 'click', '[data-accept]', (e, b) => { location.hash = `/jobs/${b.dataset.accept}`; });
  on(el, 'click', '[data-decline]', async (e, b) => {
    try { await api.setApplicationStatus(b.dataset.decline, 'withdrawn'); toast('Invitation declined'); dashboard(el); } catch (ex) { toast(ex.message, 'error'); }
  });
}
