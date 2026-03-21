# Phase 2 — Payments & Stripe Connect (spec only)

This document describes a future sprint. No Phase 2 application code is implied by this file.

## 1. Overview and Goals

**Phase 1 (current)** covers public booking, staff dashboards, roster placeholders, no-show policy acknowledgment, in-shop POS UI patterns, and server-side appointment/transaction writes via API routes.

**Phase 2** adds **card-on-file for online booking**, **automated deposit / no-show capture** using Stripe, **shop payouts via Stripe Connect**, and **richer POS reconciliation** (refunds, SMS receipts, Terminal tips).

**Why Stripe Connect vs standard Stripe**

- A single-platform Stripe account charges the shop’s customers but deposits to **one** bank account. That works for a solo operator.
- **Stripe Connect (Standard)** lets each shop (or franchise location) **onboard once**, own their Stripe account, and receive payouts directly while the platform can still take an application fee if needed. It matches multi-location or “white-label” growth without commingling funds in one merchant account.

## 2. Stripe Connect Setup

- **Account type:** Standard Connect.
- **Onboarding:** Admin opens `/dashboard/settings/payments` and completes **Stripe OAuth** (Connect onboarding).
- **After onboarding:** Persist `connected_account_id` (Stripe account id) in a new `shop_settings` row.
- **Charges:** PaymentIntents and Terminal sessions specify `transfer_data.destination` or `on_behalf_of` (exact API shape to be chosen in implementation) so funds settle to the **connected** account.
- **Webhooks:** `POST /api/stripe/webhooks` — handle at minimum:

  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `charge.refunded`
  - `charge.dispute.created`
  - `account.updated` (Connect onboarding / requirements)
  - `terminal.reader.action_failed` (if using Terminal)

  Exact handlers depend on whether deposits use manual capture, Connect application fees, and idempotency keys.

## 3. Online Booking Deposits and No-Show Charges

- **At booking:** Collect a card with **Stripe Elements**; create a **PaymentIntent** with `capture_method: 'manual'`, amount = deposit (or full prepay — product decision).
- **Storage:** Store `payment_intent_id` on `appointments` (new column).
- **On barber check-off / completed visit:** **Cancel** the PaymentIntent so the customer is not charged (or capture $0 if product requires a different flow).
- **On no-show:** **Capture** the PaymentIntent for **20% of service price** (or the agreed policy), aligned with existing `no_show_fee` logic.
- **Waived fees:** If an admin waives a fee after capture, create a **Refund** via Stripe and record it in `refunds`.
- **UI:** Booking confirmation step includes Elements + clear copy on when the card is charged.
- **Users:** Add `stripe_customer_id` on `users` (or a dedicated `customers` table) for returning card-on-file.

## 4. In-Shop POS Enhancements (Phase 2)

- Route **Terminal** card-present charges to the **connected** account.
- Use **native tip on Terminal** where supported instead of only app-level tip math.
- **SMS receipts** via Twilio in addition to email (Resend or other).
- **Refund** action from an admin transaction detail view, calling Stripe Refunds API and updating local `transactions` / `refunds`.

## 5. Database Changes Needed

```sql
-- appointments: booking deposit / capture lifecycle
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_payment_intent_id text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_captured_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_refunded_at timestamptz;

-- users: Stripe Customer for saved payment methods
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- shop / Connect
CREATE TABLE IF NOT EXISTS shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connected_account_id text UNIQUE,
  onboarded_at timestamptz
);

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  reason text,
  stripe_refund_id text,
  created_at timestamptz DEFAULT now()
);
```

RLS and policies must be added to match the rest of the app (admin-only writes, minimal reads).

## 6. New Environment Variables

| Variable | Where to get | Used by |
|----------|----------------|---------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | Server: PaymentIntents, Connect, webhooks verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same | Client: Elements, Terminal init |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Signing secret | `POST /api/stripe/webhooks` |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect settings | OAuth to Connect |
| `TWILIO_ACCOUNT_SID` | Twilio Console | SMS receipts (optional) |
| `TWILIO_AUTH_TOKEN` | Twilio Console | Server only |
| `TWILIO_FROM_NUMBER` | Twilio phone numbers | Outbound SMS |

Existing: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

## 7. New API Routes (illustrative)

| Method | Path | Purpose | Who |
|--------|------|---------|-----|
| POST | `/api/stripe/connect/oauth/callback` | Complete Connect onboarding | Admin |
| POST | `/api/booking/payment-intent` | Create manual-capture PI for deposit | Public booking (validated) |
| POST | `/api/stripe/webhooks` | Stripe events | Stripe servers |
| POST | `/api/admin/refunds` | Issue refund | Admin |
| POST | `/api/receipts/sms` | Send SMS receipt | Admin / server |

Exact shapes depend on Phase 2 UX.

## 8. Suggested Build Order

1. `shop_settings` + admin settings UI stub (read-only connected account status).
2. Connect OAuth + store `connected_account_id`.
3. Webhook endpoint + signature verification + idempotent event log.
4. `stripe_customer_id` + Elements on booking + `deposit_payment_intent_id` on appointments.
5. Check-off and no-show jobs: cancel vs capture deposit PI.
6. Terminal charges against connected account + `transactions` reconciliation.
7. Refunds table + admin refund flow.
8. SMS receipts.

## 9. Estimated Complexity

| Piece | Size | Note |
|-------|------|------|
| Connect OAuth + shop_settings | **M** | OAuth redirect and secure storage |
| Booking deposit PI + Elements | **L** | UX, validation, failure paths |
| Webhooks + idempotency | **M** | Correctness under retries |
| No-show / check-off capture logic | **M** | Ties to existing appointment states |
| Terminal + Connect | **L** | Hardware and test modes |
| Refunds + admin UI | **S–M** | Straightforward once charges exist |
| SMS (Twilio) | **S** | Template + opt-in compliance |

---

*End of Phase 2 payments specification.*
