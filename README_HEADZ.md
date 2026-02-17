# Headz Ain't Ready – Barbershop site + internal booking

Queens, NYC barbershop: public site + staff dashboard for scheduling and walk-ins.

## What’s included

- **Public site**: Landing, services, team, prices, contact. Strong “Book now” CTAs.
- **Customer booking** (`/book`): Pick service → barber → date → time → name/phone. Books into the same system staff see.
- **Staff dashboard** (`/dashboard`): Day view of all barbers and appointments, add walk-ins so booked vs walk-in are in one place.

## Tech

- Next.js 15 (App Router), Supabase (auth + Postgres), Drizzle ORM, Tailwind.
- Staff sign in at `/auth/login` (Supabase email/password). No public signup required for customers (name/phone on booking).

## Setup

1. **Env**  
   Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (Supabase Postgres connection string)
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)

2. **DB**  
   From project root:
   ```bash
   npm run db:generate   # generate migration from schema
   npm run db:migrate    # apply to DB
   ```
   If `db:generate` fails (e.g. sandbox), run `scripts/headz-schema.sql` in the Supabase SQL Editor instead, then run `npm run db:migrate` or skip migrate if you only used the SQL file.

3. **Seed barbers + services** (optional)  
   In Supabase SQL Editor (or any Postgres client) run something like:

   ```sql
   INSERT INTO barbers (id, name, slug, sort_order) VALUES
     (gen_random_uuid(), 'Barber 1', 'barber-1', 0),
     (gen_random_uuid(), 'Barber 2', 'barber-2', 1);

   INSERT INTO services (id, name, slug, duration_minutes, price_cents, category, sort_order) VALUES
     (gen_random_uuid(), 'Kids cut', 'kids-cut', 30, 2000, 'kids', 0),
     (gen_random_uuid(), 'Adult cut', 'adult-cut', 30, 3000, 'adults', 1),
     (gen_random_uuid(), 'Senior cut', 'senior-cut', 30, 2500, 'seniors', 2);
   ```

4. **Run**  
   ```bash
   npm install
   npm run dev
   ```
   - Site: http://localhost:3000  
   - Book: http://localhost:3000/book  
   - Staff: http://localhost:3000/auth/login → then /dashboard  

Create a user in Supabase (Authentication → Users) to log in as staff.

## Design

- **Public**: Cream background, black header/footer, red CTAs. Copy pushes “skip the wait” and “book ahead.”
- **Dashboard**: Simple day view by barber; walk-ins labeled so staff can see who’s booked vs walk-in and reduce wait-time confusion.

## Next steps (you can add later)

- Barbers/services CRUD in dashboard.
- Email/SMS confirmations or reminders.
- Timezone handling (e.g. `America/New_York`) for slots.
- RLS policies in Supabase so only staff can read/write appointments if needed.
