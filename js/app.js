import { initApi, api } from './api/index.js?v=20261001-7';
import { html, esc, $, toast, loaderHTML } from './lib/dom.js?v=20261001-7';

export const state = { user: null, profile: null };

export async function refreshProfile() {
  state.user = api.user();
  state.profile = null;
  if (state.user?.role === 'school') state.profile = await api.getSchool().catch(() => null);
  if (state.user?.role === 'teacher') state.profile = await api.getTeacher().catch(() => null);
  renderNav();
  return state.profile;
}

export const go = (path) => { if (location.hash === '#' + path) route(); else location.hash = path; };

export function homeFor(user) {
  if (!user) return '/';
  if (user.role === 'admin') return '/admin';
  return user.role === 'school' ? '/school' : '/teacher';
}

// ---------- routes ----------
// What the branded loader says while each page fetches its data
const LOADER_MSG = {
  '/jobs': 'Finding jobs near you', '/jobs/:id': 'Loading job', '/teachers': 'Finding teachers near you',
  '/teachers/:id': 'Loading teacher profile', '/schools/:id': 'Loading school', '/school': 'Loading your dashboard',
  '/school/jobs/:id': 'Finding teachers for this role', '/school/jobs/:id/edit': 'Loading listing', '/teacher': 'Finding jobs for you',
  '/admin': 'Loading admin dashboard', '/teacher/profile': 'Loading your profile', '/school/profile': 'Loading school profile',
};

const routes = [
  ['/', () => import('./views/home.js?v=20261001-7'), 'home'],
  ['/login', () => import('./views/auth.js?v=20261001-7'), 'login'],
  ['/register', () => import('./views/auth.js?v=20261001-7'), 'register'],
  ['/admin/login', () => import('./views/auth.js?v=20261001-7'), 'adminLogin'],
  ['/forgot', () => import('./views/auth.js?v=20261001-7'), 'forgot'],
  ['/reset', () => import('./views/auth.js?v=20261001-7'), 'reset'],
  ['/jobs', () => import('./views/jobs.js?v=20261001-7'), 'browse'],
  ['/jobs/:id', () => import('./views/jobs.js?v=20261001-7'), 'detail'],
  ['/school', () => import('./views/school.js?v=20261001-7'), 'dashboard', 'school'],
  ['/school/profile', () => import('./views/profile.js?v=20261001-7'), 'schoolForm', 'school', true],
  ['/school/jobs/new', () => import('./views/school.js?v=20261001-7'), 'jobForm', 'school'],
  ['/school/jobs/:id/edit', () => import('./views/school.js?v=20261001-7'), 'jobForm', 'school'],
  ['/school/jobs/:id', () => import('./views/school.js?v=20261001-7'), 'jobManage', 'school'],
  ['/teacher', () => import('./views/teacher.js?v=20261001-7'), 'dashboard', 'teacher'],
  ['/teacher/profile', () => import('./views/profile.js?v=20261001-7'), 'teacherForm', 'teacher', true],
  ['/teachers', () => import('./views/directory.js?v=20261001-7'), 'browseTeachers'],
  ['/teachers/:id', () => import('./views/profile.js?v=20261001-7'), 'teacherView', ['school', 'admin', 'teacher']],
  ['/schools/:id', () => import('./views/profile.js?v=20261001-7'), 'schoolView'],
  ['/admin', () => import('./views/admin.js?v=20261001-7'), 'dashboard', 'admin'],
];

