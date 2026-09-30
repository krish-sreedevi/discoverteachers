import { initApi, api } from './api/index.js';
import { html, esc, $, toast } from './lib/dom.js';

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
const routes = [
  ['/', () => import('./views/home.js'), 'home'],
  ['/login', () => import('./views/auth.js'), 'login'],
  ['/register', () => import('./views/auth.js'), 'register'],
  ['/admin/login', () => import('./views/auth.js'), 'adminLogin'],
  ['/forgot', () => import('./views/auth.js'), 'forgot'],
  ['/reset', () => import('./views/auth.js'), 'reset'],
  ['/jobs', () => import('./views/jobs.js'), 'browse'],
  ['/jobs/:id', () => import('./views/jobs.js'), 'detail'],
  ['/school', () => import('./views/school.js'), 'dashboard', 'school'],
  ['/school/profile', () => import('./views/profile.js'), 'schoolForm', 'school', true],
  ['/school/jobs/new', () => import('./views/school.js'), 'jobForm', 'school'],
  ['/school/jobs/:id/edit', () => import('./views/school.js'), 'jobForm', 'school'],
  ['/school/jobs/:id', () => import('./views/school.js'), 'jobManage', 'school'],
  ['/teacher', () => import('./views/teacher.js'), 'dashboard', 'teacher'],
  ['/teacher/profile', () => import('./views/profile.js'), 'teacherForm', 'teacher', true],
  ['/teachers/:id', () => import('./views/profile.js'), 'teacherView', ['school', 'admin', 'teacher']],
  ['/schools/:id', () => import('./views/profile.js'), 'schoolView'],
  ['/admin', () => import('./views/admin.js'), 'dashboard', 'admin'],
];

function match(path) {
  for (const [pattern, loader, fn, role, allowIncomplete] of routes) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    const m = path.match(re);
    if (m) return { loader, fn, role, allowIncomplete, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
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
    const mod = await r.loader();
    if (seq !== routeSeq) return;
    window.scrollTo(0, 0);
    const view = document.createElement('div'); view.className = 'view';
    main.replaceChildren(view);
    await mod[r.fn](view, r.params, query);
  } catch (e) {
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
  if (!u) links = html`${link('/jobs', 'Browse jobs')}<a href="#/login" class="btn btn-ghost btn-sm">Log in</a><a href="#/register" class="btn btn-primary btn-sm">Join free</a>`;
  else if (u.role === 'school') links = html`${link('/school', 'Dashboard')}${link('/school/jobs/new', 'Post a job')}${link('/school/profile', 'School profile')}<button class="btn btn-ghost btn-sm" data-logout>Log out</button>`;
  else if (u.role === 'teacher') links = html`${link('/teacher', 'Dashboard')}${link('/jobs', 'Find jobs')}${link('/teacher/profile', 'My profile')}<button class="btn btn-ghost btn-sm" data-logout>Log out</button>`;
  else links = html`${link('/admin', 'Admin')}${link('/jobs', 'Jobs')}<button class="btn btn-ghost btn-sm" data-logout>Log out</button>`;
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
