-- Create blocked_times (schedule blocks: lunch, breaks, etc.)
-- Run once in Supabase → SQL Editor if you see: relation "blocked_times" does not exist
--
-- Requires public.users to exist (staff barber ids reference users.id).

CREATE TABLE IF NOT EXISTS public.blocked_times (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text DEFAULT 'Block',
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocked_times_barber_date ON public.blocked_times (barber_id, date);
