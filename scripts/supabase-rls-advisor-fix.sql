-- supabase-rls-advisor-fix.sql — Headz Ain't Ready
-- Run in Supabase → SQL Editor after backup.
--
-- Enables Row Level Security on public tables that were missing it and adds policies
-- aligned with scripts/migrate-roles.sql (requires public.get_user_role()).
--
-- Server-side Drizzle (DATABASE_URL as postgres) bypasses RLS; these policies protect
-- PostgREST / anon / authenticated clients and clear “RLS Disabled in Public” in Advisor.
--
-- Prerequisite: scripts/migrate-roles.sql applied (get_user_role + users.role).

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: optional re-grant (Supabase defaults are usually fine)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- public.users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_admin_all ON public.users;
CREATE POLICY users_admin_all ON public.users
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- public.staff_allowlist — admin only
-- ---------------------------------------------------------------------------
ALTER TABLE public.staff_allowlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_allowlist_admin_all ON public.staff_allowlist;
CREATE POLICY staff_allowlist_admin_all ON public.staff_allowlist
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- public.barbers — public reads active; admin full; barbers may update own row
-- ---------------------------------------------------------------------------
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS barbers_public_select_active ON public.barbers;
CREATE POLICY barbers_public_select_active ON public.barbers
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS barbers_admin_all ON public.barbers;
CREATE POLICY barbers_admin_all ON public.barbers
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS barbers_barber_update_own ON public.barbers;
CREATE POLICY barbers_barber_update_own ON public.barbers
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() = 'barber'
    AND user_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'barber'
    AND user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- public.barber_day_modes — same ownership model as availability
-- ---------------------------------------------------------------------------
ALTER TABLE public.barber_day_modes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS barber_day_modes_barber_admin ON public.barber_day_modes;
CREATE POLICY barber_day_modes_barber_admin ON public.barber_day_modes
  FOR ALL
  TO authenticated
  USING (
    (
      public.get_user_role() = 'barber'
      AND barber_id = auth.uid()
    )
    OR public.get_user_role() = 'admin'
  )
  WITH CHECK (
    (
      public.get_user_role() = 'barber'
      AND barber_id = auth.uid()
    )
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS barber_day_modes_public_read ON public.barber_day_modes;
CREATE POLICY barber_day_modes_public_read ON public.barber_day_modes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- public.barber_time_off — FK to barbers.id; scope by barbers.user_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.barber_time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS barber_time_off_admin_all ON public.barber_time_off;
CREATE POLICY barber_time_off_admin_all ON public.barber_time_off
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS barber_time_off_barber_own ON public.barber_time_off;
CREATE POLICY barber_time_off_barber_own ON public.barber_time_off
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() = 'barber'
    AND EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.id = barber_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.get_user_role() = 'barber'
    AND EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.id = barber_id
        AND b.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- public.blocked_times — barber_id → users.id
-- ---------------------------------------------------------------------------
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blocked_times_admin_all ON public.blocked_times;
CREATE POLICY blocked_times_admin_all ON public.blocked_times
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS blocked_times_barber_own ON public.blocked_times;
CREATE POLICY blocked_times_barber_own ON public.blocked_times
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() = 'barber'
    AND barber_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'barber'
    AND barber_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- public.pos_transactions — barber_id → users.id
-- ---------------------------------------------------------------------------
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pos_transactions_admin_all ON public.pos_transactions;
CREATE POLICY pos_transactions_admin_all ON public.pos_transactions
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS pos_transactions_barber_own ON public.pos_transactions;
CREATE POLICY pos_transactions_barber_own ON public.pos_transactions
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() = 'barber'
    AND barber_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'barber'
    AND barber_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- public.square_devices — admin only (pairing secrets / device metadata)
-- ---------------------------------------------------------------------------
ALTER TABLE public.square_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS square_devices_admin_all ON public.square_devices;
CREATE POLICY square_devices_admin_all ON public.square_devices
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- public.store_hours — public read; admin writes
-- ---------------------------------------------------------------------------
ALTER TABLE public.store_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_hours_public_read ON public.store_hours;
CREATE POLICY store_hours_public_read ON public.store_hours
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS store_hours_admin_write ON public.store_hours;
CREATE POLICY store_hours_admin_write ON public.store_hours
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- public.barber_profiles — public read for active barbers; admin; barber owns row
-- ---------------------------------------------------------------------------
ALTER TABLE public.barber_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS barber_profiles_public_select ON public.barber_profiles;
CREATE POLICY barber_profiles_public_select ON public.barber_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.user_id = user_id
        AND b.is_active = true
    )
  );

DROP POLICY IF EXISTS barber_profiles_admin_all ON public.barber_profiles;
CREATE POLICY barber_profiles_admin_all ON public.barber_profiles
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS barber_profiles_barber_own ON public.barber_profiles;
CREATE POLICY barber_profiles_barber_own ON public.barber_profiles
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() = 'barber'
    AND user_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'barber'
    AND user_id = auth.uid()
  );

COMMIT;

-- After apply: re-run Supabase Advisor. Any remaining “RLS disabled” tables are likely
-- one-off objects; add them here in the same pattern.
