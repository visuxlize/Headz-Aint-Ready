-- Run this in Supabase SQL Editor if npm run db:generate fails.
-- Creates barbers, services, appointments. (users table may already exist from starter.)

CREATE TABLE IF NOT EXISTS barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  avatar_url text,
  bio text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  duration_minutes integer NOT NULL,
  price_cents integer NOT NULL,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_walk_in boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional seed data (run after tables exist)
-- INSERT INTO barbers (name, slug, sort_order) VALUES ('Barber 1', 'barber-1', 0), ('Barber 2', 'barber-2', 1);
-- INSERT INTO services (name, slug, duration_minutes, price_cents, category, sort_order) VALUES
--   ('Kids cut', 'kids-cut', 30, 2000, 'kids', 0),
--   ('Adult cut', 'adult-cut', 30, 3000, 'adults', 1),
--   ('Senior cut', 'senior-cut', 30, 2500, 'seniors', 2);
