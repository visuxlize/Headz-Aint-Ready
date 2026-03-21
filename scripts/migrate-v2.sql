-- Dashboard UI: barber_profiles, blocked_times, appointment indexes
-- Run against your Supabase Postgres (SQL editor or psql).

CREATE TABLE IF NOT EXISTS barber_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  specialty text,
  bio text,
  instagram_handle text,
  average_rating numeric(3,2) DEFAULT 5.00 NOT NULL,
  review_count integer DEFAULT 0 NOT NULL,
  avatar_url text
);

INSERT INTO barber_profiles (user_id, specialty)
SELECT id, 'Cut Specialist' FROM users WHERE role = 'barber'
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS blocked_times (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text DEFAULT 'Block',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, date);
CREATE INDEX IF NOT EXISTS idx_blocked_times_barber_date ON blocked_times(barber_id, date);

-- RLS: enable and add policies in Supabase dashboard as needed
-- Barbers: own rows on blocked_times; Admins: full access

-- Square POS (see scripts/square-pos-integration.sql for full DDL)
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
