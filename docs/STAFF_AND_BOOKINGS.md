# Staff login & how bookings work

Quick reference for staff auth and the booking backend so you can extend it.

---

## Quick: How to get into staff login

You need a **Supabase user** (email + password) before you can sign in. Two ways:

### Option A – Create the user in Supabase (recommended)

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select your Headz project.
2. In the left sidebar go to **Authentication** → **Users**.
3. Click **“Add user”** → **“Create new user”**.
4. Enter an **email** and **password** (e.g. a staff email and a secure password). Click **Create user**.
5. On your site, go to **Staff login** (footer link) or open: **`http://localhost:3000/auth/login`**.
6. Enter that **same email and password** → **Sign In**. You’ll be redirected to the **dashboard** (`/dashboard`).

### Option B – Sign up on the site

1. Go to **`http://localhost:3000/auth/signup`**.
2. Enter **email**, **password**, and **confirm password** → **Create Account**.
3. If Supabase has “Confirm email” enabled, check the inbox and confirm, then sign in at `/auth/login`. Otherwise you may go straight to the dashboard.

After you’re in, use **Sign out** in the dashboard to log out.

---

## 1. Staff login – how it works

### Where staff sign in

- **URL:** `/auth/login` (linked from the site footer as “Staff login”).
- **Auth provider:** Supabase Auth (email + password). No social login by default.

### Flow

1. Staff goes to **Headz site → Footer → “Staff login”** (or directly to `/auth/login`).
2. They enter **email** and **password** in the form rendered by `app/auth/login/page.tsx`.
3. The form is the client component `components/auth/LoginForm.tsx`, which calls:
   - `supabase.auth.signInWithPassword({ email, password })`.
4. On success, the app **redirects to `/dashboard`** and refreshes.
5. **Sign out:** Dashboard layout has a “Sign out” button that POSTs to `/auth/signout`, which calls `supabase.auth.signOut()` and redirects to `/`.

### How the dashboard is protected

- **File:** `app/dashboard/layout.tsx`
- In that layout we:
  - Create a Supabase server client and call `supabase.auth.getUser()`.
  - If there’s an error or no user, we **redirect to `/auth/login`**.
- So every page under `/dashboard/*` (including `/dashboard` itself) is staff-only. No separate “role” check yet—any signed-in Supabase user can see the dashboard.

### Creating the first staff user

Supabase does not have a built-in “sign up” page. To create a staff account:

1. Open **Supabase Dashboard** → your project → **Authentication** → **Users**.
2. Click **“Add user”** (or “Invite user”) and enter the staff **email** and **password**.
3. That user can then go to your site’s `/auth/login` and sign in to reach `/dashboard`.

Optional: You can keep `app/auth/signup/page.tsx` and `SignupForm.tsx` for staff self-signup, or remove/restrict them (e.g. invite-only) if you prefer.

---

## 2. How bookings are placed (backend)

Bookings come from two places: **customers on the site** and **staff adding walk-ins** in the dashboard. Both hit the same API and same database table.

### Database

- **Table:** `appointments` (see `lib/db/schema.ts`).
- Important columns: `barber_id`, `service_id`, `client_name`, `client_phone`, `client_email`, `start_at`, `end_at`, `is_walk_in`, `status` (e.g. `confirmed`).

### API routes that handle bookings

| Route | Method | Who uses it | Purpose |
|-------|--------|-------------|---------|
| `app/api/appointments/route.ts` | **GET** | Dashboard (staff) | List appointments for a given **date** (query: `?date=YYYY-MM-DD`). **Requires auth** (staff only). |
| `app/api/appointments/route.ts` | **POST** | Public book page + Dashboard “Add walk-in” | **Create** one appointment. Body: `barberId`, `serviceId`, `durationMinutes`, `clientName`, `clientPhone?`, `clientEmail?`, `startAt`, `isWalkIn?`. No auth required for POST (so customers can book without an account). |
| `app/api/appointments/slots/route.ts` | **GET** | Public book page + Dashboard “Add walk-in” | **Available time slots** for a barber on a date. Query: `barberId`, `date`, `durationMinutes`. Returns an array of ISO start times within store hours (9am–8pm EST). |

### Customer booking flow (public)

1. **Page:** `app/(marketing)/book/page.tsx` – server component that loads **barbers** and **services** from the DB and passes them to `BookingFlow`.
2. **Component:** `components/booking/BookingFlow.tsx` – client component. Steps:
   - Service → Barber → Date (calendar) → Time (Morning/Afternoon/Evening) → Your info (name, phone, email).
3. When the user clicks “Confirm booking”:
   - **POST** to ` /api/appointments` with the selected barber, service, duration, client details, `startAt` (chosen slot), and `isWalkIn: false`.
4. The API in `app/api/appointments/route.ts` (POST) validates the body, then **inserts one row** into `appointments` and returns it.

### Staff “Add walk-in” flow

1. **Page:** `app/dashboard/page.tsx` – server component that loads **barbers**, **services**, and **today’s appointments** and passes them to `ScheduleView`.
2. **Component:** `components/dashboard/ScheduleView.tsx` – client component. It shows:
   - A date picker and “Refresh” to load that day’s appointments.
   - One card per **barber** with their appointments (time, client name, service; walk-ins labeled).
   - “Add walk-in” opens `WalkInForm`.
3. In **WalkInForm**, staff choose barber, service, client name/phone, and time (slots loaded from **GET** ` /api/appointments/slots`). On submit:
   - **POST** to ` /api/appointments` with `isWalkIn: true` (same body shape as customer booking).
4. After a successful POST, the dashboard **refetches** that day’s appointments (GET ` /api/appointments?date=...`) so the new walk-in appears in the right barber’s card.

### Where to change behavior

- **Who can create appointments:** Today, POST ` /api/appointments` does not require auth. To restrict creation to staff only, add a check in that POST handler (e.g. `supabase.auth.getUser()`) and return 401 if not signed in.
- **Who can list appointments:** GET ` /api/appointments` already requires auth (staff only).
- **Slots and store hours:** Slots are computed in `app/api/appointments/slots/route.ts` using 9am–8pm EST and 30‑minute increments; change that file to adjust hours or duration logic.
- **Data shape:** Edit `lib/db/schema.ts` for new fields (e.g. notes, statuses), then run migrations and update the API and UI.

---

## 3. Next steps you might take

- **Restrict booking creation:** Require auth for POST ` /api/appointments` and optionally allow unauthenticated only for a “public booking” path (e.g. with a shared secret or captcha).
- **Staff roles:** Store a “staff” or “admin” role (e.g. in `users` or Supabase custom claims) and check it in the dashboard layout and in GET/POST appointments.
- **Confirmations:** After inserting an appointment, call an email/SMS provider (e.g. Resend, Twilio) to send a confirmation to `client_email` or `client_phone`.
- **Editing/cancelling:** Add PATCH and DELETE handlers in `app/api/appointments/route.ts` (or under `app/api/appointments/[id]/route.ts`) and wire them from the dashboard.

If you tell me which of these you want first (e.g. “only staff can create appointments” or “email confirmation”), I can walk through the exact code changes next.
