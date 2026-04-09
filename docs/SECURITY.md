# Security — Headz Ain't Ready

This document complements code-level controls. **Supabase Auth** hashes passwords (you do not implement bcrypt in app code). Configure the rest in the Supabase dashboard and your host.

## Supabase Auth (dashboard)

- **Email confirmations**: Authentication → Providers → Email → require email confirmation before session is fully trusted for sensitive actions (if you add customer accounts later).
- **Password strength**: Enable minimum length / leaked-password protection if offered in your project tier.
- **Sessions / JWT**: Adjust JWT expiry under Project Settings → Auth (shorter access token + refresh rotation reduces stolen-token window).
- **Password reset**: Supabase reset links are time-limited; keep redirect URLs allowlist strict (Site URL + Redirect URLs).

## Secrets

- Never prefix service keys with `NEXT_PUBLIC_`. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` belong in the browser.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, payment and webhook secrets are **server-only**.
- Run `git grep -E "sk_|SERVICE_ROLE|secret_key|apikey" -- .` before commits; fix any hits outside `.env.example`.

## Database

- Prefer **Transaction pooler** + **SSL**; do not expose Postgres to `0.0.0.0`. Supabase default is private to their network + your credentials.
- **RLS**: Run `scripts/migrate-roles.sql` then `scripts/supabase-rls-advisor-fix.sql` so Advisor stays green. Server Drizzle uses a role that bypasses RLS; policies constrain PostgREST / client SDK misuse.

## Application

- **IDOR**: API routes must scope by `auth.uid()` / role (`requireStaffApi`, `requireBarberApi`, `requireAdminApi`) before reads/writes. Prefer `WHERE resource_id = $id AND owner_id = auth.uid()` in updates.
- **`requireBarberUserId`**: `lib/staff/barber-scope.ts` — non-admins may only pass their own staff `users.id` as POS/Squire `barberId`. Admin/dashboard calendar routes intentionally use `requireAdminApi` or scoped queries.
- **Rate limits**: In-memory limits in `lib/security/rate-limit.ts` apply to selected routes; for multi-instance production use **Redis** (e.g. Upstash) or an edge firewall (Cloudflare, Vercel WAF).
- **Logging**: `lib/security/security-log.ts` emits structured `console.warn` lines — ship to your log aggregator and alert on `event: "idor_blocked"` / `"rate_limit"`.

## Transport

- Enforce **HTTPS** at the edge (Vercel/Netlify default). `Strict-Transport-Security` is set in production via `next.config.js` and `middleware.ts`.

## Abuse / bots

- Add **CAPTCHA** (Turnstile/hCaptcha) on public booking if spam appears.
- **Vercel / Netlify** bot protection and geographic rules for anomaly traffic.
