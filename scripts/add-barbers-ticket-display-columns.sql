-- Tickets admin UI only — does not change marketing/booking names.
-- Run in Supabase SQL editor if `ticket_display_*` columns are missing.

ALTER TABLE barbers ADD COLUMN IF NOT EXISTS ticket_display_name text;
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS ticket_display_avatar_url text;
