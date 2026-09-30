import { api } from '../api/index.js';
import { html, esc } from '../lib/dom.js';
import { jobCard } from './jobs.js';
import { state, homeFor } from '../app.js';

export async function home(el) {
  const jobs = (await api.listOpenJobs().catch(() => [])).slice(0, 3);
  const u = state.user;
  el.innerHTML = esc(html`
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-copy">
        <p class="eyebrow">For preschools & early-years teachers</p>
        <h1>Find the teacher your little ones will <span class="hl">love</span>.</h1>
        <p class="lead">Discover Teachers connects preschools with verified teachers who live nearby — with skills like yoga, dance and art, and a short video showing how they teach.</p>
        ${u ? html`<a class="btn btn-primary btn-lg" href="#${homeFor(u)}">Go to your dashboard →</a>` : html`<div class="hero-ctas">
          <a class="cta cta-school" href="#/register?as=school"><span class="cta-ico">🏫</span><span><strong>I'm hiring</strong><small>Register your school</small></span></a>
          <a class="cta cta-teacher" href="#/register?as=teacher"><span class="cta-ico">🍎</span><span><strong>I'm a teacher</strong><small>Create my profile</small></span></a>
        </div>`}
      </div>
      <div class="hero-art" aria-hidden="true">
        <img src="assets/mark.svg" alt="" class="hero-mark">
        <div class="float f1">🧘 Yoga</div><div class="float f2">🎨 Art</div><div class="float f3">💃 Dance</div><div class="float f4">📍 2.1 km away</div><div class="float f5">🎬 Teaching video</div>
      </div>
    </div>
  </section>
  <section class="page">
    <div class="how">
      <div class="how-col"><h2>🏫 For schools</h2><ol class="steps">
        <li><strong>Register & get verified.</strong> Share your details and proof of establishment.</li>
        <li><strong>Post a job in a minute.</strong> We autofill your address, curriculum, languages, bus and food details.</li>
        <li><strong>Filter teachers near you.</strong> By distance, experience, salary, languages and skills — then watch their teaching videos and invite the best.</li></ol></div>
      <div class="how-col"><h2>🍎 For teachers</h2><ol class="steps">
        <li><strong>Build one profile.</strong> Your experience, skills, languages and expected salary.</li>
        <li><strong>Add a teaching video.</strong> Optional, but it's the best way to stand out.</li>
        <li><strong>Get invited.</strong> Verified schools near your home find you, or you apply to jobs yourself.</li></ol></div>
    </div>
    <div class="features">
      <div class="feature"><span>✅</span><h3>Everyone is verified</h3><p>Schools submit proof of establishment; teachers are checked against Aadhaar. Aadhaar is never shown to schools.</p></div>
      <div class="feature"><span>📍</span><h3>Distance-first search</h3><p>Every school and teacher is pinned on the map, so you see who can reach you easily.</p></div>
      <div class="feature"><span>🎬</span><h3>See them teach</h3><p>Short classroom videos tell you more than any CV.</p></div>
    </div>
    ${jobs.length ? html`<div class="section-head"><h2>Latest openings</h2><a href="#/jobs">See all jobs →</a></div><div class="cards">${jobs.map((j) => jobCard(j))}</div>` : ''}
  </section>`);
}
