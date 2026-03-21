-- Run in Supabase SQL Editor (or psql) if dashboard login redirects with ?error=unauthorized
-- Emails must match the account you use to sign in (lowercase).

INSERT INTO staff_allowlist (email) VALUES ('test@test.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_allowlist (email) VALUES ('barbertest@test.com')
ON CONFLICT (email) DO NOTHING;
