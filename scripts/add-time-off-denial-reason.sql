-- Run against Supabase / postgres if not using drizzle migrate
ALTER TABLE public.time_off_requests ADD COLUMN IF NOT EXISTS denial_reason text;
