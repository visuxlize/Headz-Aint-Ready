# POS, Square Terminal & receipts

Card-present payments use **Square** (Terminal API + optional webhooks). Stripe has been removed from this app.

## Database

Apply schema (`pos_transactions`, `square_devices`, etc.):

```bash
# Option A: Drizzle
npm run db:push

# Option B: Supabase SQL Editor — run `scripts/add-pos-schema.sql` and `scripts/ensure-pos-payments-schema.sql` / `scripts/square-pos-integration.sql` as needed
```

## Environment variables

Add to `.env.local` and your host (e.g. Netlify). See root **`.env.example`** for a template.

| Variable | Purpose |
|----------|---------|
| `SQUARE_ACCESS_TOKEN` | **Required.** Sandbox or Production access token from [Square Developer](https://developer.squareup.com/) → *Applications* → your app → *Credentials*. |
| `SQUARE_LOCATION_ID` | **Required** for pairing a Terminal and recording cash against a location. **Locations** in [Square Dashboard](https://squareup.com/dashboard/) or Locations API — ID often starts with `L`. |
| `SQUARE_ENVIRONMENT` | Optional. Set to `production` for live; otherwise Sandbox is used. |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Optional. For verifying `POST /api/square/webhook` in production. |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | Must match the webhook URL configured in Square **exactly** (e.g. `https://your-domain.com/api/square/webhook`). |
| `RESEND_API_KEY` | Optional. Receipt emails. |
| `RESEND_FROM` | Verified sender, e.g. `Headz <receipts@yourdomain.com>` |

POS API routes use the logged-in staff session + Drizzle (no Supabase service role required for normal flows).

## Routes

- **Square Terminal pairing (admin):** `/dashboard/settings/devices` (legacy `/dashboard/pos` redirects here)
- **Barber schedule:** `/dashboard/barber` (legacy `/dashboard/barber/pos` redirects here)

## Square Terminal (test)

1. Create a **Sandbox** application and access token in Square Developer.
2. Create or pick a **Sandbox location**; copy its **Location ID** into `SQUARE_LOCATION_ID`.
3. Pair a physical Terminal or use Sandbox flows from the Devices page.

## Receipts

If `RESEND_API_KEY` is missing, the sale can still complete; email is skipped when sending fails.
