-- Optional: run in Supabase SQL Editor to restore barber rows + avatar URLs (same data as scripts/seed-headz-barbers.mjs).
-- Booking still requires each barber to have user_id → users (invite via admin dashboard).

insert into barbers (name, slug, avatar_url, sort_order, is_active)
values
  ('Louie Live', 'louie-live', 'https://headzaintready.com/wp-content/uploads/2023/02/LOUIELIVE.jpg', 0, true),
  ('Johan', 'johan', 'https://headzaintready.com/wp-content/uploads/2025/04/JOHAN.jpg', 1, true),
  ('King Rome', 'king-rome', 'https://headzaintready.com/wp-content/uploads/2023/02/ROME-1.jpg', 2, true),
  ('Jesus', 'jesus', 'https://headzaintready.com/wp-content/uploads/2023/02/JESUS.jpg', 3, true),
  ('Angel', 'angel', 'https://headzaintready.com/wp-content/uploads/2023/02/ANGEL.jpg', 4, true),
  ('Victor', 'victor', 'https://headzaintready.com/wp-content/uploads/2023/02/VICTOR.jpg', 5, true),
  ('Liseth', 'liseth', 'https://headzaintready.com/wp-content/uploads/2025/04/Liseth.jpg', 6, true),
  ('Carlos', 'carlos', 'https://headzaintready.com/wp-content/uploads/2023/02/CARLOS.jpg', 7, true)
on conflict (slug) do update set
  name = excluded.name,
  avatar_url = excluded.avatar_url,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
