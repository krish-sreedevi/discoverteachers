import { api } from '../api/index.js?v=20261001-3';
import { withLoader, html, esc, $, $$, toast, setBusy, formData, num, rupees, yrs, km, initials, statusBadge, langList, yesNo, modal } from '../lib/dom.js?v=20261001-3';
import { CURRICULA, AGES, QUALIFICATIONS, ACTIVITIES, WORK_TYPES, WORK_LABEL } from '../lib/constants.js?v=20261001-3';
import { isValidAadhaar, cleanAadhaar, formatAadhaar, isValidPhone, cleanPhone, isEmail, normalizeUrl } from '../lib/validate.js?v=20261001-3';
import { locationField, mountLocationField, readLocation, distanceKm, gmapsUrl, gmapsDirections } from '../lib/geo.js?v=20261001-3';
import { languagesField, experienceField, skillsField, yesNoField, mountRepeaters, readRepeater, options } from './widgets.js?v=20261001-3';
import { state, refreshProfile, go } from '../app.js?v=20261001-3';

const MB = 1024 * 1024;

function statusNote(p, kind) {
  if (!p) return html`<div class="note note-info">${kind === 'school'
    ? 'Tell us about your school. Our team verifies every school against its proof of establishment — usually within 1–2 working days.'
    : 'Build your profile once and schools near you can find you. We verify every teacher before their profile is shown to schools.'}</div>`;
  if (p.status === 'pending') return html`<div class="note note-warn">⏳ Your ${kind} profile is <strong>awaiting verification</strong>. You can keep editing it meanwhile.</div>`;
  if (p.status === 'rejected') return html`<div class="note note-error">Your profile was not approved${p.admin_note ? html`: <em>${p.admin_note}</em>` : ''}. Please update the details and save — our team will take another look.</div>`;
  return html`<div class="note note-ok">✓ Your ${kind} profile is verified.</div>`;
}

function curriculumField(value) {
  const known = !value || CURRICULA.includes(value);
  return html`<label>Curriculum used <span class="req">*</span>
    <select name="curriculum_pick" required data-curr>${options([...CURRICULA, ['__other', 'Other (type it in)']], known ? value : '__other', { placeholder: 'Choose…' })}</select></label>
    <label data-curr-other ${known ? 'hidden' : ''}>Name of your curriculum<input name="curriculum_other" value="${known ? '' : value}" placeholder="e.g. Kreedo, Jolly Phonics-based, own blend"></label>`;
}
function wireCurriculum(root) {
  const sel = root.querySelector('[data-curr]'); if (!sel) return;
  const other = root.querySelector('[data-curr-other]');
  sel.addEventListener('change', () => { other.hidden = sel.value !== '__other'; if (!other.hidden) other.querySelector('input').focus(); });
}
const readCurriculum = (d) => (d.curriculum_pick === '__other' ? d.curriculum_other : d.curriculum_pick) || null;

function fileHint(el, file, maxMb) {
  if (!file) return true;
  if (file.size > maxMb * MB) { toast(`${file.name} is larger than ${maxMb} MB`, 'error'); el.value = ''; return false; }
  return true;
}

