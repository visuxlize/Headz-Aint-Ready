-- Required for Admin → Tickets (manual walk-in sales): adds roster-only barber link + nullable staff FK.
-- Run the full script once in Supabase → SQL Editor, then reload the Tickets page.
-- Idempotent: safe to re-run (IF NOT EXISTS / IF EXISTS guards).
--
-- Manual tickets can reference barbers.id without a linked Staff (users) row.

ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS barber_profile_id uuid REFERENCES barbers(id) ON DELETE SET NULL;

ALTER TABLE pos_transactions ALTER COLUMN barber_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS pos_transactions_barber_profile_id_idx ON pos_transactions (barber_profile_id);

-- Required for Drizzle `pos_transactions.source` on inserts (manual tickets, POS, Squire).
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
