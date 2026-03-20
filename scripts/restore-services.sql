-- Restore original Headz services & pricing. Run in Supabase SQL Editor if you prefer SQL over `npm run restore:services`.

insert into services (name, slug, duration_minutes, price, category, display_order, is_active)
values
  ('Kids cut', 'kids-cut', 30, 20.00, 'kids', 0, true),
  ('Adult cut', 'adult-cut', 30, 30.00, 'adults', 1, true),
  ('Senior cut', 'senior-cut', 30, 25.00, 'seniors', 2, true)
on conflict (slug) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  price = excluded.price,
  category = excluded.category,
  display_order = excluded.display_order,
  is_active = true,
  updated_at = now();
