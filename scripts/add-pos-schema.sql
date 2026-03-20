-- POS + payments (run in Supabase SQL or via drizzle push after updating schema.ts)

alter table appointments
  add column if not exists tip_amount numeric(10, 2),
  add column if not exists payment_method text,
  add column if not exists payment_status text,
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists stripe_charge_id text;

create table if not exists pos_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  barber_id uuid not null references users (id) on delete cascade,
  service_id uuid references services (id) on delete set null,
  items jsonb,
  subtotal numeric(10, 2) not null,
  tip_amount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  payment_method text not null,
  payment_status text not null default 'paid',
  stripe_charge_id text,
  receipt_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pos_transactions_barber_id_idx on pos_transactions (barber_id);
create index if not exists pos_transactions_created_at_idx on pos_transactions (created_at desc);
