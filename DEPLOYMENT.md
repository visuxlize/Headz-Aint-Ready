# Deployment – Vercel

This project is deployed on **[Vercel](https://vercel.com)** (Next.js). API routes, cron jobs, and the database connection run on Vercel’s Node runtime.

## Prerequisites

- GitHub repo connected to Vercel
- Supabase project (auth + Postgres)

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production / Preview as needed):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `DATABASE_URL` | Yes | Postgres URI (Transaction pooler `6543` is fine for the app) |
| `CRON_SECRET` | **Yes (production)** | Secures `/api/cron/no-show-checker`. Generate: `openssl rand -hex 32` — must match what Vercel sends as `Authorization: Bearer …` |
| `DATABASE_URL_NON_POOLING` | Optional | Direct Postgres URL for one-off DDL (e.g. Tickets migration); see `.env.local.example` |
| `SUPABASE_SERVICE_ROLE_KEY` | If used | Server-only |

**Supabase Auth:** Add your production URL under **Authentication → URL Configuration** (Site URL + redirect URLs for `https://your-domain.vercel.app/**` and custom domain).

## Cron (no-show checker)

- Schedule is defined in **`vercel.json`**: hourly at minute `59` UTC; the handler only runs work when America/New_York is 23:59 (`app/api/cron/no-show-checker/route.ts`).
- Set **`CRON_SECRET`** in Vercel to a long random string (same value the platform uses for the cron `Authorization` header — Vercel injects `Bearer <CRON_SECRET>` when the env var is set).

## Build

Default Vercel settings work: **Framework Preset: Next.js**, build command `npm run build`, output managed by Next.js.

## Health check

After deploy, open `https://<your-deployment>/api/health` — expect `ok: true` when `DATABASE_URL` is valid and the DB is reachable.