// =====================================================================
// School registration / edit
// =====================================================================
export async function schoolForm(el) {
  const s = state.profile || {};
  const years = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i);
  el.innerHTML = esc(html`<section class="page narrow">
    <h1>${state.profile ? 'School profile' : 'Register your school'}</h1>
    ${statusNote(state.profile, 'school')}
    <form id="sf" class="form" novalidate>
      <div class="card"><h2>Basics</h2>
        <label>Name of the school <span class="req">*</span><input name="name" required value="${s.name || ''}" placeholder="e.g. Sunshine Montessori House"></label>
        <div class="grid2">
          <label>Contact person<input name="contact_name" value="${s.contact_name || ''}" placeholder="Principal / owner"></label>
          <label>Contact number <span class="req">*</span><input name="phone" type="tel" inputmode="tel" required value="${s.phone || ''}" placeholder="10-digit mobile"></label>
          <label>Email<input name="email" type="email" value="${s.email || state.user.email}"></label>
          <label>Website<input name="website" type="url" value="${s.website || ''}" placeholder="www.yourschool.in"></label>
          <label>Year of establishment <span class="req">*</span><select name="year_established" required>${options(years, s.year_established, { placeholder: 'Year' })}</select></label>
          <label>Average annual fees (₹)<input name="avg_fees" type="number" min="0" step="500" value="${s.avg_fees ?? ''}" placeholder="e.g. 60000"></label>
        </div>
        <label>About the school<textarea name="about" rows="3" placeholder="What makes your school special? Facilities, philosophy, class sizes…">${s.about || ''}</textarea></label>
      </div>
      <div class="card"><h2>Students & curriculum</h2>
        <div class="grid2">
          ${curriculumField(s.curriculum)}
          <label>Number of students<input name="num_students" type="number" min="0" value="${s.num_students ?? ''}"></label>
          <label>Youngest age (years) <span class="req">*</span><select name="age_min" required>${options(AGES, s.age_min, { placeholder: 'From' })}</select></label>
          <label>Oldest age (years) <span class="req">*</span><select name="age_max" required>${options(AGES, s.age_max, { placeholder: 'To' })}</select></label>
        </div>
        ${yesNoField('bus_service', 'Bus / van service', s.bus_service)}
        ${yesNoField('food_service', 'Food / meals provided', s.food_service)}
        ${languagesField(s.languages || [], { label: 'Languages used at school', hint: 'Medium of instruction and languages staff should speak, with the level needed.' })}
      </div>
      <div class="card"><h2>Location</h2>
        ${locationField({ label: 'School location', address: s.address, lat: s.lat, lng: s.lng, maps_link: s.maps_link, hint: 'Teachers see how far your school is from their home, so place the pin on your gate.' })}
      </div>
      <div class="card"><h2>Proof of establishment <span class="req">*</span></h2>
        <p class="hint">Upload a registration certificate, trade licence, society/trust registration, or similar (PDF or photo, up to 10 MB). Only our verification team can see it.</p>
        ${s.proof_path ? html`<p class="file-have">✓ Proof uploaded · <button type="button" class="linklike" data-view-proof>View</button> · choose a file below to replace it</p>` : ''}
        <input type="file" name="proof" accept="application/pdf,image/jpeg,image/png,image/webp" ${s.proof_path ? '' : 'required'}>
      </div>
      <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit">${state.profile ? 'Save changes' : 'Submit for verification'}</button></div>
    </form></section>`);
  const form = $('#sf');
  mountRepeaters(form); mountLocationField(form); wireCurriculum(form);
  form.querySelector('[data-view-proof]')?.addEventListener('click', async () => { const u = await api.fileUrl('school-proofs', s.proof_path); u ? window.open(u, '_blank') : toast('Could not open file', 'error'); });
  form.proof.addEventListener('change', (e) => fileHint(e.target, e.target.files[0], 10));

  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(form), loc = readLocation(form), file = form.proof.files[0];
    const err = (m, f) => { toast(m, 'error'); if (f) form.querySelector(`[name=${f}]`)?.focus(); };
    if (!d.name) return err('Please enter the school name', 'name');
    if (!isValidPhone(d.phone)) return err('Please enter a valid contact number', 'phone');
    if (d.email && !isEmail(d.email)) return err('Please enter a valid email', 'email');
    if (!d.year_established) return err('Please choose the year of establishment', 'year_established');
    const curriculum = readCurriculum(d);
    if (!curriculum) return err('Please choose or type the curriculum', 'curriculum_pick');
    if (!d.age_min || !d.age_max) return err('Please choose the age range', 'age_min');
    if (Number(d.age_min) > Number(d.age_max)) return err('Youngest age must be less than oldest age', 'age_min');
    if (!loc) return err('Please pin your school on the map');
    if (!d.address) return err('Please enter the address', 'address');
    if (!file && !s.proof_path) return err('Please upload proof of establishment', 'proof');
    const btn = form.querySelector('[type=submit]'); setBusy(btn, true, file ? 'Uploading…' : 'Saving…');
    try {
      const proof_path = file ? await api.upload('school-proofs', file) : s.proof_path;
      await api.saveSchool({
        name: d.name, contact_name: d.contact_name || null, phone: cleanPhone(d.phone), email: d.email || null, website: normalizeUrl(d.website) || null,
        year_established: num(d.year_established), avg_fees: num(d.avg_fees), about: d.about || null, curriculum, num_students: num(d.num_students),
        age_min: num(d.age_min), age_max: num(d.age_max), bus_service: d.bus_service === 'yes', food_service: d.food_service === 'yes',
        languages: readRepeater(form, 'languages'), address: d.address, lat: loc.lat, lng: loc.lng, maps_link: d.maps_link || null, proof_path,
      });
      const first = !state.profile;
      await refreshProfile();
      toast(first ? 'School submitted for verification 🎉' : 'Saved');
      go('/school');
    } catch (ex) { toast(ex.message, 'error'); } finally { setBusy(btn, false); }
  };
}

