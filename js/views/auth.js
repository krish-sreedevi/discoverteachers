import { api } from '../api/index.js?v=20261001-6';
import { html, esc, $, toast, setBusy } from '../lib/dom.js?v=20261001-6';
import { isEmail } from '../lib/validate.js?v=20261001-6';
import { state, refreshProfile, go, homeFor } from '../app.js?v=20261001-6';

const roleCopy = {
  school: { icon: '🏫', title: 'School', blurb: 'Post openings and find verified teachers near you' },
  teacher: { icon: '🍎', title: 'Teacher', blurb: 'Get discovered by preschools near your home' },
};

function demoHint(role) {
  if (api.mode !== 'demo') return '';
  const creds = { school: 'sunshine@demo.in', teacher: 'priya@demo.in', admin: 'admin@demo.in' }[role];
  return html`<div class="note note-info"><strong>Demo mode:</strong> try <code>${creds}</code> / <code>demo1234</code>
    <button type="button" class="linklike" data-fill="${creds}">Fill in</button></div>`;
}

function roleTabs(active, base) {
  return html`<div class="role-tabs" role="tablist">${['school', 'teacher'].map((r) => html`
    <a role="tab" aria-selected="${r === active}" class="role-tab ${r === active ? 'active' : ''}" href="#${base}?as=${r}">
      <span class="role-ico">${roleCopy[r].icon}</span><span><strong>I'm a ${roleCopy[r].title.toLowerCase()}</strong><small>${roleCopy[r].blurb}</small></span></a>`)}</div>`;
}

async function afterLogin(user) {
  await refreshProfile();
  const next = sessionStorage.getItem('dt_after_login');
  sessionStorage.removeItem('dt_after_login');
  if (user.role === 'school' && !state.profile) return go('/school/profile');
  if (user.role === 'teacher' && !state.profile) return go('/teacher/profile');
  go(next && next !== '/login' ? next : homeFor(user));
}

function loginForm(el, { role, admin = false }) {
  el.innerHTML = esc(html`<section class="page auth">
    <div class="auth-card">
      <h1>${admin ? 'Admin log in' : 'Welcome back'}</h1>
      ${admin ? html`<p class="muted">For Discover Teachers staff only.</p>` : roleTabs(role, '/login')}
      ${demoHint(admin ? 'admin' : role)}
      <form id="login" novalidate>
        <label>Email<input type="email" name="email" autocomplete="email" required></label>
        <label>Password<input type="password" name="password" autocomplete="current-password" required minlength="6"></label>
        <button class="btn btn-primary btn-block" type="submit">Log in</button>
      </form>
      ${admin ? '' : html`<p class="auth-foot"><a href="#/forgot">Forgot password?</a> · New here? <a href="#/register?as=${role}">Create a ${role} account</a></p>`}
    </div></section>`);
  el.querySelector('[data-fill]')?.addEventListener('click', (e) => {
    $('#login [name=email]').value = e.target.dataset.fill; $('#login [name=password]').value = 'demo1234';
  });
  $('#login').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button[type=submit]');
    const email = f.email.value.trim(), password = f.password.value;
    if (!isEmail(email)) return toast('Please enter a valid email', 'error');
    setBusy(btn, true, 'Logging in…');
    try {
      const user = await api.signIn({ email, password });
      if (admin && user.role !== 'admin') { await api.signOut(); throw new Error('This account is not an admin account.'); }
      if (!admin && user.role === 'admin') { await refreshProfile(); return go('/admin'); }
      if (!admin && user.role !== role) toast(`Logged in to your ${user.role} account`);
      await afterLogin(user);
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(btn, false); }
  };
}

export function login(el, _p, q) {
  if (state.user) return go(homeFor(state.user));
  loginForm(el, { role: q.as === 'school' ? 'school' : 'teacher' });
}
export function adminLogin(el) {
  if (state.user?.role === 'admin') return go('/admin');
  loginForm(el, { admin: true });
}

export function register(el, _p, q) {
  if (state.user) return go(homeFor(state.user));
  const role = q.as === 'school' ? 'school' : 'teacher';
  el.innerHTML = esc(html`<section class="page auth">
    <div class="auth-card">
      <h1>Create your account</h1>
      ${roleTabs(role, '/register')}
      <form id="reg" novalidate>
        <label>Email<input type="email" name="email" autocomplete="email" required></label>
        <label>Password <small class="muted">(at least 8 characters)</small><input type="password" name="password" autocomplete="new-password" required minlength="8"></label>
        <label>Confirm password<input type="password" name="password2" autocomplete="new-password" required minlength="8"></label>
        <label class="check"><input type="checkbox" name="terms" required> I confirm the details I submit will be true and I agree to them being verified by Discover Teachers.</label>
        <button class="btn btn-primary btn-block" type="submit">Continue — ${role === 'school' ? 'add school details' : 'build my profile'} →</button>
      </form>
      <p class="auth-foot">Already registered? <a href="#/login?as=${role}">Log in</a></p>
    </div></section>`);
  $('#reg').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button[type=submit]');
    const email = f.email.value.trim();
    if (!isEmail(email)) return toast('Please enter a valid email', 'error');
    if (f.password.value.length < 8) return toast('Password must be at least 8 characters', 'error');
    if (f.password.value !== f.password2.value) return toast('Passwords don\'t match', 'error');
    if (!f.terms.checked) return toast('Please tick the confirmation box', 'error');
    setBusy(btn, true, 'Creating account…');
    try {
      const { needsConfirm } = await api.signUp({ email, password: f.password.value, role });
      if (needsConfirm) {
        el.innerHTML = esc(html`<section class="page auth"><div class="auth-card center">
          <div class="big-ico">📬</div><h1>Check your email</h1>
          <p>We sent a confirmation link to <strong>${email}</strong>. Click it, then log in to ${role === 'school' ? 'add your school details' : 'build your profile'}.</p>
          <a class="btn btn-primary" href="#/login?as=${role}">Go to log in</a></div></section>`);
        return;
      }
      toast('Account created!');
      await afterLogin(api.user());
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(btn, false); }
  };
}

export function forgot(el) {
  el.innerHTML = esc(html`<section class="page auth"><div class="auth-card">
    <h1>Reset password</h1><p class="muted">We'll email you a link to set a new password.</p>
    <form id="fg"><label>Email<input type="email" name="email" required></label>
    <button class="btn btn-primary btn-block">Send reset link</button></form>
    <p class="auth-foot"><a href="#/login">Back to log in</a></p></div></section>`);
  $('#fg').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); setBusy(btn, true, 'Sending…');
    try { await api.resetPassword(e.target.email.value.trim()); toast('Reset link sent — check your inbox'); } catch (err) { toast(err.message, 'error'); } finally { setBusy(btn, false); }
  };
}

export function reset(el) {
  el.innerHTML = esc(html`<section class="page auth"><div class="auth-card">
    <h1>Set a new password</h1>
    <form id="rs"><label>New password<input type="password" name="p" minlength="8" required autocomplete="new-password"></label>
    <button class="btn btn-primary btn-block">Save password</button></form></div></section>`);
  $('#rs').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); setBusy(btn, true);
    try { await api.updatePassword(e.target.p.value); toast('Password updated'); await refreshProfile(); go(homeFor(api.user())); } catch (err) { toast(err.message, 'error'); } finally { setBusy(btn, false); }
  };
}
