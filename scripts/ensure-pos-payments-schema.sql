-- Run once in Supabase SQL Editor if Payments / Devices APIs fail with missing relation or column errors.
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  barber_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments (id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  items jsonb,
  subtotal numeric(10, 2) NOT NULL,
  tip_amount numeric(10, 2) NOT NULL DEFAULT 0,
  total numeric(10, 2) NOT NULL,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'paid',
  stripe_charge_id text,
  square_payment_id text,
  square_terminal_checkout_id text,
  card_brand text,
  card_last_four text,
  refunded_at timestamptz,
  refund_reason text,
  refund_amount numeric(10, 2),
  receipt_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pos_transactions_barber_id_idx ON public.pos_transactions (barber_id);
CREATE INDEX IF NOT EXISTS pos_transactions_created_at_idx ON public.pos_transactions (created_at DESC);

ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments (id) ON DELETE SET NULL;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services (id) ON DELETE SET NULL;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS items jsonb;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS square_payment_id text;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS square_terminal_checkout_id text;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS card_brand text;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS card_last_four text;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS refund_amount numeric(10, 2);
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS square_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE,
  device_code_id text,
  device_name text NOT NULL DEFAULT 'Square Terminal',
  status text NOT NULL DEFAULT 'unpaired',
  paired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS square_devices_status_idx ON public.square_devices (status);
