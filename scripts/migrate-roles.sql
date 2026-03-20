-- migrate-roles.sql — Headz Ain't Ready
-- Run in Supabase SQL Editor (or psql against DATABASE_URL) after backup.
-- Extends users with roles, reshapes services/appointments/availability, adds store_hours & time_off_requests,
-- creates get_user_role(), barber_appointments_view, and RLS policies.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Users: role column
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'barber';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'barber'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Barbers: link to auth user (nullable until staff accounts exist)
-- ---------------------------------------------------------------------------
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS barbers_user_id_unique ON public.barbers(user_id) WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Services: price (numeric) + display_order
-- ---------------------------------------------------------------------------
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price numeric(10, 2);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'price_cents'
  ) THEN
    UPDATE public.services
    SET
      price = (price_cents::numeric / 100.0),
      display_order = sort_order
    WHERE price IS NULL;
  END IF;
END $$;

UPDATE public.services SET price = COALESCE(price, 0) WHERE price IS NULL;

ALTER TABLE public.services ALTER COLUMN price SET NOT NULL;

ALTER TABLE public.services DROP COLUMN IF EXISTS price_cents;
ALTER TABLE public.services DROP COLUMN IF EXISTS sort_order;

-- ---------------------------------------------------------------------------
-- 4. Appointments: customer_* + date + time_slot + barber_id → users
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS date date;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS time_slot time;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS checked_off boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS no_show_acknowledged boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS waived_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS no_show_fee numeric(10, 2) NOT NULL DEFAULT 0;

UPDATE public.appointments SET customer_name = client_name WHERE customer_name IS NULL AND client_name IS NOT NULL;
UPDATE public.appointments SET customer_phone = client_phone WHERE customer_phone IS NULL AND client_phone IS NOT NULL;
UPDATE public.appointments SET customer_email = client_email WHERE customer_email IS NULL AND client_email IS NOT NULL;

UPDATE public.appointments
SET
  date = (start_at AT TIME ZONE 'America/New_York')::date,
  time_slot = (start_at AT TIME ZONE 'America/New_York')::time
WHERE date IS NULL AND start_at IS NOT NULL;

UPDATE public.appointments
SET status = 'pending'
WHERE status = 'confirmed';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE public.appointments ALTER COLUMN customer_name SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'date'
  ) THEN
    ALTER TABLE public.appointments ALTER COLUMN date SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'time_slot'
  ) THEN
    ALTER TABLE public.appointments ALTER COLUMN time_slot SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_barber_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'legacy_barber_id'
  ) THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN barber_id TO legacy_barber_id;
  END IF;
END $$;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS barber_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.appointments a
SET barber_id = b.user_id
FROM public.barbers b
WHERE a.legacy_barber_id = b.id AND a.barber_id IS NULL AND b.user_id IS NOT NULL;

-- Appointments whose barber row has no user_id cannot map to the new FK (barber_id → users).
-- Option A (before migrate): set barbers.user_id for each staff member, then re-run from the start in a fresh transaction if needed.
-- Option B: remove only those rows so the migration can finish (historical/test bookings).
DO $$
DECLARE
  orphan_count int;
BEGIN
  SELECT count(*) INTO orphan_count FROM public.appointments WHERE barber_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE NOTICE 'migrate-roles: deleting % appointment(s) with no linked barbers.user_id (cannot satisfy barber_id → users). To preserve them, stop, run UPDATE barbers SET user_id = ... WHERE id = ... matching auth users, then restore from backup and re-run.',
      orphan_count;
    DELETE FROM public.appointments WHERE barber_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.appointments ALTER COLUMN barber_id SET NOT NULL;

ALTER TABLE public.appointments DROP COLUMN IF EXISTS legacy_barber_id;

ALTER TABLE public.appointments DROP COLUMN IF EXISTS client_name;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS client_phone;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS client_email;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS start_at;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS end_at;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_status_check'
  ) THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
      CHECK (status IN ('pending', 'completed', 'no_show', 'cancelled'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. barber_availability → availability (barber_id → users, time columns)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.barber_availability') IS NOT NULL
     AND to_regclass('public.availability') IS NULL THEN
    ALTER TABLE public.barber_availability RENAME TO availability;
  END IF;
END $$;

ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.availability
SET
  start_time = make_time((start_minutes / 60)::int, (start_minutes % 60)::int, 0),
  end_time = make_time((end_minutes / 60)::int, (end_minutes % 60)::int, 0)
WHERE start_time IS NULL AND EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'availability' AND column_name = 'start_minutes'
);

ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS barber_availability_barber_id_fkey;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'availability' AND column_name = 'legacy_barber_id'
  ) THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'availability' AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE public.availability RENAME COLUMN barber_id TO legacy_barber_id;
  END IF;
