import { api } from '../api/index.js?v=20261001-5';
import { html, esc } from '../lib/dom.js?v=20261001-5';
import { ACTIVITIES } from '../lib/constants.js?v=20261001-5';
import { jobCard } from './jobs.js?v=20261001-5';
import { state, homeFor } from '../app.js?v=20261001-5';

const ACTS = [['🧘', 'Yoga'], ['💃', 'Dance'], ['🎨', 'Art & craft'], ['🏺', 'Pottery'], ['🎵', 'Music & singing'], ['🥋', 'Karate / martial arts'], ['♟️', 'Chess'], ['🎩', 'Magic show']];

export async function home(el) {
  const [allJobs, teachers] = await Promise.all([api.listOpenJobs().catch(() => []), api.listTeacherDirectory(false).catch(() => [])]);
  const jobs = allJobs.slice(0, 3);
  const u = state.user;
  const dash = u ? `#${homeFor(u)}` : null;

  const audiences = [
    { key: 'school', ico: '🏫', title: 'For Schools', line: 'Hire verified teachers nearby.', chips: ['📍 Distance search', '🎬 Teaching videos', '✅ Verified'],
      cta: u?.role === 'school' ? ['Go to dashboard', dash] : ['Register your school', '#/register?as=school'], alt: ['Browse teachers', '#/teachers?type=class'] },
    { key: 'teacher', ico: '🍎', title: 'For Teachers', line: 'Get found by schools near home.', chips: ['👤 One profile', '💌 Invites', '🏠 Jobs near you'],
      cta: u?.role === 'teacher' ? ['Go to dashboard', dash] : ['Create your profile', '#/register?as=teacher'], alt: ['Browse jobs', '#/jobs'] },
    { key: 'event', ico: '🎉', title: 'For Events', line: 'Yoga, dance, art & more.', chips: ['📅 One-time events', '🔁 Weekly classes', '🎭 Workshops'],
      cta: ['Find instructors', '#/teachers?type=event'], alt: ['Weekly classes', '#/teachers?type=extracurricular'] },
  ];

  el.innerHTML = esc(html`
  <section class="hero hero-v2">
    <div class="hero-inner">
      <div class="hero-copy">
        <div class="aud-pills"><a href="#aud-school">For Schools</a><a href="#aud-teacher">For Teachers</a><a href="#aud-event">For Events</a></div>
        <h1>Find the teacher your little ones will <span class="hl">love</span>.</h1>
        <p class="lead">Verified preschool teachers and activity instructors — close to you.</p>
        ${dash ? html`<a class="btn btn-primary btn-lg" href="${dash}">Go to your dashboard →</a>` : ''}
      </div>
      <div class="hero-art" aria-hidden="true">
        <img src="assets/mark.svg" alt="" class="hero-mark">
        <div class="float f1">🧘 Yoga</div><div class="float f2">🎨 Art</div><div class="float f3">💃 Dance</div><div class="float f4">📍 2.1 km away</div><div class="float f5">🔤 English</div><div class="float f6">🔢 Math</div>
      </div>
    </div>
  </section>

  <section class="page home">
    <div class="aud-cards">${audiences.map((a) => html`
      <article class="aud-card aud-${a.key}" id="aud-${a.key}">
        <div class="aud-ico">${a.ico}</div>
        <h2>${a.title}</h2>
        <p>${a.line}</p>
        <ul class="aud-chips">${a.chips.map((c) => html`<li>${c}</li>`)}</ul>
        <div class="aud-actions"><a class="btn btn-primary" href="${a.cta[1]}">${a.cta[0]}</a><a class="aud-alt" href="${a.alt[1]}">${a.alt[0]} →</a></div>
      </article>`)}
    </div>

    <div class="stat-strip">
      <a href="#/teachers"><b>${teachers.length}</b><span>verified teachers</span></a>
      <a href="#/jobs"><b>${allJobs.length}</b><span>open jobs</span></a>
      <a href="#/teachers?type=extracurricular"><b>${ACTIVITIES.length}+</b><span>activities</span></a>
      <a href="#/jobs"><b>${allJobs.filter((j) => j.job_type === 'event').length}</b><span>upcoming events</span></a>
    </div>

    <div class="steps-row" aria-label="How it works">
      <div class="step"><span>📝</span><b>Sign up</b><small>2 minutes</small></div>
      <i aria-hidden="true"></i>
      <div class="step"><span>✅</span><b>Get verified</b><small>Proof & Aadhaar</small></div>
      <i aria-hidden="true"></i>
      <div class="step"><span>🤝</span><b>Connect</b><small>Invite, apply, book</small></div>
    </div>

    <div class="section-head"><h2>Popular activities</h2><a href="#/teachers?type=extracurricular">All activities →</a></div>
    <div class="act-row">${ACTS.map(([i, a]) => html`<a class="act-chip" href="#/teachers?type=${a === 'Magic show' ? 'event' : 'extracurricular'}&activity=${encodeURIComponent(a)}"><span>${i}</span>${a.replace(' / martial arts', '').replace(' & singing', '')}</a>`)}</div>

    ${jobs.length ? html`<div class="section-head"><h2>Latest openings</h2><a href="#/jobs">See all jobs →</a></div><div class="cards">${jobs.map((j) => jobCard(j))}</div>` : ''}
  </section>`);

  // in-page jumps from the hero pills without touching the router
  el.querySelectorAll('.aud-pills a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); const t = el.querySelector(a.getAttribute('href'));
    t?.scrollIntoView({ behavior: 'smooth', block: 'center' }); t?.classList.add('flash'); setTimeout(() => t?.classList.remove('flash'), 1200);
  }));
}
