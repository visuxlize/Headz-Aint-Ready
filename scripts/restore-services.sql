-- Canonical Headz pricelist (9 rows — same as Feb 2026 marketing PRICE_LIST, commit 671a5b8).
-- Prefer `npm run restore:services` (reads lib/services/default-headz-services.json).
-- Run in Supabase SQL Editor if needed. Ensure `price_display_override` exists (add-price-display-override.sql).

INSERT INTO services (name, slug, description, duration_minutes, price, price_display_override, category, display_order, is_active)
VALUES
  ('Kids Haircut', 'kids-haircut', NULL, 30, 30.00, NULL, 'kids', 0, true),
  ('Shape Up', 'shape-up', NULL, 30, 20.00, NULL, 'adults', 1, true),
  ('Shape Up & Beard', 'shape-up-beard', NULL, 30, 30.00, NULL, 'adults', 2, true),
  ('Senior Citizens', 'senior-citizens', NULL, 30, 30.00, NULL, 'seniors', 3, true),
  ('Haircut Adult', 'haircut-adult', NULL, 30, 40.00, NULL, 'adults', 4, true),
  ('Haircut & Beard', 'haircut-beard', NULL, 30, 50.00, NULL, 'adults', 5, true),
  ('Haircut / Beard / Hot Towel', 'haircut-beard-hot-towel', NULL, 30, 55.00, NULL, 'adults', 6, true),
  ('Enhancement beard color black/brown', 'enhancement-beard-color', NULL, 30, 0.00, 'Price varies', 'add-ons', 7, true),
  ('Braids', 'braids', NULL, 30, 50.00, NULL, 'adults', 8, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  price = EXCLUDED.price,
  price_display_override = EXCLUDED.price_display_override,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  is_active = true,
  updated_at = now();
