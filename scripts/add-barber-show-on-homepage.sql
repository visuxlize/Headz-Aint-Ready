-- Run once against production/staging (Supabase SQL editor or psql).
-- Hides internal/test barbers from the public homepage and /book picker unless toggled in admin.

ALTER TABLE barbers ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT true;

UPDATE barbers SET show_on_homepage = false WHERE slug = 'barber-test' OR LOWER(TRIM(name)) = 'barber test';
