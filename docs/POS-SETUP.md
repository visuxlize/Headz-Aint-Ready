# POS, Stripe Terminal & receipts

## Database

Apply schema (new columns + `pos_transactions`):

```bash
# Option A: Drizzle
npm run db:push

# Option B: Supabase SQL Editor — run `scripts/add-pos-schema.sql`
```

## Environment variables

Add to `.env.local` and Netlify:

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API (`sk_live_…` / `sk_test_…`) |
| `STRIPE_TERMINAL_LOCATION_ID` | Terminal location ID (Dashboard → Terminal → Locations) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional; Terminal JS loads SDK; useful if you extend with Elements |
| `RESEND_API_KEY` | Receipt emails |
| `RESEND_FROM` | Verified sender, e.g. `Headz <receipts@yourdomain.com>` (Resend requires domain verification in production) |

`SUPABASE_SERVICE_ROLE_KEY` is already used elsewhere for server jobs; POS routes use the logged-in user session + Drizzle (no service role required for these API routes).

## Routes

- **Admin:** `/dashboard/pos`
- **Barber:** `/dashboard/barber/pos`

## Stripe Terminal (test)

1. Enable Terminal in the Stripe Dashboard and create a **Location**.
2. Use **simulated reader** (`discoverReaders({ simulated: true })`) — already wired in the POS.
3. Use test mode keys until you go live.

## Receipts

If `RESEND_API_KEY` is missing, the sale still completes; email is skipped and `receipt_sent_at` stays null when email fails.
