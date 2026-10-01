import { api } from '../api/index.js?v=20261001-4';
import { fresh, loaderHTML, html, esc, $, $$, toast, setBusy, modal, rupees, salaryRange, payRange, yrs, ago, statusBadge, langList, yesNo, on } from '../lib/dom.js?v=20261001-4';
import { formatAadhaar, isValidAadhaar } from '../lib/validate.js?v=20261001-4';
import { gmapsUrl } from '../lib/geo.js?v=20261001-4';
import { videoBlock } from './profile.js?v=20261001-4';

const st = { tab: 'school', filter: 'pending', q: '' };

export async function dashboard(el) {
  el = fresh(el);
  const stats = await api.adminStats();
  el.innerHTML = esc(html`<section class="page wide">
    <div class="page-head"><div><p class="eyebrow">Admin</p><h1>Verification & oversight</h1></div></div>
    <div class="stats">
      <div class="stat ${stats.pendingS ? 'stat-warn' : ''}"><b>${stats.pendingS}</b><span>Schools to verify</span></div>
      <div class="stat ${stats.pendingT ? 'stat-warn' : ''}"><b>${stats.pendingT}</b><span>Teachers to verify</span></div>
      <div class="stat"><b>${stats.schools}</b><span>Schools</span></div>
      <div class="stat"><b>${stats.teachers}</b><span>Teachers</span></div>
      <div class="stat"><b>${stats.jobs}</b><span>Open jobs</span></div>
      <div class="stat"><b>${stats.apps}</b><span>Applications</span></div>
    </div>
    <div class="tabs" role="tablist">
      <button role="tab" data-tab="school">🏫 Schools</button><button role="tab" data-tab="teacher">🍎 Teachers</button><button role="tab" data-tab="jobs">📋 Jobs</button>
    </div>
    <div class="card">
      <div class="row toolbar">
        <div class="seg-group" data-filters>${['pending', 'approved', 'rejected', 'all'].map((f) => html`<button data-f="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`)}</div>
        <input type="search" placeholder="Search name, email, phone…" data-q value="${st.q}">
      </div>
      <div data-table></div>
    </div></section>`);

  let rows = [];
  const load = async () => {
    $('[data-table]', el).innerHTML = loaderHTML(st.tab === 'jobs' ? 'Loading jobs' : st.tab === 'school' ? 'Loading schools' : 'Loading teachers', { compact: true });
    rows = st.tab === 'jobs' ? await api.adminJobs() : await api.adminList(st.tab);
    render();
  };
  const render = () => {
    $$('[data-tab]', el).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === st.tab));
    $$('[data-f]', el).forEach((b) => b.classList.toggle('active', b.dataset.f === st.filter));
    $('[data-filters]', el).hidden = st.tab === 'jobs';
    const q = st.q.toLowerCase();
    const list = rows.filter((r) => (st.tab === 'jobs' || st.filter === 'all' || r.status === st.filter)
      && (!q || JSON.stringify([r.name, r.full_name, r.email, r.phone, r.title, r.school?.name, r.address]).toLowerCase().includes(q)));
    const box = $('[data-table]', el);
    if (!list.length) { box.innerHTML = esc(html`<div class="empty"><div class="big-ico">✅</div><p>Nothing here.</p></div>`); return; }
    if (st.tab === 'jobs') {
      box.innerHTML = esc(html`<div class="table-wrap"><table><thead><tr><th>Job</th><th>School</th><th>Salary</th><th>Openings</th><th>Status</th><th>Posted</th></tr></thead><tbody>
        ${list.map((j) => html`<tr><td><a href="#/jobs/${j.id}">${j.title}</a></td><td>${j.school?.name}</td><td>${payRange(j.salary_min, j.salary_max, j.pay_unit)}</td><td>${j.openings}</td><td>${statusBadge(j.status)}</td><td>${ago(j.created_at)}</td></tr>`)}
      </tbody></table></div>`);
      return;
    }
    box.innerHTML = esc(html`<div class="table-wrap"><table><thead><tr>${st.tab === 'school'
      ? html`<th>School</th><th>Contact</th><th>Est.</th><th>Curriculum</th><th>Proof</th><th>Status</th><th>Submitted</th><th></th>`
      : html`<th>Teacher</th><th>Contact</th><th>Experience</th><th>Expected</th><th>Video</th><th>Status</th><th>Submitted</th><th></th>`}</tr></thead><tbody>
      ${list.map((r) => st.tab === 'school'
        ? html`<tr><td><strong>${r.name}</strong><br><small class="muted">${r.address?.slice(0, 60)}</small></td><td>${r.phone}<br><small>${r.email || ''}</small></td><td>${r.year_established || '—'}</td><td>${r.curriculum || '—'}</td>
            <td>${r.proof_path ? '📎 Yes' : html`<span class="warn">Missing</span>`}</td><td>${statusBadge(r.status)}</td><td>${ago(r.created_at)}</td><td><button class="btn btn-primary btn-sm" data-open="${r.id}">Review</button></td></tr>`
        : html`<tr><td><strong>${r.full_name}</strong><br><small class="muted">${r.qualification || ''}</small></td><td>${r.phone}<br><small>${r.email || ''}</small></td><td>${yrs(r.experience_years)}</td><td>${rupees(r.expected_salary)}</td>
            <td>${r.video_path || r.video_link ? '🎬' : '—'}</td><td>${statusBadge(r.status)}</td><td>${ago(r.created_at)}</td><td><button class="btn btn-primary btn-sm" data-open="${r.id}">Review</button></td></tr>`)}
    </tbody></table></div>`);
  };

  on(el, 'click', '[data-tab]', (e, b) => { st.tab = b.dataset.tab; load(); });
  on(el, 'click', '[data-f]', (e, b) => { st.filter = b.dataset.f; render(); });
  $('[data-q]', el).addEventListener('input', (e) => { st.q = e.target.value; render(); });
  on(el, 'click', '[data-open]', async (e, b) => {
    const r = rows.find((x) => x.id === b.dataset.open);
    const done = await review(st.tab, r);
    if (done) dashboard(el);
  });
  load();
}

async function review(kind, r) {
  let body;
  if (kind === 'school') {
    const proofUrl = r.proof_path ? await api.fileUrl('school-proofs', r.proof_path) : null;
    const isImg = /\.(png|jpe?g|webp)$/i.test(r.proof_path || '');
    body = html`<h2>${r.name} ${statusBadge(r.status)}</h2>
      <div class="grid2"><dl class="kv">
        <dt>Contact</dt><dd>${r.contact_name || '—'} · ${r.phone}</dd><dt>Email</dt><dd>${r.email || '—'}</dd>
        <dt>Website</dt><dd>${r.website ? html`<a href="${r.website}" target="_blank" rel="noopener">${r.website}</a>` : '—'}</dd>
        <dt>Established</dt><dd>${r.year_established || '—'}</dd><dt>Avg. fees</dt><dd>${rupees(r.avg_fees)}/yr</dd>
        <dt>Curriculum</dt><dd>${r.curriculum || '—'}</dd><dt>Students</dt><dd>${r.num_students ?? '—'} (ages ${r.age_min ?? '?'}–${r.age_max ?? '?'})</dd>
        <dt>Bus</dt><dd>${yesNo(r.bus_service)}</dd><dt>Food</dt><dd>${yesNo(r.food_service)}</dd>
      </dl><div><p><strong>Address</strong><br>${r.address}</p>${r.lat != null ? html`<p><a href="${gmapsUrl(r.lat, r.lng)}" target="_blank" rel="noopener">🗺️ Check on Google Maps</a></p>` : ''}
        <div class="chips">${langList(r.languages)}</div></div></div>
      <h3>Proof of establishment</h3>
      ${proofUrl ? (isImg ? html`<a href="${proofUrl}" target="_blank" rel="noopener"><img src="${proofUrl}" class="proof-img" alt="Proof document"></a>` : html`<a class="btn btn-ghost" href="${proofUrl}" target="_blank" rel="noopener">📄 Open proof document</a>`) : html`<p class="warn">No proof uploaded.</p>`}`;
  } else {
    const priv = await api.getTeacherPrivate(r.id);
    const valid = priv && isValidAadhaar(priv.aadhaar);
    body = html`<h2>${r.full_name} ${statusBadge(r.status)}</h2>
      <div class="grid2"><dl class="kv">
        <dt>Aadhaar</dt><dd><strong>${priv ? formatAadhaar(priv.aadhaar) : '—'}</strong> ${priv ? (valid ? html`<span class="good">✓ checksum OK</span>` : html`<span class="warn">✗ invalid checksum</span>`) : ''}</dd>
        <dt>Phone</dt><dd>${r.phone}${r.whatsapp ? ` · WA ${r.whatsapp}` : ''}</dd><dt>Email</dt><dd>${r.email || '—'}</dd>
        <dt>Qualification</dt><dd>${r.qualification || '—'}</dd><dt>Experience</dt><dd>${yrs(r.experience_years)}</dd>
        <dt>Expected</dt><dd>${rupees(r.expected_salary)}/mo</dd>
      </dl><div><p><strong>Address</strong><br>${r.address}</p>${r.lat != null ? html`<p><a href="${gmapsUrl(r.lat, r.lng)}" target="_blank" rel="noopener">🗺️ Google Maps</a></p>` : ''}
        <div class="chips">${(r.skills || []).map((s) => html`<span class="chip chip-skill">${s}</span>`)}</div><div class="chips mt">${langList(r.languages)}</div></div></div>
      ${(r.experience || []).length ? html`<h3>Experience</h3><ul class="timeline">${r.experience.map((x) => html`<li><strong>${x.role}</strong> at ${x.school} <span class="muted">${x.from}–${x.to}</span></li>`)}</ul>` : ''}
      <h3>Teaching video</h3>${await videoBlock(r)}`;
  }
  return new Promise((resolve) => {
    let changed = false;
    const m = modal(html`${body}<hr><label>Note to the ${kind} (shown if rejected)<textarea rows="2" data-note>${r.admin_note || ''}</textarea></label>
      <div class="row-end"><button class="btn btn-danger-ghost" data-set="rejected">Reject</button>${r.status !== 'pending' ? html`<button class="btn btn-ghost" data-set="pending">Mark pending</button>` : ''}<button class="btn btn-primary" data-set="approved">✓ Approve</button></div>`,
    { wide: true, onClose: () => resolve(changed) });
    m.el.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', async () => {
      const status = b.dataset.set, note = m.el.querySelector('[data-note]').value.trim() || null;
      if (status === 'rejected' && !note) { toast('Please add a note explaining why', 'error'); m.el.querySelector('[data-note]').focus(); return; }
      setBusy(b, true);
      try { await api.adminSetStatus(kind, r.id, status, note); changed = true; toast(`${kind === 'school' ? r.name : r.full_name} → ${status}`); m.close(); }
      catch (ex) { toast(ex.message, 'error'); setBusy(b, false); }
    }));
  });
}
