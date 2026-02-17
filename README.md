# Headz Ain't Ready – Barbershop Site & Staff Dashboard

A modern redesign and full-stack rebuild of **[Headz Ain't Ready](https://headzaintready.com/)** (Jackson Heights, Queens, NYC) — public marketing site, online booking, and staff-only dashboard.

---

## Reference: Current Live Site

**Existing site:** [https://headzaintready.com/](https://headzaintready.com/#)

The current site is the reference for brand, copy, and services. This repo is a **new design and implementation** that keeps the Headz identity while fixing limitations and adding a real backend.

---

## Why This New Design?

### Problems with the Current Site (headzaintready.com)

| Issue | Impact | How This Repo Addresses It |
|-------|--------|----------------------------|
| **No real online booking** | Customers can’t reserve a time; they rely on phone or walk-in. | **Full booking flow**: pick barber, service, date, and time slot. Slots respect barber availability and time off. |
| **No staff tools** | Scheduling and walk-ins are managed offline (paper/phone). | **Staff dashboard**: day view by barber, add walk-ins, see contact info, reschedule/cancel, export to calendar. |
| **No single source of truth** | Appointments live outside the site. | **Database-backed**: Supabase (PostgreSQL) for barbers, services, appointments, availability, and staff allowlist. |
| **Limited mobile experience** | Layout and touch targets could be better on phones/tablets. | **Responsive first**: viewport meta, Tailwind breakpoints (sm/md/lg), touch-friendly CTAs. Works on web, mobile, and iPad. |
| **No employee-only access** | If a “staff” area existed, anyone could try to access it. | **Staff allowlist**: only emails in `staff_allowlist` can use the dashboard; others are signed out with a clear message. |
| **Static or third-party CMS** | Hard to add features like availability rules or calendar export. | **Next.js + API routes**: server-side auth, slots API, calendar ICS export, and full control over UX. |

### What This Repo Delivers

- **Public site**  
  Hero (MTA/subway vibe, Queens branding), services, team, prices, contact, and a clear **Book** CTA that goes to a real booking flow.

- **Online booking**  
  Choose barber → service → date → time. Slots are driven by store hours, barber weekly availability, and time-off/sick days.

- **Staff dashboard** (employees only)  
  - Schedule view by barber with time blocks (open vs booked).  
  - Add walk-in with time picker.  
  - Click an appointment to see client email/phone, reschedule, or cancel.  
  - Dashboard home: booking counts (day/week/month) and peak hours.  
  - Barber availability and time-off management.  
  - Export next day’s appointments to ICS (e.g. Google Calendar).

- **Responsive**  
  Layout and typography scale for **web, mobile, and iPad** (viewport, breakpoints, and touch-friendly buttons/links).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Database** | Supabase (PostgreSQL) |
| **ORM** | Drizzle ORM |
| **Auth** | Supabase Auth (email/password); staff allowlist in DB |
| **Styling** | Tailwind CSS (Headz palette: black, red, cream) |
| **Language** | TypeScript |

---

## Running Locally

### Prerequisites

- Node.js 18+
- Supabase project (for auth + database)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/headz-aint-ready.git
cd headz-aint-ready
npm install
cp .env.example .env.local
```

Edit `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key  
- `DATABASE_URL` – PostgreSQL connection string (Supabase → Database → Connection string)

### Database

Create tables and (optionally) seed data:

```bash
node scripts/run-schema.mjs
```

Add staff emails so they can access the dashboard:

```sql
INSERT INTO staff_allowlist (email) VALUES ('you@example.com')
ON CONFLICT (email) DO NOTHING;
```

(Run in Supabase → SQL Editor.)

### Run

```bash
npm run dev
```

- **Public site:** [http://localhost:3000](http://localhost:3000)  
- **Book:** [http://localhost:3000/book](http://localhost:3000/book)  
- **Staff login:** [http://localhost:3000/auth/login](http://localhost:3000/auth/login) (only allowed emails can reach the dashboard)

---

## Deployment (Backend Required)

This app uses **Next.js server features** (API routes, server components, auth, database). It **cannot run as a static site on GitHub Pages**.

**Recommended: Netlify.** The backend (booking, DB, API routes) is set up to run on Netlify’s Next.js runtime. Use the same GitHub repo and env vars; see **`DEPLOY_NETLIFY.md`** for step-by-step instructions.

| Platform | Use it? | Notes |
|----------|--------|--------|
| **GitHub Pages** | ❌ No | Static only; no Node server, no API, no DB. |
| **Netlify** | ✅ Yes | Use “Next.js on Netlify”; add env vars in Netlify UI. See `DEPLOY_NETLIFY.md`. |

### Deploying on Netlify

1. Push this repo to GitHub (see “Pushing to GitHub” below).  
2. In [Netlify](https://app.netlify.com): **Add new site → Import from Git** and select the repo.  
3. **Build settings** (from `netlify.toml`): Build command `npm run build`; leave publish directory default.  
4. **Environment variables** (Site settings → Environment variables):  
   - `NEXT_PUBLIC_SUPABASE_URL`  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - `DATABASE_URL`  
5. Deploy. Your site URL will be `https://your-site-name.netlify.app` (or your custom domain).

Full walkthrough: **`DEPLOY_NETLIFY.md`**.

### What You Need for the Backend to Work

- **Supabase project** (same as local): Auth + Database.  
- **Env vars** set in Netlify: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`.  
- **Database**: Run the schema (and allowlist) in that Supabase project so production uses the same DB, or a separate one with the same schema.  
- **Staff allowlist**: Ensure production staff emails are in `staff_allowlist` in the DB you use in production.

---

## Pushing to GitHub

```bash
cd headz-aint-ready
git init
git add .
git commit -m "Headz Ain't Ready – new design, booking, staff dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/headz-aint-ready.git
git push -u origin main
```

Create the repo on GitHub first (e.g. `headz-aint-ready`), then use its URL in `git remote add origin`.

---

## Responsive: Web, Mobile, iPad

- **Viewport:** `width=device-width`, `initialScale=1`, `maximumScale=5` in the root layout.  
- **Breakpoints:** Tailwind `sm:`, `md:`, `lg:` used for hero, nav, booking flow, and dashboard (e.g. schedule table scrolls horizontally on small screens).  
- **Touch:** Buttons and links are sized for tap targets; forms and CTAs work on phones and tablets.  
- **Nav:** Header adapts (e.g. “Book” / “Book Now” on smaller screens); dashboard sidebar and main content reflow.

---

## Project Structure (High Level)

- `app/(marketing)/` – Public homepage, layout with header/footer.  
- `app/book/` – Booking flow (barber → service → date → time).  
- `app/dashboard/` – Staff-only dashboard (schedule, availability, home stats, calendar export).  
- `app/auth/` – Login, signup, signout (staff allowlist enforced in dashboard layout).  
- `app/api/` – Appointments, slots, barbers, calendar ICS, auth callback (if you add OAuth later).  
- `lib/db/` – Drizzle schema (barbers, services, appointments, availability, time-off, staff_allowlist).  
- `docs/` – Supabase and staff backend setup (env vars, DB, allowlist).

For full backend and DB setup, see **`docs/SUPABASE_STAFF_BACKEND_SETUP.md`**.

---

## License

Private / for Headz Ain't Ready. All rights reserved.