function match(path) {
  for (const [pattern, loader, fn, role, allowIncomplete] of routes) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    const m = path.match(re);
    if (m) return { pattern, loader, fn, role, allowIncomplete, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

let routeSeq = 0;
export async function route() {
  const seq = ++routeSeq;
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  const main = $('#app');
  const r = match(path);
  if (!r) { main.innerHTML = esc(html`<section class="page narrow center"><h1>Page not found</h1><p><a href="#/">Go home</a></p></section>`); return; }

  const user = state.user;
  if (r.role) {
    const roles = Array.isArray(r.role) ? r.role : [r.role];
    if (!user) { sessionStorage.setItem('dt_after_login', raw); return go(r.role === 'admin' ? '/admin/login' : `/login${roles.length === 1 ? '?as=' + roles[0] : ''}`); }
    if (!roles.includes(user.role)) { toast('That page is for ' + roles.join(' / ') + ' accounts', 'error'); return go(homeFor(user)); }
    if (!r.allowIncomplete && (user.role === 'school' || user.role === 'teacher') && !state.profile) {
      return go(user.role === 'school' ? '/school/profile' : '/teacher/profile');
    }
  }
  main.setAttribute('aria-busy', 'true');
  try {
    const view = document.createElement('div'); view.className = 'view';
    const msg = LOADER_MSG[r.pattern];
    if (msg) { view.innerHTML = loaderHTML(msg); main.replaceChildren(view); window.scrollTo(0, 0); }
    else setTimeout(() => { const v = main.firstElementChild; if (seq === routeSeq && v && v.classList.contains('view') && !v.innerHTML.trim()) v.innerHTML = loaderHTML('Loading'); }, 150);
    const mod = await r.loader();
    if (seq !== routeSeq) return;
    if (!msg) { main.replaceChildren(view); window.scrollTo(0, 0); }
    await mod[r.fn](view, r.params, query);
  } catch (e) {
    if (e && e.aborted) return;
    console.error(e);
    if (seq === routeSeq) main.innerHTML = esc(html`<section class="page narrow center"><h1>Something went wrong</h1><p class="muted">${e.message}</p><p><a class="btn btn-primary" href="#/">Go home</a></p></section>`);
  } finally { main.removeAttribute('aria-busy'); }
  renderNav();
}

// ---------- header ----------
export function renderNav() {
  const u = state.user;
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const link = (href, label) => html`<a href="#${href}" class="${path === href || (href !== '/' && path.startsWith(href + '/')) ? 'active' : ''}">${label}</a>`;
  let links;
  const browse = html`${link('/jobs', 'Browse jobs')}${link('/teachers', 'Browse teachers')}`;
  const out = html`<button class="btn btn-ghost btn-sm" data-logout>Log out</button>`;
  if (!u) links = html`${browse}<a href="#/login" class="btn btn-ghost btn-sm">Log in</a><a href="#/register" class="btn btn-primary btn-sm">Join free</a>`;
  else if (u.role === 'school') links = html`${link('/school', 'Dashboard')}${browse}${link('/school/jobs/new', 'Post a job')}${link('/school/profile', 'Profile')}${out}`;
  else if (u.role === 'teacher') links = html`${link('/teacher', 'Dashboard')}${browse}${link('/teacher/profile', 'My profile')}${out}`;
  else links = html`${link('/admin', 'Admin')}${browse}${out}`;
  $('#nav-links').innerHTML = esc(links);
}

async function boot() {
  try {
    await initApi();
  } catch (e) {
    $('#app').innerHTML = esc(html`<section class="page narrow center"><h1>Couldn't connect</h1><p class="muted">${e.message}</p></section>`);
    return;
  }
  if (api.mode === 'demo') {
    const b = $('#demo-banner'); b.hidden = false;
    b.querySelector('[data-reset]')?.addEventListener('click', () => api.resetDemo());
  }
  await refreshProfile();
  api.onAuth(async (u, evt) => {
    if (evt === 'PASSWORD_RECOVERY') return go('/reset');
    const changed = (u?.id || null) !== (state.user?.id || null);
    if (changed) { await refreshProfile(); if (evt === 'SIGNED_IN' && /access_token|type=signup/.test(location.hash)) go(homeFor(u)); }
  });
  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-logout]')) { await api.signOut(); state.user = null; state.profile = null; toast('Logged out'); go('/'); renderNav(); }
    // Clicking the menu item for the page you're already on reloads it (with the loader) instead of doing nothing
    const same = e.target.closest('#nav-links a[href^="#"], .site-footer a[href^="#"]');
    if (same && same.getAttribute('href') === location.hash) { e.preventDefault(); route(); }
    if (e.target.closest('#nav-toggle')) document.body.classList.toggle('nav-open');
    else if (e.target.closest('#nav-links a, #nav-links button')) document.body.classList.remove('nav-open');
  });
  // Supabase puts auth tokens in the hash after email confirmation; let it finish first.
  if (/access_token=|error_description=/.test(location.hash)) {
    if (/error_description=/.test(location.hash)) toast(decodeURIComponent(location.hash.match(/error_description=([^&]+)/)[1]).replace(/\+/g, ' '), 'error');
    const recovery = /type=recovery/.test(location.hash);
    history.replaceState(null, '', location.pathname + '#' + (recovery ? '/reset' : homeFor(state.user)));
  }
  window.addEventListener('hashchange', route);
  route();
}

boot();
