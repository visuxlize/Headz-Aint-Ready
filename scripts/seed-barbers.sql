-- Optional: run in Supabase SQL Editor — same roster as scripts/seed-headz-barbers.mjs.
-- Booking/tickets still need barbers.user_id → public.users (invite via Admin → Staff / Barbers).

insert into barbers (name, slug, avatar_url, sort_order, is_active)
values
  ('Victor Zambrano', 'victor-zambrano', 'https://headzaintready.com/wp-content/uploads/2023/02/VICTOR.jpg', 0, true),
  ('Matthew Mirabella', 'matthew-mirabella', null, 1, true),
  ('Luis Benites', 'luis-benites', null, 2, true),
  ('Liseth Calderon', 'liseth-calderon', 'https://headzaintready.com/wp-content/uploads/2025/04/Liseth.jpg', 3, true),
  ('Jesus Theodoro', 'jesus-theodoro', 'https://headzaintready.com/wp-content/uploads/2023/02/JESUS.jpg', 4, true),
  ('Jerome Glenn', 'jerome-glenn', null, 5, true),
  ('David Fernandez', 'david-fernandez', null, 6, true),
  ('Carlos Principal', 'carlos-principal', 'https://headzaintready.com/wp-content/uploads/2023/02/CARLOS.jpg', 7, true),
  ('Angle Miranda', 'angle-miranda', 'https://headzaintready.com/wp-content/uploads/2023/02/ANGEL.jpg', 8, true)
on conflict (slug) do update set
  name = excluded.name,
  avatar_url = coalesce(excluded.avatar_url, barbers.avatar_url),
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
