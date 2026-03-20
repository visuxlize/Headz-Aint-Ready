ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS no_show_acknowledged boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS waived_at timestamptz;
