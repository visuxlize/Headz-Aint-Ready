-- =============================================================================
-- Supabase: remove all staff auth users + app rows that reference them, then
-- recreate the two dev accounts from scripts/seed-dev-users.mjs:
--   Admin:  test@test.com       / 123456  (role admin)
--   Barber: barbertest@test.com / 123456  (role barber)
--
-- Run in: Supabase Dashboard → SQL Editor (as postgres / role).
--
-- WARNING:
-- - Deletes ALL appointments, POS transactions, availability, time-off requests,
--   barber time-off blocks, barbers, staff_allowlist, and public.users rows.
-- - Does NOT delete services, store_hours, or other catalog data.
-- - If auth INSERT fails (schema drift), run ONLY the DELETE portion here, then
--   from your machine: npm run seed:dev-users
-- - If DELETE auth.users fails (FK): try first: delete from auth.sessions; delete from auth.refresh_tokens;
-- - If INSERT fails on is_sso_user / is_anonymous: remove those two columns from both auth.users INSERTs.
-- - If DELETE auth.users fails (storage owner): remove Storage objects for that user in Dashboard, or see Supabase docs.
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Clear dependent rows (order: children → public.users → auth)
-- ---------------------------------------------------------------------------

delete from appointments;
delete from pos_transactions;
delete from availability;
update time_off_requests set reviewed_by = null where reviewed_by is not null;
delete from time_off_requests;
delete from barber_time_off;
delete from barbers;

delete from staff_allowlist;
delete from public.users;

-- Auth: children of auth.users are removed by ON DELETE CASCADE on most Supabase versions.
delete from auth.users;

-- ---------------------------------------------------------------------------
-- 2) Insert auth.users + auth.identities + public.users + staff_allowlist + barbers
--    Password for both: 123456
-- ---------------------------------------------------------------------------

-- --- Admin (test@test.com) ---
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_sso_user,
  is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'test@test.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Test Admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  false,
  false
);

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  provider_id
) values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'email', 'test@test.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now(),
  '11111111-1111-1111-1111-111111111111'
);

insert into public.users (id, email, full_name, role, is_active)
values (
  '11111111-1111-1111-1111-111111111111',
  'test@test.com',
  'Test Admin',
  'admin',
  true
);

insert into public.staff_allowlist (email) values ('test@test.com')
on conflict (email) do nothing;

-- --- Barber (barbertest@test.com) ---
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  is_sso_user,
  is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'barbertest@test.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Barber Test"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  false,
  false
);

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  provider_id
) values (
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  jsonb_build_object(
    'sub', '22222222-2222-2222-2222-222222222222',
    'email', 'barbertest@test.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now(),
  '22222222-2222-2222-2222-222222222222'
);

insert into public.users (id, email, full_name, role, is_active)
values (
  '22222222-2222-2222-2222-222222222222',
  'barbertest@test.com',
  'Barber Test',
  'barber',
  true
);

insert into public.staff_allowlist (email) values ('barbertest@test.com')
on conflict (email) do nothing;

insert into public.barbers (user_id, name, slug, email, is_active, sort_order)
values (
  '22222222-2222-2222-2222-222222222222',
  'Barber Test',
  'barber-test',
  'barbertest@test.com',
  true,
  99
);

commit;

-- Success: sign in at /auth/login with either account (password 123456).
