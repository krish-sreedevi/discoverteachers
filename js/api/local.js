// Demo backend: same API as supabase.js, stored in this browser (localStorage + IndexedDB for files).
import { seedData } from './seed.js?v=20261001-6';

const KEY = 'dt_demo_db_v3', SKEY = 'dt_demo_session';
const clone = (x) => JSON.parse(JSON.stringify(x));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const now = () => new Date().toISOString();

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dt:' + s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ---- IndexedDB file store ----
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('dt_demo_files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function putFile(path, blob) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('files', 'readwrite'); t.objectStore('files').put(blob, path); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function getFile(path) { const db = await idb(); return new Promise((res) => { const r = db.transaction('files').objectStore('files').get(path); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); }

export async function createLocalApi() {
  let db;
  const load = async () => {
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
    if (!db) { db = await seedData(hash); save(); }
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('Demo storage full', e); } };
  await load();

  let current = null;
  const listeners = [];
  const setUser = (u) => { current = u ? { id: u.id, email: u.email, role: u.role } : null; try { u ? localStorage.setItem(SKEY, u.id) : localStorage.removeItem(SKEY); } catch {} };
  const uid = () => { if (!current) throw new Error('Please log in first'); return current.id; };
  const role = () => current?.role;
  const isAdmin = () => role() === 'admin';
  const approvedSchool = () => db.schools.find((s) => s.id === current?.id && s.status === 'approved');
  const approvedTeacher = () => db.teachers.find((t) => t.id === current?.id && t.status === 'approved');
  const schoolPublic = (id) => { const s = db.schools.find((x) => x.id === id); if (!s) return null; const { proof_path, admin_note, ...rest } = s; return rest; };
  const jobVisible = (j) => (j.status === 'open' && db.schools.find((s) => s.id === j.school_id)?.status === 'approved') || j.school_id === current?.id || isAdmin();
  const withSchool = (j) => ({ ...clone(j), school: schoolPublic(j.school_id) });
  const upsert = (table, row, key = 'id') => {
    const i = db[table].findIndex((r) => r[key] === row[key]);
    if (i >= 0) db[table][i] = { ...db[table][i], ...row, updated_at: now() };
    else db[table].push({ created_at: now(), updated_at: now(), ...row });
    save();
    return clone(db[table].find((r) => r[key] === row[key]));
  };
  const delay = () => new Promise((r) => setTimeout(r, 120));

  const api = {
    mode: 'demo',
    async init() {
      let id = null; try { id = localStorage.getItem(SKEY); } catch {}
      const u = db.users.find((x) => x.id === id); setUser(u || null); return current;
    },
    user: () => current,
    onAuth(cb) { listeners.push(cb); },
    async signUp({ email, password, role: r }) {
      await delay();
      email = email.trim().toLowerCase();
      if (db.users.some((u) => u.email === email)) throw new Error('An account with this email already exists. Please log in.');
      const u = { id: uuid(), email, role: r === 'school' ? 'school' : 'teacher', pw: await hash(password), created_at: now() };
      db.users.push(u); save(); setUser(u); listeners.forEach((f) => f(current, 'SIGNED_IN'));
      return { needsConfirm: false };
    },
    async signIn({ email, password }) {
      await delay();
      const u = db.users.find((x) => x.email === email.trim().toLowerCase());
      if (!u || u.pw !== (await hash(password))) throw new Error('Wrong email or password.');
      setUser(u); return current;
    },
    async signOut() { setUser(null); },
    async resetPassword() { throw new Error('Password reset emails are not sent in demo mode.'); },
    async updatePassword(p) { const u = db.users.find((x) => x.id === uid()); u.pw = await hash(p); save(); },

    async getSchool(id = uid()) { const s = db.schools.find((x) => x.id === id); if (!s) return null; if (s.id === current?.id || isAdmin() || s.status === 'approved') return clone(s); return null; },
    async saveSchool(obj) {
      await delay();
      if (role() !== 'school') throw new Error('Only school accounts can do that');
      const prev = db.schools.find((x) => x.id === uid());
      return upsert('schools', { ...obj, id: uid(), status: prev?.status || 'pending', admin_note: prev?.admin_note || null });
    },
    async getTeacher(id = uid()) {
      const t = db.teachers.find((x) => x.id === id); if (!t) return null;
      const applied = db.applications.some((a) => a.teacher_id === id && db.jobs.find((j) => j.id === a.job_id)?.school_id === current?.id);
      if (t.id === current?.id || isAdmin() || (approvedSchool() && (t.status === 'approved' || applied))) return clone(t);
      return null;
    },
    async saveTeacher(obj, aadhaar) {
      await delay();
      if (role() !== 'teacher') throw new Error('Only teacher accounts can do that');
      const prev = db.teachers.find((x) => x.id === uid());
      const t = upsert('teachers', { ...obj, id: uid(), status: prev?.status || 'pending', admin_note: prev?.admin_note || null });
      if (aadhaar) upsert('teacher_private', { teacher_id: uid(), aadhaar }, 'teacher_id');
      return t;
    },
    async getTeacherPrivate(id = uid()) { if (id !== current?.id && !isAdmin()) return null; return clone(db.teacher_private.find((x) => x.teacher_id === id) || null); },

    async upload(bucket, file) {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${bucket}/${uid()}/${Date.now()}.${ext}`;
      await putFile(path, file); return path;
    },
    async fileUrl(bucket, path) {
      if (!path) return null;
      if (/^(https?:|data:)/.test(path)) return path;
      const b = await getFile(path); return b ? URL.createObjectURL(b) : null;
    },

    async listOpenJobs() { return db.jobs.filter((j) => j.status === 'open' && jobVisible(j)).map(withSchool).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async getJob(id) { const j = db.jobs.find((x) => x.id === id); return j && jobVisible(j) ? withSchool(j) : null; },
    async listMyJobs() { return clone(db.jobs.filter((j) => j.school_id === uid())).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async saveJob(job) {
      await delay();
      if (role() !== 'school') throw new Error('Only school accounts can post jobs');
      if (job.id) { const j = db.jobs.find((x) => x.id === job.id); if (!j || j.school_id !== uid()) throw new Error('Not your listing'); }
      return upsert('jobs', { ...job, id: job.id || uuid(), school_id: uid() });
    },
    async deleteJob(id) { const j = db.jobs.find((x) => x.id === id); if (!j || j.school_id !== uid()) throw new Error('Not your listing'); db.jobs = db.jobs.filter((x) => x.id !== id); db.applications = db.applications.filter((a) => a.job_id !== id); save(); },

    async listTeachers() { if (!approvedSchool() && !isAdmin()) return []; return clone(db.teachers.filter((t) => t.status === 'approved')); },

    async listTeacherDirectory(full) {
      const approved = db.teachers.filter((t) => t.status === 'approved');
      if (full && (approvedSchool() || isAdmin())) return clone(approved);
      return approved.map((t) => {
        const parts = t.full_name.trim().split(/\s+/);
        return { id: t.id, full_name: parts[0] + (parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : ''), qualification: t.qualification,
          experience_years: t.experience_years, skills: t.skills, skills_other: t.skills_other, languages: t.languages, expected_salary: t.expected_salary,
          work_types: t.work_types, activities: t.activities, session_fee: t.session_fee, event_fee: t.event_fee, travel_km: t.travel_km,
          about: (t.about || '').slice(0, 280), has_video: !!(t.video_path || t.video_link),
          lat: t.lat == null ? null : Math.round(t.lat * 100) / 100, lng: t.lng == null ? null : Math.round(t.lng * 100) / 100, updated_at: t.updated_at, limited: true };
      });
    },

    async applyToJob(job_id, message = '') {
      await delay();
      if (!approvedTeacher()) throw new Error('Your profile needs to be verified before you can apply.');
      const ex = db.applications.find((a) => a.job_id === job_id && a.teacher_id === uid());
      if (ex) return upsert('applications', { ...ex, status: 'applied', message: message || ex.message });
      return upsert('applications', { id: uuid(), job_id, teacher_id: uid(), initiated_by: 'teacher', status: 'applied', message });
    },
    async inviteTeacher(job_id, teacher_id, status = 'invited') {
      await delay();
      if (!approvedSchool()) throw new Error('Your school needs to be verified first.');
      if (db.jobs.find((j) => j.id === job_id)?.school_id !== uid()) throw new Error('Not your listing');
      const ex = db.applications.find((a) => a.job_id === job_id && a.teacher_id === teacher_id);
      if (ex) return upsert('applications', { ...ex, status });
      return upsert('applications', { id: uuid(), job_id, teacher_id, initiated_by: 'school', status });
    },
    async setApplicationStatus(id, status) {
      const a = db.applications.find((x) => x.id === id); if (!a) throw new Error('Not found');
      const owns = db.jobs.find((j) => j.id === a.job_id)?.school_id === current?.id;
      if (!owns && a.teacher_id !== current?.id) throw new Error('Not allowed');
      if (!owns && !['applied', 'withdrawn'].includes(status)) throw new Error('Teachers can only apply or withdraw');
      return upsert('applications', { ...a, status });
    },
    async myApplications() {
      return db.applications.filter((a) => a.teacher_id === uid()).map((a) => ({ ...clone(a), job: db.jobs.find((j) => j.id === a.job_id) ? withSchool(db.jobs.find((j) => j.id === a.job_id)) : null }))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
    async schoolApplications() {
      const mine = new Set(db.jobs.filter((j) => j.school_id === uid()).map((j) => j.id));
      return db.applications.filter((a) => mine.has(a.job_id)).map((a) => {
        const j = db.jobs.find((x) => x.id === a.job_id);
        return { ...clone(a), job: { id: j.id, title: j.title, school_id: j.school_id }, teacher: clone(db.teachers.find((t) => t.id === a.teacher_id) || null) };
      }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },

    async adminList(kind) { if (!isAdmin()) throw new Error('Admins only'); return clone(kind === 'school' ? db.schools : db.teachers).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async adminSetStatus(kind, id, status, admin_note = null) {
      if (!isAdmin()) throw new Error('Admins only');
      const table = kind === 'school' ? 'schools' : 'teachers';
      const r = db[table].find((x) => x.id === id); return upsert(table, { ...r, status, admin_note });
    },
    async adminStats() {
      return { schools: db.schools.length, teachers: db.teachers.length, pendingS: db.schools.filter((s) => s.status === 'pending').length,
        pendingT: db.teachers.filter((s) => s.status === 'pending').length, jobs: db.jobs.filter((j) => j.status === 'open').length, apps: db.applications.length };
    },
    async adminJobs() { return db.jobs.map(withSchool); },
    resetDemo() { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); location.reload(); },
  };
  return api;
}
