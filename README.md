# Discover Teachers

A recruitment platform for preschools: schools register and get verified, post jobs, and find verified teachers nearby by distance, experience, salary, languages and skills. Teachers build one profile (with an optional teaching video) and apply or get invited.

Live at **https://www.aksreedevi.in/discoverteachers/**

## Features

- **Schools:** register with proof of establishment and map location, get verified, post jobs (autofilled from the school profile), and filter candidates by distance, experience, pay, languages, skills and teaching video.
- **Job types:** full-time or part-time class teacher, regular **extracurricular** classes (paid per session), and **one-time events/workshops** (with an event date and total fee).
- **Browse teachers:** everyone can browse class teachers, extracurricular instructors (yoga, dance, art, pottery, music, karate, chess…) and event performers. Visitors see a privacy-safe preview (first name + initial, location rounded to ~1 km, no contact details); verified schools see full profiles, contact details and videos.
- **Teachers:** one profile covering what work they want (class / extracurricular / events), how far from home they will travel, activities, fees, experience, languages, Aadhaar (checked, never shown to schools) and an optional teaching video.
- **Admin:** verifies schools and teachers.

## How it's built

- Static site (plain HTML/CSS/JS modules, no build step) hosted on GitHub Pages.
- [Supabase](https://supabase.com) for login, database and file storage (proof documents, teaching videos).
- Maps: Leaflet + OpenStreetMap (no API key). Schools and teachers can also paste a Google Maps link; every location has an "Open in Google Maps" link.
- Until Supabase keys are added to `js/config.js`, the site runs in **demo mode**: sample data stored only in the visitor's browser.
  Demo logins (password `demo1234`): `sunshine@demo.in` (school), `priya@demo.in` (teacher), `admin@demo.in` (admin).

## Going live with Supabase (about 10 minutes)

1. Create a free project at supabase.com (region: Mumbai).
2. **SQL Editor → New query**: paste all of `supabase/schema.sql` and run it. It creates the tables, security rules and the two private storage buckets.
3. **Authentication → URL Configuration**: set *Site URL* to `https://www.aksreedevi.in/discoverteachers/` and add the same URL under *Redirect URLs*.
4. (Optional) **Authentication → Providers → Email**: turn off "Confirm email" if you want people to sign up without clicking an email link.
5. **Project Settings → API**: copy the *Project URL* and the *anon public* key into `js/config.js`, commit and push.
6. Sign up on the site with your own email, then in the SQL Editor run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   Log in at `#/admin/login` to approve schools and teachers.

Updating an existing Supabase project after pulling new code? Just run `supabase/schema.sql` again — it's safe to re-run and adds any new columns.

## Who can see what (enforced by Row Level Security)

| Data | Visible to |
|---|---|
| Aadhaar number | The teacher and admins only |
| Teacher profile, contact, video | The teacher, admins, and **verified** schools |
| Teacher preview in Browse teachers (first name + initial, skills, activities, fees, ~1 km location) | Everyone |
| School proof of establishment | The school and admins only |
| Open job listings of verified schools | Everyone |
| Applications | The teacher, the school that owns the job, admins |

New schools and teachers start as *pending*; only admins can change status.

## Files

```
index.html            page shell
css/app.css           styles
js/config.js          Supabase keys (empty = demo mode)
js/app.js             router, header, session
js/api/               supabase.js (live), local.js + seed.js (demo)
js/views/             home, auth, profile forms, school, teacher, jobs, admin
js/lib/               helpers: DOM, maps/distance, Aadhaar (Verhoeff) + phone validation
supabase/schema.sql   database, security rules, storage buckets
assets/               logo, favicon, social image
```
