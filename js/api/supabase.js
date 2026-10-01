// Supabase implementation of the Discover Teachers data API.
const SCHOOL_PUBLIC = 'id,name,phone,email,website,address,lat,lng,curriculum,bus_service,food_service,status';

export async function createSupabaseApi(url, key) {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  let current = null;

  const chk = ({ data, error }) => { if (error) throw new Error(friendly(error)); return data; };
  const uid = () => { if (!current) throw new Error('Please log in first'); return current.id; };

  async function loadUser(session) {
    if (!session?.user) { current = null; return null; }
    const { data } = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
    current = { id: session.user.id, email: session.user.email, role: data?.role || session.user.user_metadata?.role || 'teacher' };
    return current;
  }

  const api = {
    mode: 'supabase',
    async init() { const { data } = await sb.auth.getSession(); return loadUser(data.session); },
    user: () => current,
    onAuth(cb) { sb.auth.onAuthStateChange((evt, session) => { if (evt === 'SIGNED_OUT' || evt === 'SIGNED_IN' || evt === 'USER_UPDATED') setTimeout(async () => cb(await loadUser(session), evt), 0); if (evt === 'PASSWORD_RECOVERY') cb(current, evt); }); },

    async signUp({ email, password, role }) {
      const redirect = location.origin + location.pathname;
      const data = chk(await sb.auth.signUp({ email, password, options: { data: { role }, emailRedirectTo: redirect } }));
      if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('An account with this email already exists. Please log in.');
      if (data.session) { await loadUser(data.session); return { needsConfirm: false }; }
      return { needsConfirm: true };
    },
    async signIn({ email, password }) {
      const data = chk(await sb.auth.signInWithPassword({ email, password }));
      return loadUser(data.session);
    },
    async signOut() { await sb.auth.signOut(); current = null; },
    async resetPassword(email) { chk(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); },
    async updatePassword(password) { chk(await sb.auth.updateUser({ password })); },

    // ---- profiles ----
    async getSchool(id = uid()) { return chk(await sb.from('schools').select('*').eq('id', id).maybeSingle()); },
    async saveSchool(obj) { return chk(await sb.from('schools').upsert({ ...obj, id: uid() }).select().single()); },
    async getTeacher(id = uid()) { return chk(await sb.from('teachers').select('*').eq('id', id).maybeSingle()); },
    async saveTeacher(obj, aadhaar) {
      const t = chk(await sb.from('teachers').upsert({ ...obj, id: uid() }).select().single());
      if (aadhaar) chk(await sb.from('teacher_private').upsert({ teacher_id: uid(), aadhaar }));
      return t;
    },
    async getTeacherPrivate(id = uid()) { return chk(await sb.from('teacher_private').select('*').eq('teacher_id', id).maybeSingle()); },

    // ---- files ----
    async upload(bucket, file) {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${uid()}/${Date.now()}.${ext}`;
      chk(await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined }));
      return path;
    },
    async fileUrl(bucket, path) {
      if (!path) return null;
      const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 3600);
      return error ? null : data.signedUrl;
    },

    // ---- jobs ----
    async listOpenJobs() {
      return chk(await sb.from('job_listings').select(`*, school:schools(${SCHOOL_PUBLIC})`).eq('status', 'open').order('created_at', { ascending: false }));
    },
    async getJob(id) { return chk(await sb.from('job_listings').select(`*, school:schools(${SCHOOL_PUBLIC})`).eq('id', id).maybeSingle()); },
    async listMyJobs() { return chk(await sb.from('job_listings').select('*').eq('school_id', uid()).order('created_at', { ascending: false })); },
    async saveJob(job) {
      const row = { ...job, school_id: uid() };
      if (!row.id) delete row.id;
      return chk(await sb.from('job_listings').upsert(row).select().single());
    },
    async deleteJob(id) { chk(await sb.from('job_listings').delete().eq('id', id)); },

    // ---- teachers (school view) ----
    async listTeachers() { return chk(await sb.from('teachers').select('*').eq('status', 'approved').order('updated_at', { ascending: false })); },

    async listTeacherDirectory(full) {
      if (full) return chk(await sb.from('teachers').select('*').eq('status', 'approved').order('updated_at', { ascending: false }));
      return (chk(await sb.rpc('public_teacher_directory')) || []).map((r) => ({ ...r, full_name: r.display_name, limited: true }));
    },

    // ---- applications ----
    async applyToJob(job_id, message = '') {
      const existing = chk(await sb.from('applications').select('*').eq('job_id', job_id).eq('teacher_id', uid()).maybeSingle());
      if (existing) return chk(await sb.from('applications').update({ status: 'applied', message: message || existing.message }).eq('id', existing.id).select().single());
      return chk(await sb.from('applications').insert({ job_id, teacher_id: uid(), initiated_by: 'teacher', status: 'applied', message }).select().single());
    },
    async inviteTeacher(job_id, teacher_id, status = 'invited') {
      const existing = chk(await sb.from('applications').select('*').eq('job_id', job_id).eq('teacher_id', teacher_id).maybeSingle());
      if (existing) return chk(await sb.from('applications').update({ status }).eq('id', existing.id).select().single());
      return chk(await sb.from('applications').insert({ job_id, teacher_id, initiated_by: 'school', status }).select().single());
    },
    async setApplicationStatus(id, status) { return chk(await sb.from('applications').update({ status }).eq('id', id).select().single()); },
    async myApplications() {
      return chk(await sb.from('applications').select(`*, job:job_listings(*, school:schools(${SCHOOL_PUBLIC}))`).eq('teacher_id', uid()).order('updated_at', { ascending: false }));
    },
    async schoolApplications() {
      return chk(await sb.from('applications').select('*, job:job_listings!inner(id,title,school_id), teacher:teachers(*)').eq('job.school_id', uid()).order('updated_at', { ascending: false }));
    },

    // ---- admin ----
    async adminList(kind) { return chk(await sb.from(kind === 'school' ? 'schools' : 'teachers').select('*').order('created_at', { ascending: false })); },
    async adminSetStatus(kind, id, status, admin_note = null) {
      return chk(await sb.from(kind === 'school' ? 'schools' : 'teachers').update({ status, admin_note }).eq('id', id).select().single());
    },
    async adminStats() {
      const count = async (t, f) => { let q = sb.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); const { count: c } = await q; return c || 0; };
      const [schools, teachers, pendingS, pendingT, jobs, apps] = await Promise.all([
        count('schools'), count('teachers'), count('schools', (q) => q.eq('status', 'pending')), count('teachers', (q) => q.eq('status', 'pending')),
        count('job_listings', (q) => q.eq('status', 'open')), count('applications'),
      ]);
      return { schools, teachers, pendingS, pendingT, jobs, apps };
    },
    async adminJobs() { return chk(await sb.from('job_listings').select(`*, school:schools(${SCHOOL_PUBLIC})`).order('created_at', { ascending: false })); },
  };
  return api;
}

function friendly(e) {
  const m = e.message || String(e);
  if (/Invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/Email not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox for the link.';
  if (/row-level security/i.test(m)) return 'You don\'t have permission to do that (is your account verified yet?).';
  if (/duplicate key/i.test(m)) return 'That already exists.';
  if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return 'That file is too large.';
  if (/mime type/i.test(m)) return 'That file type isn\'t allowed.';
  return m;
}
