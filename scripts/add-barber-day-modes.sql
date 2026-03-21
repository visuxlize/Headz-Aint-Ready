-- Per-day schedule mode (N/A, Open = shop hours, Custom = intervals in availability table)
CREATE TABLE IF NOT EXISTS barber_day_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  mode text NOT NULL CHECK (mode IN ('unavailable', 'open', 'custom')),
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS barber_day_modes_barber_day ON barber_day_modes (barber_id, day_of_week);
