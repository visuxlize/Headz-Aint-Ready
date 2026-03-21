-- Fix blocked_times.barber_id foreign key to reference staff user id (public.users.id).
--
-- Prerequisite: table must exist. If you get "relation blocked_times does not exist",
-- run scripts/create-blocked-times.sql first.
--
-- If your table was created with barber_id → barbers(id), inserts from the app use
-- users.id (Supabase auth / staff id) and Postgres will reject them with a foreign key error.
--
-- Run in Supabase SQL editor (or psql) once.

-- 1) If barber_id currently points at barbers.id, rewrite values to barbers.user_id
UPDATE blocked_times bt
SET barber_id = b.user_id
FROM barbers b
WHERE bt.barber_id = b.id
  AND b.user_id IS NOT NULL;

-- 2) Replace FK to target users(id)
ALTER TABLE blocked_times DROP CONSTRAINT IF EXISTS blocked_times_barber_id_fkey;

ALTER TABLE blocked_times
  ADD CONSTRAINT blocked_times_barber_id_fkey
  FOREIGN KEY (barber_id) REFERENCES public.users (id) ON DELETE CASCADE;

-- Optional: if RLS was enabled without a policy for server-side inserts, adjust in Dashboard
-- or ensure DATABASE_URL uses a role that can insert (direct connection usually does).
