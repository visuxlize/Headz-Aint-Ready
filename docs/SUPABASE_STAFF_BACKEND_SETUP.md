# Staff Backend – Supabase & Data Setup

Everything required to run the staff side: dashboard, scheduling, availability, calendar export, and booking that respects barber availability.

---

## 1. Supabase environment variables

Put these in `.env.local` (never commit real values to git).

| Variable | Where to get it | Required for |
|----------|-----------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** | Staff login, auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → **anon public** key | Staff login, auth |
| `DATABASE_URL` | Supabase → Project Settings → **Database** → Connection string → **URI** | All staff features (dashboard, appointments, availability, slots) |

Optional:

| Variable | Where to get it | Use |
|----------|-----------------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** key | Server-only admin (e.g. syncing Auth → `users` table) |
| `NEXT_PUBLIC_APP_URL` | Your app URL | Callbacks (e.g. `http://localhost:3000` in dev) |

**Database URI format:**

```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Or the direct connection (no pooler):

```
postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres
```

- Replace `[YOUR-PASSWORD]` with the database password you set when creating the project (or reset in Database → Database password).
- If the password has special characters, URL-encode them (e.g. `%26` for `&`).

---

## 1.5 Staff-only access (employee allowlist)

Only people whose **email is in the staff allowlist** can use the dashboard. Random sign-ups cannot access `/dashboard`.

- **Add an employee:** Insert their email (lowercase) into the `staff_allowlist` table. In **Supabase → SQL Editor** run:
  ```sql
  INSERT INTO staff_allowlist (email) VALUES ('employee@example.com')
  ON CONFLICT (email) DO NOTHING;
  ```
- **Remove access:** `DELETE FROM staff_allowlist WHERE email = 'former@example.com';`
- New staff must **sign up** (or have an account) with that email, then **sign in**. After sign-in, the dashboard layout checks the allowlist and signs them out with “You don’t have access” if the email isn’t listed.

---

## 2. Database tables (full SQL)

Run this in **Supabase → SQL Editor** if you prefer to create tables by hand. Otherwise use the project’s script (see section 4).

```sql
-- Core tables (create in order because of foreign keys)

CREATE TABLE IF NOT EXISTS barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  avatar_url text,
  email text,
  bio text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  duration_minutes integer NOT NULL,
  price_cents integer NOT NULL,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_walk_in boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Staff: barber availability (recurring weekly hours)
CREATE TABLE IF NOT EXISTS barber_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_minutes integer NOT NULL,
  end_minutes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Staff: time off / sick days
CREATE TABLE IF NOT EXISTS barber_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text NOT NULL DEFAULT 'time_off',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: app users (e.g. for profile API; staff auth is Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add email to barbers if you added the table before this column existed
DO $$ BEGIN
  ALTER TABLE barbers ADD COLUMN IF NOT EXISTS email text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
```

---

## 3. Table reference (what each table is for)

| Table | Purpose |
|-------|--------|
| **barbers** | Barbers shown on site and in dashboard. `slug` unique (e.g. `barber-1`). `email` used for calendar/schedule emails. `sort_order` for display order. |
| **services** | Services (Kids cut, Adult cut, etc.). `duration_minutes`, `price_cents`, `category` (`kids` / `adults` / `seniors`) used by booking and slots. |
| **appointments** | Every booking or walk-in. `start_at` / `end_at` timestamptz; `status`: `confirmed`, `completed`, `cancelled`, `no_show`. |
| **barber_availability** | Recurring weekly hours per barber. `day_of_week`: 0 = Sunday … 6 = Saturday. `start_minutes` / `end_minutes` from midnight (e.g. 540 = 9:00, 1200 = 20:00). If no row for a day, app treats barber as available all store hours that day. |
| **barber_time_off** | Date ranges when a barber is off. `type`: `time_off`, `sick`, `other`. Slots API excludes these days. |
| **users** | Optional; can mirror Supabase Auth users for profile (e.g. `/api/profile`). |

**Store hours (hardcoded in app):** 9:00–20:00 (9am–8pm) in `lib/site-config.ts`. Availability and slots are clipped to this range.

---

## 4. How to create tables (two options)

**Option A – Script (uses `DATABASE_URL` from `.env.local`):**

```bash
node scripts/run-schema.mjs
```

This creates `barbers`, `services`, `appointments`, `barber_availability`, `barber_time_off` and, if empty, seeds 2 barbers and 3 services.

**Option B – Supabase SQL Editor:**

1. Supabase Dashboard → **SQL Editor**.
2. Paste the SQL from **section 2** and run it.
3. Manually insert barbers and services, or run your own seed script.

---

## 5. Staff login (Supabase Auth)

Staff use **Supabase Auth**; there is no separate “staff” table. Anyone with an Auth account can hit the dashboard if you don’t add extra checks.

- **Create a staff user:** Supabase → **Authentication** → **Users** → **Add user** (email + password), or use the app’s signup page at `/auth/signup`.
- **Login:** `/auth/login` → then redirect to `/dashboard`.

No RLS is required for the app’s current pattern: the Next.js server uses `createClient()` (with cookies) and `DATABASE_URL` (server-side). All staff routes and APIs check `supabase.auth.getUser()` and only then run DB queries with the server-side Postgres client.

---

## 6. Seed data (optional)

Minimal seed so the dashboard and booking have something to show:

```sql
-- Only if tables are empty
INSERT INTO barbers (name, slug, sort_order) VALUES
  ('Barber 1', 'barber-1', 0),
  ('Barber 2', 'barber-2', 1);

INSERT INTO services (name, slug, duration_minutes, price_cents, category, sort_order) VALUES
  ('Kids cut', 'kids-cut', 30, 2000, 'kids', 0),
  ('Adult cut', 'adult-cut', 30, 3000, 'adults', 1),
  ('Senior cut', 'senior-cut', 30, 2500, 'seniors', 2);
```

For production, use your real barbers and services (and optionally run a seed script that matches `lib/site-config.ts` / your price list).

---

## 7. Checklist

- [ ] Supabase project created.
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`.
- [ ] Database tables created (script or SQL from section 2).
- [ ] At least one barber and one service in the DB.
- [ ] At least one Auth user (Supabase Dashboard or `/auth/signup`).
- [ ] Login at `/auth/login` and open `/dashboard` to confirm dashboard, schedule, availability, and “Send to calendars” work.

After that, staff-side backend (availability, scheduling, calendar export, dashboard stats) is ready to use.
