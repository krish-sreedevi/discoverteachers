-- =====================================================================
-- Discover Teachers — Supabase schema
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- It is safe to re-run: everything uses IF NOT EXISTS / OR REPLACE.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Profiles: one row per auth user, holds the role
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  role        text not null check (role in ('school','teacher','admin')),
  created_at  timestamptz not null default now()
);

-- New sign-ups get a profile automatically. Only 'school' or 'teacher'
-- can be self-selected; admins are promoted manually (see bottom of file).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.raw_user_meta_data->>'role' in ('school','teacher')
         then new.raw_user_meta_data->>'role' else 'teacher' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Helper functions (security definer so policies don't recurse)
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
-- Schools
-- ---------------------------------------------------------------------
create table if not exists public.schools (
  id                uuid primary key references public.profiles on delete cascade,
  name              text not null,
  contact_name      text,
  phone             text not null,
  email             text,
  year_established  int check (year_established between 1900 and 2100),
  avg_fees          int,             -- average annual fee in ₹
  curriculum        text,            -- e.g. 'Montessori', 'Own curriculum', or custom text
  num_students      int,
  age_min           numeric(3,1),
  age_max           numeric(3,1),
  website           text,
  bus_service       boolean not null default false,
  food_service      boolean not null default false,
  languages         jsonb not null default '[]',  -- [{language, proficiency}]
  address           text,
  lat               double precision,
  lng               double precision,
  maps_link         text,
  proof_path        text,            -- storage path in 'school-proofs'
  about             text,
  status            text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Teachers (+ private table for Aadhaar)
-- ---------------------------------------------------------------------
create table if not exists public.teachers (
  id                uuid primary key references public.profiles on delete cascade,
  full_name         text not null,
  phone             text not null,
  email             text,
  whatsapp          text,
  qualification     text,
  experience_years  numeric(4,1) not null default 0,
  experience        jsonb not null default '[]',  -- [{school, role, from, to, notes}]
  skills            text[] not null default '{}',
  skills_other      text,
  languages         jsonb not null default '[]',  -- [{language, proficiency}]
  expected_salary   int,                           -- ₹ per month
  address           text,
  lat               double precision,
  lng               double precision,
  maps_link         text,
  about             text,
  video_path        text,            -- storage path in 'teacher-videos'
  video_link        text,            -- or a YouTube / Drive link
  aadhaar_last4     text,
  status            text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.teacher_private (
  teacher_id  uuid primary key references public.teachers on delete cascade,
  aadhaar     text not null check (aadhaar ~ '^[0-9]{12}$')
);

-- Only admins may change status / admin_note; new rows always start pending.
create or replace function public.guard_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.admin_note := null;
    else
      new.status := old.status;
      new.admin_note := old.admin_note;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists schools_guard on public.schools;
create trigger schools_guard before insert or update on public.schools
  for each row execute function public.guard_status();
drop trigger if exists teachers_guard on public.teachers;
create trigger teachers_guard before insert or update on public.teachers
  for each row execute function public.guard_status();

create or replace function public.is_approved_school()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.schools where id = auth.uid() and status = 'approved')
$$;

create or replace function public.is_approved_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teachers where id = auth.uid() and status = 'approved')
$$;

create or replace function public.school_is_approved(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.schools where id = sid and status = 'approved')
$$;

-- ---------------------------------------------------------------------
-- Job listings
-- ---------------------------------------------------------------------
create table if not exists public.job_listings (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools on delete cascade,
  title             text not null,
  openings          int not null default 1 check (openings > 0),
  description       text,
  requirements      text,
  min_experience    numeric(4,1) not null default 0,
  salary_min        int,
  salary_max        int,
  timings           text,
  working_days      text,
  start_date        date,
  age_group         text,
  bus_provided      boolean not null default false,
  food_provided     boolean not null default false,
  languages         jsonb not null default '[]',
  skills_preferred  text[] not null default '{}',
  curriculum        text,
  address           text,
  lat               double precision,
  lng               double precision,
  status            text not null default 'open' check (status in ('open','closed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists job_listings_school_idx on public.job_listings (school_id);

create or replace function public.owns_job(jid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.job_listings where id = jid and school_id = auth.uid())
$$;

-- ---------------------------------------------------------------------
-- Applications / invitations
-- ---------------------------------------------------------------------
create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.job_listings on delete cascade,
  teacher_id    uuid not null references public.teachers on delete cascade,
  initiated_by  text not null check (initiated_by in ('teacher','school')),
  status        text not null check (status in ('applied','invited','shortlisted','interview','hired','rejected','withdrawn')),
  message       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (job_id, teacher_id)
);

-- Teachers may only move their own application to applied / withdrawn.
create or replace function public.guard_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.teacher_id = auth.uid() and not public.owns_job(new.job_id) then
    if new.status not in ('applied','withdrawn') then
      raise exception 'Teachers can only apply or withdraw';
    end if;
    new.job_id := old.job_id; new.teacher_id := old.teacher_id; new.initiated_by := old.initiated_by;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists applications_guard on public.applications;
create trigger applications_guard before update on public.applications
  for each row execute function public.guard_application();

-- Can the current school see this teacher? (approved teacher, or one who applied)
create or replace function public.teacher_visible_to_me(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_approved_school() and (
    exists (select 1 from public.teachers where id = tid and status = 'approved')
    or exists (select 1 from public.applications a join public.job_listings j on j.id = a.job_id
               where a.teacher_id = tid and j.school_id = auth.uid())
  )
$$;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.schools         enable row level security;
alter table public.teachers        enable row level security;
alter table public.teacher_private enable row level security;
alter table public.job_listings    enable row level security;
alter table public.applications    enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- schools: approved schools are public (their name shows on job posts)
drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools for select
  using (status = 'approved' or id = auth.uid() or public.is_admin());
drop policy if exists schools_insert on public.schools;
create policy schools_insert on public.schools for insert
  with check (id = auth.uid() and public.my_role() = 'school');
drop policy if exists schools_update on public.schools;
create policy schools_update on public.schools for update
  using (id = auth.uid() or public.is_admin());

-- teachers: visible to themselves, admins, and approved schools
drop policy if exists teachers_select on public.teachers;
create policy teachers_select on public.teachers for select
  using (id = auth.uid() or public.is_admin() or public.teacher_visible_to_me(id));
drop policy if exists teachers_insert on public.teachers;
create policy teachers_insert on public.teachers for insert
  with check (id = auth.uid() and public.my_role() = 'teacher');
drop policy if exists teachers_update on public.teachers;
create policy teachers_update on public.teachers for update
  using (id = auth.uid() or public.is_admin());

-- teacher_private: Aadhaar — only the teacher and admins
drop policy if exists tp_select on public.teacher_private;
create policy tp_select on public.teacher_private for select
  using (teacher_id = auth.uid() or public.is_admin());
drop policy if exists tp_insert on public.teacher_private;
create policy tp_insert on public.teacher_private for insert
  with check (teacher_id = auth.uid());
drop policy if exists tp_update on public.teacher_private;
create policy tp_update on public.teacher_private for update
  using (teacher_id = auth.uid());

-- job listings: open listings of approved schools are public
drop policy if exists jobs_select on public.job_listings;
create policy jobs_select on public.job_listings for select
  using ((status = 'open' and public.school_is_approved(school_id))
         or school_id = auth.uid() or public.is_admin());
drop policy if exists jobs_insert on public.job_listings;
create policy jobs_insert on public.job_listings for insert
  with check (school_id = auth.uid() and public.my_role() = 'school');
drop policy if exists jobs_update on public.job_listings;
create policy jobs_update on public.job_listings for update
  using (school_id = auth.uid() or public.is_admin());
drop policy if exists jobs_delete on public.job_listings;
create policy jobs_delete on public.job_listings for delete
  using (school_id = auth.uid() or public.is_admin());

-- applications
drop policy if exists apps_select on public.applications;
create policy apps_select on public.applications for select
  using (teacher_id = auth.uid() or public.owns_job(job_id) or public.is_admin());
drop policy if exists apps_insert on public.applications;
create policy apps_insert on public.applications for insert
  with check (
    (teacher_id = auth.uid() and initiated_by = 'teacher' and status = 'applied' and public.is_approved_teacher())
    or
    (initiated_by = 'school' and status in ('invited','shortlisted') and public.owns_job(job_id) and public.is_approved_school())
  );
drop policy if exists apps_update on public.applications;
create policy apps_update on public.applications for update
  using (teacher_id = auth.uid() or public.owns_job(job_id) or public.is_admin());

-- ---------------------------------------------------------------------
-- Storage buckets (private; files are served with short-lived signed URLs)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('school-proofs', 'school-proofs', false, 10485760,
     array['application/pdf','image/jpeg','image/png','image/webp']),
  ('teacher-videos', 'teacher-videos', false, 52428800,
     array['video/mp4','video/quicktime','video/webm','video/x-matroska','video/3gpp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files live under "<user id>/filename"
drop policy if exists dt_upload_own on storage.objects;
create policy dt_upload_own on storage.objects for insert to authenticated
  with check (bucket_id in ('school-proofs','teacher-videos')
              and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists dt_update_own on storage.objects;
create policy dt_update_own on storage.objects for update to authenticated
  using (bucket_id in ('school-proofs','teacher-videos')
         and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists dt_delete_own on storage.objects;
create policy dt_delete_own on storage.objects for delete to authenticated
  using (bucket_id in ('school-proofs','teacher-videos')
         and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists dt_read_proofs on storage.objects;
create policy dt_read_proofs on storage.objects for select to authenticated
  using (bucket_id = 'school-proofs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists dt_read_videos on storage.objects;
create policy dt_read_videos on storage.objects for select to authenticated
  using (bucket_id = 'teacher-videos'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or public.is_admin()
              or public.teacher_visible_to_me(((storage.foldername(name))[1])::uuid)));

-- =====================================================================
-- Make yourself admin: sign up on the site first (as teacher or school),
-- then run this with your email:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- =====================================================================
