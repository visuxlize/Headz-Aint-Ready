-- If staff_allowlist was created without created_at, Drizzle inserts still work, but older full SELECTs failed.
-- Run in Supabase SQL Editor if you see errors about column "created_at" on staff_allowlist.

ALTER TABLE public.staff_allowlist
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
