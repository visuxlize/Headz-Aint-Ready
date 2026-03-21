-- Square POS integration — run in Supabase SQL Editor once.
-- See docs in repo for SQUARE_* env vars.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS square_payment_id text,
  ADD COLUMN IF NOT EXISTS square_terminal_checkout_id text;

ALTER TABLE pos_transactions
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS square_payment_id text,
  ADD COLUMN IF NOT EXISTS square_terminal_checkout_id text,
  ADD COLUMN IF NOT EXISTS card_brand text,
  ADD COLUMN IF NOT EXISTS card_last_four text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric(10, 2);

CREATE TABLE IF NOT EXISTS square_devices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text UNIQUE,
  device_code_id text,
  device_name text NOT NULL DEFAULT 'Square Terminal',
  status text NOT NULL DEFAULT 'unpaired',
  paired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS square_devices_status_idx ON square_devices (status);