// =====================================================================
// Teacher registration / edit
// =====================================================================
export async function teacherForm(el) {
  const t = state.profile || {};
  const priv = state.profile ? await api.getTeacherPrivate().catch(() => null) : null;
  const wt = t.work_types || ['class'];
  el.innerHTML = esc(html`<section class="page narrow">
    <h1>${state.profile ? 'My teacher profile' : 'Create your teacher profile'}</h1>
    ${statusNote(state.profile, 'teacher')}
    <form id="tf" class="form" novalidate>
      <div class="card"><h2>About you</h2>
        <label>Full name (as on Aadhaar) <span class="req">*</span><input name="full_name" required value="${t.full_name || ''}" autocomplete="name"></label>
        <label>Aadhaar number <span class="req">*</span>
          <input name="aadhaar" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="1234 5678 9012" value="${priv ? formatAadhaar(priv.aadhaar) : ''}" ${priv ? '' : 'required'}>
          <small class="hint">🔒 Used only by our team to verify your identity. Schools never see it.</small></label>
        <div class="grid2">
          <label>Mobile number <span class="req">*</span><input name="phone" type="tel" inputmode="tel" required value="${t.phone || ''}" autocomplete="tel"></label>
          <label>WhatsApp number<input name="whatsapp" type="tel" inputmode="tel" value="${t.whatsapp || ''}" placeholder="If different"></label>
          <label>Email<input name="email" type="email" value="${t.email || state.user.email}"></label>
          <label>Highest teaching qualification<select name="qualification">${options(QUALIFICATIONS, t.qualification, { placeholder: 'Choose…' })}</select></label>
        </div>
        <label>A few lines about you<textarea name="about" rows="3" placeholder="Your teaching style, what you enjoy doing with children…">${t.about || ''}</textarea></label>
      </div>
      <div class="card"><h2>What work are you looking for? <span class="req">*</span></h2>
        <p class="hint">Pick all that apply — schools can find you for each.</p>
        <div class="work-picks">${WORK_TYPES.map(([v, l, ico]) => html`<label class="work-pick"><input type="checkbox" name="work_types" value="${v}" ${wt.includes(v) ? 'checked' : ''}><span><b>${ico}</b>${l}</span></label>`)}</div>
      </div>
      <div class="card" data-show-for="extracurricular event"><h2>🎨 Extracurricular & events</h2>
        ${skillsField(t.activities || [], { name: 'activities', label: 'What can you teach or perform?', list: ACTIVITIES, otherName: null })}
        <div class="grid2">
          <label data-show-for="extracurricular">Fee per session (₹)<input name="session_fee" type="number" min="0" step="50" value="${t.session_fee ?? ''}" placeholder="e.g. 700"></label>
          <label data-show-for="event">Fee per event, from (₹)<input name="event_fee" type="number" min="0" step="500" value="${t.event_fee ?? ''}" placeholder="e.g. 5000"></label>
        </div>
      </div>
      <div class="card"><h2>Experience & skills</h2>
        <div class="grid2">
          <label>Total teaching experience (years) <span class="req">*</span><input name="experience_years" type="number" min="0" max="50" step="0.5" required value="${t.experience_years ?? ''}" placeholder="0 if fresher"></label>
          <label data-show-for="class">Expected salary as class teacher (₹ / month) <span class="req">*</span><input name="expected_salary" type="number" min="0" step="500" value="${t.expected_salary ?? ''}" placeholder="e.g. 25000"></label>
        </div>
        ${experienceField(t.experience || [])}
        ${skillsField(t.skills || [], { other: t.skills_other || '' })}
        ${languagesField(t.languages || [], { label: 'Languages you speak', hint: 'Add each language with how well you speak it.' })}
      </div>
      <div class="card"><h2>Where you live</h2>
        ${locationField({ label: 'Home location', address: t.address, lat: t.lat, lng: t.lng, maps_link: t.maps_link, hint: 'Schools filter teachers by distance, so an approximate pin (your street or area) is enough. Your exact address is only shared with verified schools.' })}
        <fieldset class="radius-field"><legend>How far from home are you willing to travel for work? <span class="req">*</span></legend>
          <p class="hint">Schools within this distance will see you first, and we'll show you jobs inside it.</p>
          <div class="radius-picks">${[2, 5, 10, 15, 20, 30, 50].map((k) => html`<label class="seg"><input type="radio" name="travel_km" value="${k}" ${Number(t.travel_km) === k ? 'checked' : ''}><span>${k === 50 ? '50+ km' : `${k} km`}</span></label>`)}</div>
        </fieldset>
      </div>
      <div class="card highlight"><h2>🎬 Show how you teach <span class="tag">Highly recommended</span></h2>
        <p class="hint">A 1–3 minute video of you teaching a rhyme, telling a story or running an activity. Profiles with a video get far more interest from schools. Optional.</p>
        ${t.video_path ? html`<p class="file-have">✓ Video uploaded · <button type="button" class="linklike" data-view-video>Watch</button> · choose a file below to replace it</p>` : ''}
        <label>Upload a video (MP4/MOV/WebM, up to 50 MB)<input type="file" name="video" accept="video/*"></label>
        <video data-preview controls hidden playsinline></video>
        <label>…or paste a YouTube / Google Drive link<input name="video_link" type="url" value="${t.video_link || ''}" placeholder="https://youtu.be/…"></label>
      </div>
      <div class="form-actions"><button class="btn btn-primary btn-lg" type="submit">${state.profile ? 'Save changes' : 'Submit profile for verification'}</button></div>
    </form></section>`);
  const form = $('#tf');
  mountRepeaters(form); mountLocationField(form);
  const syncWork = () => {
    const on = $$('[name=work_types]:checked', form).map((c) => c.value);
    $$('[data-show-for]', form).forEach((n) => { n.hidden = !n.dataset.showFor.split(' ').some((k) => on.includes(k)); });
  };
  form.addEventListener('change', (e) => { if (e.target.name === 'work_types') syncWork(); });
  syncWork();
  form.aadhaar.addEventListener('input', (e) => { const c = e.target.selectionStart === e.target.value.length; e.target.value = formatAadhaar(e.target.value).slice(0, 14); if (c) e.target.selectionStart = e.target.value.length; });
  form.video.addEventListener('change', (e) => {
    const f = e.target.files[0], pv = form.querySelector('[data-preview]');
    if (!fileHint(e.target, f, 50)) { pv.hidden = true; return; }
    if (f) { pv.src = URL.createObjectURL(f); pv.hidden = false; } else pv.hidden = true;
  });
  form.querySelector('[data-view-video]')?.addEventListener('click', async () => {
    const u = await api.fileUrl('teacher-videos', t.video_path);
    if (!u) return toast('Could not open video', 'error');
    modal(html`<video src="${u}" controls autoplay playsinline class="video-full"></video>`, { wide: true });
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(form), loc = readLocation(form), file = form.video.files[0];
    const err = (m, f) => { toast(m, 'error'); if (f) form.querySelector(`[name=${f}]`)?.focus(); };
    if (!d.full_name) return err('Please enter your full name', 'full_name');
    const aad = cleanAadhaar(d.aadhaar);
    if (!priv || aad !== priv.aadhaar) {
      if (!isValidAadhaar(aad)) return err('That Aadhaar number doesn\'t look right — please check the 12 digits', 'aadhaar');
    }
    if (!isValidPhone(d.phone)) return err('Please enter a valid mobile number', 'phone');
    if (d.whatsapp && !isValidPhone(d.whatsapp)) return err('Please enter a valid WhatsApp number', 'whatsapp');
    if (d.email && !isEmail(d.email)) return err('Please enter a valid email', 'email');
    if (d.experience_years === '' || Number(d.experience_years) < 0) return err('Please enter your years of experience (0 if fresher)', 'experience_years');
    const work_types = $$('[name=work_types]:checked', form).map((c) => c.value);
    const activities = $$('[name=activities]:checked', form).map((c) => c.value);
    if (!work_types.length) return err('Please choose what kind of work you\'re looking for');
    if (work_types.includes('class') && !d.expected_salary) return err('Please enter your expected monthly salary', 'expected_salary');
    if ((work_types.includes('extracurricular') || work_types.includes('event')) && !activities.length) return err('Please pick at least one activity you can teach or perform');
    const languages = readRepeater(form, 'languages');
    if (!languages.length) return err('Please add at least one language');
    if (!loc) return err('Please drop a pin for where you live');
    if (!d.travel_km) return err('Please choose how far you\'re willing to travel');
    if (!d.address) return err('Please enter your address', 'address');
    const btn = form.querySelector('[type=submit]'); setBusy(btn, true, file ? 'Uploading video…' : 'Saving…');
    try {
      const video_path = file ? await api.upload('teacher-videos', file) : t.video_path || null;
      const changedAadhaar = !priv || aad !== priv.aadhaar;
      await api.saveTeacher({
        full_name: d.full_name, phone: cleanPhone(d.phone), whatsapp: d.whatsapp ? cleanPhone(d.whatsapp) : null, email: d.email || null,
        qualification: d.qualification || null, about: d.about || null, experience_years: Number(d.experience_years),
        work_types, activities, session_fee: work_types.includes('extracurricular') ? num(d.session_fee) : null,
        event_fee: work_types.includes('event') ? num(d.event_fee) : null, travel_km: num(d.travel_km),
        expected_salary: work_types.includes('class') ? num(d.expected_salary) : null, experience: readRepeater(form, 'experience'), skills: d.skills || [], skills_other: d.skills_other || null,
        languages, address: d.address, lat: loc.lat, lng: loc.lng, maps_link: d.maps_link || null,
        video_path, video_link: normalizeUrl(d.video_link) || null, aadhaar_last4: aad.slice(-4),
      }, changedAadhaar ? aad : null);
      const first = !state.profile;
      await refreshProfile();
      toast(first ? 'Profile submitted for verification 🎉' : 'Saved');
      go('/teacher');
    } catch (ex) { toast(ex.message, 'error'); } finally { setBusy(btn, false); }
  };
}

// =====================================================================
// Teacher profile (as seen by schools / admin / the teacher)
// =====================================================================
export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export async function videoBlock(t) {
  if (t.video_path) {
    const u = await api.fileUrl('teacher-videos', t.video_path);
    if (u) return html`<video src="${u}" controls playsinline preload="metadata" class="video"></video>`;
  }
  const yt = youtubeId(t.video_link);
  if (yt) return html`<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="Teaching video" allowfullscreen loading="lazy"></iframe></div>`;
  if (t.video_link) return html`<a class="btn btn-ghost" href="${t.video_link}" target="_blank" rel="noopener">▶ Watch teaching video</a>`;
  return html`<p class="muted">No teaching video yet.</p>`;
}

export async function teacherView(el, { id }, q) {
  const t = await withLoader(api.getTeacher(id), 600);
  if (!t) { el.innerHTML = esc(html`<section class="page narrow center"><h1>Profile not available</h1><p class="muted">This teacher's profile isn't visible to you${state.user?.role === 'school' && state.profile?.status !== 'approved' ? ' until your school is verified' : ''}.</p></section>`); return; }
  let origin = null, jobs = [];
  if (state.user?.role === 'school') {
    jobs = (await api.listMyJobs()).filter((j) => j.status === 'open');
    const j = jobs.find((x) => x.id === q.job);
    origin = j || state.profile;
  }
  const dist = origin ? distanceKm(origin, t) : null;
  const isAdmin = state.user?.role === 'admin';
  const priv = isAdmin ? await api.getTeacherPrivate(id) : null;
  const wa = t.whatsapp || t.phone;
  el.innerHTML = esc(html`<section class="page narrow">
    ${q.job ? html`<a class="back" href="#/school/jobs/${q.job}">← Back to candidates</a>` : html`<a class="back" href="javascript:history.back()">← Back</a>`}
    <div class="card profile-head">
      <div class="avatar avatar-lg">${initials(t.full_name)}</div>
      <div class="grow"><h1>${t.full_name} ${statusBadge(t.status)}</h1>
        <p class="muted">${t.qualification || 'Preschool teacher'} · ${yrs(t.experience_years)} experience</p>
        <p class="facts"><span>📍 ${t.address?.split(',').slice(-3).join(',').trim() || '—'}${dist != null ? html` · <strong>${km(dist)}</strong> from ${origin === state.profile ? 'your school' : 'the job'}` : ''}</span>
          ${t.travel_km ? html`<span>🚗 Travels up to <strong>${t.travel_km >= 50 ? '50+' : t.travel_km} km</strong>${dist != null && dist > t.travel_km ? html` <em class="warn">(this is farther)</em>` : ''}</span>` : ''}
          ${t.expected_salary ? html`<span>💰 Expects <strong>${rupees(t.expected_salary)}</strong>/month</span>` : ''}</p>
        <div class="chips mt">${(t.work_types || ['class']).map((w) => html`<span class="chip chip-work">${WORK_LABEL[w] || w}</span>`)}</div>
      </div>
    </div>
    <div class="grid-2-1">
      <div>
        <div class="card"><h2>Teaching video</h2>${await videoBlock(t)}</div>
        ${t.about ? html`<div class="card"><h2>About</h2><p class="pre">${t.about}</p></div>` : ''}
        <div class="card"><h2>Experience</h2>
          ${(t.experience || []).length ? html`<ul class="timeline">${t.experience.map((x) => html`<li><strong>${x.role || 'Teacher'}</strong> at ${x.school || '—'} <span class="muted">${x.from || ''}${x.to ? ' – ' + x.to : ''}</span>${x.notes ? html`<br><small>${x.notes}</small>` : ''}</li>`)}</ul>` : html`<p class="muted">${Number(t.experience_years) ? `${yrs(t.experience_years)} total — no details added.` : 'Fresher — ready to start their teaching journey.'}</p>`}
        </div>
      </div>
      <div>
        ${(t.activities || []).length ? html`<div class="card"><h2>🎨 Extracurricular & events</h2>
          <div class="chips">${t.activities.map((a) => html`<span class="chip chip-skill">${a}</span>`)}</div>
          <dl class="kv mt">${t.session_fee ? html`<dt>Per session</dt><dd>${rupees(t.session_fee)}</dd>` : ''}${t.event_fee ? html`<dt>Events from</dt><dd>${rupees(t.event_fee)}</dd>` : ''}</dl></div>` : ''}
        <div class="card"><h2>Skills</h2><div class="chips">${(t.skills || []).map((s) => html`<span class="chip chip-skill">${s}</span>`)}${t.skills_other ? html`<span class="chip">${t.skills_other}</span>` : ''}${!(t.skills || []).length && !t.skills_other ? html`<span class="muted">—</span>` : ''}</div></div>
        <div class="card"><h2>Languages</h2><div class="chips">${langList(t.languages)}</div></div>
        <div class="card"><h2>Contact</h2>
          <p>📞 <a href="tel:+91${t.phone}">${t.phone}</a></p>
          ${wa ? html`<p>💬 <a href="https://wa.me/91${wa}" target="_blank" rel="noopener">WhatsApp</a></p>` : ''}
          ${t.email ? html`<p>✉️ <a href="mailto:${t.email}">${t.email}</a></p>` : ''}
          ${t.lat != null ? html`<p>🗺️ <a href="${origin ? gmapsDirections(origin, t) : gmapsUrl(t.lat, t.lng)}" target="_blank" rel="noopener">${origin ? 'Route on Google Maps' : 'Open in Google Maps'}</a></p>` : ''}
        </div>
        ${state.user?.role === 'school' && jobs.length ? html`<div class="card"><h2>Invite to a job</h2>
          <select id="inv-job">${options(jobs.map((j) => [j.id, j.title]), q.job)}</select>
          <div class="row mt"><button class="btn btn-primary" data-invite="invited">Invite to apply</button><button class="btn btn-ghost" data-invite="shortlisted">⭐ Shortlist</button></div></div>` : ''}
        ${isAdmin ? html`<div class="card"><h2>Verification</h2><p>Aadhaar: <strong>${priv ? formatAadhaar(priv.aadhaar) : '—'}</strong></p><p class="muted">Joined ${new Date(t.created_at).toLocaleDateString('en-IN')}</p></div>` : ''}
      </div>
    </div></section>`);
  el.querySelectorAll('[data-invite]').forEach((b) => b.addEventListener('click', async () => {
    setBusy(b, true);
    try { await api.inviteTeacher($('#inv-job').value, t.id, b.dataset.invite); toast(b.dataset.invite === 'invited' ? `Invitation sent to ${t.full_name}` : 'Added to shortlist'); }
    catch (ex) { toast(ex.message, 'error'); } finally { setBusy(b, false); }
  }));
}

// =====================================================================
// School public page
// =====================================================================
export async function schoolView(el, { id }) {
  const s = await api.getSchool(id);
  if (!s) { el.innerHTML = esc(html`<section class="page narrow center"><h1>School not found</h1></section>`); return; }
  const jobs = (await api.listOpenJobs()).filter((j) => j.school_id === id);
  const me = state.user?.role === 'teacher' ? state.profile : null;
  const dist = me ? distanceKm(me, s) : null;
  el.innerHTML = esc(html`<section class="page narrow">
    <a class="back" href="javascript:history.back()">← Back</a>
    <div class="card profile-head"><div class="avatar avatar-lg avatar-school">🏫</div>
      <div class="grow"><h1>${s.name} ${s.status === 'approved' ? statusBadge('approved') : ''}</h1>
        <p class="muted">${s.curriculum || ''}${s.year_established ? ` · Since ${s.year_established}` : ''}${s.num_students ? ` · ${s.num_students} students` : ''}</p>
        <p class="facts"><span>📍 ${s.address || ''}${dist != null ? html` · <strong>${km(dist)}</strong> from you` : ''}</span></p></div></div>
    <div class="grid-2-1"><div>
      ${s.about ? html`<div class="card"><h2>About</h2><p class="pre">${s.about}</p></div>` : ''}
      <div class="card"><h2>Open positions</h2>${jobs.length ? html`<ul class="plain">${jobs.map((j) => html`<li><a href="#/jobs/${j.id}">${j.title}</a> <span class="muted">· ${j.openings} opening${j.openings > 1 ? 's' : ''}</span></li>`)}</ul>` : html`<p class="muted">No open positions right now.</p>`}</div>
    </div><div>
      <div class="card"><h2>At a glance</h2><dl class="kv">
        <dt>Ages</dt><dd>${s.age_min ?? '?'} – ${s.age_max ?? '?'} yrs</dd>
        <dt>Bus service</dt><dd>${yesNo(s.bus_service)}</dd><dt>Food</dt><dd>${yesNo(s.food_service)}</dd>
        ${s.avg_fees ? html`<dt>Avg. fees</dt><dd>${rupees(s.avg_fees)}/yr</dd>` : ''}
      </dl><div class="chips mt">${langList(s.languages)}</div></div>
      <div class="card"><h2>Contact</h2>
        ${s.phone ? html`<p>📞 <a href="tel:+91${s.phone}">${s.phone}</a></p>` : ''}
        ${s.website ? html`<p>🌐 <a href="${s.website}" target="_blank" rel="noopener">${s.website.replace(/^https?:\/\//, '')}</a></p>` : ''}
        ${s.lat != null ? html`<p>🗺️ <a href="${me ? gmapsDirections(me, s) : gmapsUrl(s.lat, s.lng)}" target="_blank" rel="noopener">${me ? 'Route from home' : 'Open in Google Maps'}</a></p>` : ''}
      </div></div></div></section>`);
}