END $$;

ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS barber_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.availability av
SET barber_id = b.user_id
FROM public.barbers b
WHERE av.legacy_barber_id = b.id AND av.barber_id IS NULL AND b.user_id IS NOT NULL;

DELETE FROM public.availability WHERE barber_id IS NULL;

ALTER TABLE public.availability ALTER COLUMN barber_id SET NOT NULL;

ALTER TABLE public.availability DROP COLUMN IF EXISTS legacy_barber_id;
ALTER TABLE public.availability DROP COLUMN IF EXISTS start_minutes;
ALTER TABLE public.availability DROP COLUMN IF EXISTS end_minutes;

CREATE UNIQUE INDEX IF NOT EXISTS availability_barber_day_window_unique
  ON public.availability (barber_id, day_of_week, start_time, end_time);

-- ---------------------------------------------------------------------------
-- 6. time_off_requests + store_hours
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_off_requests ADD COLUMN IF NOT EXISTS denial_reason text;

CREATE TABLE IF NOT EXISTS public.store_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_open boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS store_hours_day_unique ON public.store_hours(day_of_week);

-- ---------------------------------------------------------------------------
-- 7. Helper: role for current user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Barber-safe view (no phone/email)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.barber_appointments_view_rows()
RETURNS TABLE (
  id uuid,
  barber_id uuid,
  service_id uuid,
  customer_name text,
  appointment_date date,
  time_slot time,
  status text,
  checked_off boolean,
  no_show_fee numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.barber_id,
    a.service_id,
    a.customer_name,
    a.date,
    a.time_slot,
    a.status,
    a.checked_off,
    a.no_show_fee,
    a.created_at
  FROM public.appointments a
  WHERE a.barber_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.barber_appointments_view_rows() TO authenticated, service_role;

DROP VIEW IF EXISTS public.barber_appointments_view;
CREATE VIEW public.barber_appointments_view AS
SELECT * FROM public.barber_appointments_view_rows();

GRANT SELECT ON public.barber_appointments_view TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Row Level Security
-- ---------------------------------------------------------------------------

-- appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_admin_all ON public.appointments;
CREATE POLICY appointments_admin_all ON public.appointments
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS appointments_insert_public ON public.appointments;
CREATE POLICY appointments_insert_public ON public.appointments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS appointments_barber_update_own ON public.appointments;
CREATE POLICY appointments_barber_update_own ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role() = 'barber' AND barber_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'barber' AND barber_id = auth.uid());

-- Barbers must use barber_appointments_view (no direct SELECT on appointments for barber role).

-- time_off_requests
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS time_off_barber_insert ON public.time_off_requests;
CREATE POLICY time_off_barber_insert ON public.time_off_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'barber' AND barber_id = auth.uid());

DROP POLICY IF EXISTS time_off_barber_select_own ON public.time_off_requests;
CREATE POLICY time_off_barber_select_own ON public.time_off_requests
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'barber' AND barber_id = auth.uid());

DROP POLICY IF EXISTS time_off_admin_all ON public.time_off_requests;
CREATE POLICY time_off_admin_all ON public.time_off_requests
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS services_admin_all ON public.services;
CREATE POLICY services_admin_all ON public.services
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS services_public_select_active ON public.services;
CREATE POLICY services_public_select_active ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- availability
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS availability_barber_own ON public.availability;
CREATE POLICY availability_barber_own ON public.availability
  FOR ALL
  TO authenticated
  USING (
    (public.get_user_role() = 'barber' AND barber_id = auth.uid())
    OR public.get_user_role() = 'admin'
  )
  WITH CHECK (
    (public.get_user_role() = 'barber' AND barber_id = auth.uid())
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS availability_public_read ON public.availability;
CREATE POLICY availability_public_read ON public.availability
  FOR SELECT
  TO anon
  USING (is_active = true);

COMMIT;

-- Notes:
-- - Set admins: UPDATE public.users SET role = 'admin' WHERE email = 'you@example.com';
-- - Barbers must have barbers.user_id set for appointments & availability FKs.
-- - Server-side Drizzle often uses a DB role that bypasses RLS; policies apply to Supabase client (anon/auth).
