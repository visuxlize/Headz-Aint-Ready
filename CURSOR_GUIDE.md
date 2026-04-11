# Headz Ain't Ready — Cursor Prompts & Development Guide

---

## ACTIVE PROMPT 4: Ticket System + EOD Reports + Dashboard Revamp

Paste the entire block below into Cursor's composer.

```
You are working on the Headz Ain't Ready barbershop website — Next.js 14 App Router, Tailwind CSS, Drizzle ORM (PostgreSQL), Supabase Auth. Color palette: headz-red (#C41E3A), headz-black (#111 / #0c0c0c), headz-cream (#f5f0e8), headz-gray (#6b7280). Dashboard background: #FAFAF8. No Framer Motion — all animations use CSS keyframes defined in app/globals.css and Tailwind transition classes. Lucide-react is installed for icons. All dashboard pages are admin-only (requireAdminApi / requireAdmin guards already exist).

Read every existing file before editing it. Run npx tsc --noEmit after all changes and fix every error.

---

## CONTEXT — WHAT EXISTS

The `posTransactions` table (lib/db/schema.ts) already stores POS sales with: id, customerName, barberId (→ users.id), serviceId, items (jsonb), subtotal, tipAmount, total, paymentMethod ('cash'|'card'), paymentStatus, squarePaymentId, cardBrand, cardLastFour, refundedAt, createdAt.

The `barbers` table stores public profiles (name, avatarUrl, sortOrder). The `users` table stores staff with role='barber'.

`posTransactions.barberId` references `users.id` — not `barbers.id`. When displaying barber names, join to `users.fullName`.

The existing payments page reads from posTransactions. The existing reports page reads from appointments. Both need to be updated to include posTransactions ticket data.

---

## TASK 1 — DB SCHEMA: add `source` column to posTransactions

Read lib/db/schema.ts. In the posTransactions table definition, add one new column after `squareTerminalCheckoutId`:

  source: text('source').notNull().default('manual'),

Valid values: 'manual' (admin entered), 'squire' (Squire webhook mirror), 'pos' (POS terminal).

Then run: npx drizzle-kit generate && npx drizzle-kit migrate
(If the migration command is different in package.json, use the correct one from the scripts field.)

---

## TASK 2 — KEYFRAME ANIMATIONS (add to app/globals.css)

Read app/globals.css first. Append these keyframes at the end of the file:

@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(196, 30, 58, 0); }
  50%       { box-shadow: 0 0 0 8px rgba(196, 30, 58, 0.12); }
}
@keyframes progressFill {
  from { width: 0%; }
  to   { width: var(--progress-target); }
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

Add Tailwind utility classes in @layer utilities:
  .animate-count-up    { animation: countUp    0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .animate-slide-right { animation: slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .animate-slide-up    { animation: slideInUp   0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .animate-pulse-glow  { animation: pulseGlow  2s ease-in-out infinite; }
  .animate-fade-slide  { animation: fadeSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }

---

## TASK 3 — ANIMATED NUMBER COUNTER HOOK (CREATE)

Create lib/hooks/useAnimatedCounter.ts:

'use client'
import { useEffect, useRef, useState } from 'react'

export function useAnimatedCounter(target: number, duration = 600): number {
  const [value, setValue] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const from = prev.current
    const diff = target - from
    if (diff === 0) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + diff * eased)
      if (t < 1) requestAnimationFrame(tick)
      else { setValue(target); prev.current = target }
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

---

## TASK 4 — API: GET/POST /api/dashboard/tickets (CREATE)

Create app/api/dashboard/tickets/route.ts:

GET — returns today's tickets (posTransactions where createdAt >= today midnight) plus running totals.
POST — creates a new posTransactions row with source='manual'.

### GET handler
Query posTransactions for today (midnight to now, America/New_York — use UTC offset aware bounds):
  - Join to users on barberId to get barber fullName
  - Return: { tickets: Ticket[], totals: { cash: number, card: number, count: number, byBarber: BarberTotal[] } }

Ticket shape:
  { id, customerName, barberName, barberId, serviceName: string|null (from items[0].name or null), total: number, tipAmount: number, paymentMethod, createdAt: string, source }

BarberTotal shape:
  { barberId, barberName, cash: number, card: number, tickets: number, total: number }

### POST handler
Body: { barberId: string, customerName: string, paymentMethod: 'cash'|'card', amount: number, tipAmount?: number, serviceLabel?: string }
Validate: barberId required, amount > 0, paymentMethod in ['cash','card'].
Insert into posTransactions:
  customerName (default 'Walk-in' if empty),
  barberId,
  items: serviceLabel ? [{ serviceId: '', name: serviceLabel, price: amount.toFixed(2) }] : null,
  subtotal: amount,
  tipAmount: tipAmount ?? 0,
  total: amount + (tipAmount ?? 0),
  paymentMethod,
  paymentStatus: 'paid',
  source: 'manual'
Return the new row + updated totals.

---

## TASK 5 — API: DELETE /api/dashboard/tickets/[id] (CREATE)

Create app/api/dashboard/tickets/[id]/route.ts:
DELETE — soft-delete by setting paymentStatus = 'voided'. Admin only. Return { ok: true }.

---

## TASK 6 — TICKET ENTRY PAGE (CREATE)

Create app/dashboard/(admin)/tickets/page.tsx as a server component shell.
Create components/dashboard/TicketsPageClient.tsx as the 'use client' component.

### Layout (TicketsPageClient)

The page has 3 zones:

ZONE A — Running Totals Banner (sticky top of content area, not the shell header):
  Three animated stat cards in a row (responsive: 3 cols on sm+, stacked on xs):
  Card 1 — CASH TODAY:      green accent (bg-emerald-950/60 border-emerald-500/20 text-emerald-400)
  Card 2 — CARD TODAY:      blue accent  (bg-blue-950/60   border-blue-400/20   text-blue-300)
  Card 3 — TICKETS TODAY:   red accent   (bg-headz-red/10   border-headz-red/20   text-headz-red)

  Each card shows:
  - Label in text-xs uppercase tracking-widest
  - Value using useAnimatedCounter (formatted as $X,XXX.XX for money, integer for count)
  - Small sparkline bar at the bottom (3px tall strip, just decorative, 70% filled with accent color, 30% faded)
  - On value change: apply animate-count-up with animation-key={Math.round(value)} to trigger replay

  These values re-fetch every 30 seconds using setInterval.

ZONE B — Two-column grid (grid-cols-1 lg:grid-cols-[420px_1fr] gap-6):

  LEFT COLUMN — Ticket Entry Form:
  Heading: "Add Ticket" font-bold text-lg text-headz-black
  Card: rounded-2xl border border-black/[0.08] bg-white shadow-sm p-6 space-y-5

  [Barber Selector]
  Label: "Who's cutting?" text-xs uppercase tracking-wider text-headz-gray mb-2
  Render one pill button per barber (from a barbers prop fetched server-side):
    Default: border border-black/10 rounded-full px-4 py-2 text-sm text-headz-gray hover:border-headz-red/40 transition
    Selected: bg-headz-red text-white border-headz-red rounded-full px-4 py-2 text-sm font-semibold animate-pulse-glow
  Barbers displayed as avatar+name pills horizontally (flex-wrap gap-2).
  Avatar: 24×24 rounded-full object-cover, or initials circle if no avatar.

  [Service / Amount]
  Label: "Service & Amount"
  Two inputs side by side (grid-cols-[1fr_120px] gap-3):
    Left: text input placeholder "e.g. Fade, Shape Up…" (serviceLabel)
    Right: number input placeholder "0.00" prefixed with "$" (amount) — text-right font-mono text-lg

  [Tip Amount — collapsible]
  A small "＋ Add Tip" link that expands to show a tip input (number, prefixed "$").
  When tip is entered, show it below in a small "Tip: $X.XX" badge.

  [Payment Method Toggle]
  Two large toggle buttons side by side, full width:
    CASH button: when selected → bg-emerald-600 text-white font-bold rounded-xl
    CARD button: when selected → bg-blue-600 text-white font-bold rounded-xl
    Default (neither): border-2 border-black/10 text-headz-gray rounded-xl
    Height: py-4. Both span equal width (grid-cols-2 gap-3).
    CASH shows: 💵 CASH label. CARD shows: 💳 CARD label. Use lucide-react Banknote + CreditCard icons instead of emoji.

  [Customer Name — optional]
  Small input "Customer name (optional)" text-sm. Defaults to "Walk-in".

  [Add Ticket Button]
  Full-width. Loading state (spinner + "Adding…"). Success state (green checkmark flash for 1.5s then reset form).
  Default: bg-headz-red hover:bg-headz-redDark text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl shadow-md shadow-headz-red/20 transition-all
  Disabled when: no barber selected, amount <= 0, no payment method.

  Below the button: a small note in text-xs text-headz-gray: "Tickets are recorded to the daily report."

  RIGHT COLUMN — Today's Ticket List:
  Heading: "Today — {format(new Date(), 'EEEE MMMM d')}" + ticket count badge (rounded-full bg-headz-red/10 text-headz-red px-2 py-0.5 text-xs font-semibold)
  Search: input "Search barber or customer…" with a search icon, filters the list client-side.

  Ticket list (reverse-chronological, newest first):
  Each ticket row (animate-fade-slide with staggered animation-delay: 0ms, 40ms, 80ms... capped at 300ms):
  ┌──────────────────────────────────────────────────────────┐
  │ [Avatar/initials 36px] [Name + Barber]   [CASH/CARD pill] │
  │                        [Service label]   [$XX.XX + tip?]  │
  │                                          [time ago]  [×]  │
  └──────────────────────────────────────────────────────────┘
  - CASH pill: bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full px-2 py-0.5
  - CARD pill: bg-blue-100 text-blue-700 same style
  - Void (×) button: text-headz-gray/40 hover:text-headz-red transition, on click → DELETE /api/dashboard/tickets/[id] → remove from list with a fade-out animation
  - "time ago": use date-fns formatDistanceToNow
  - On newly added ticket: animate-slide-right applied to the new row

  If no tickets yet: empty state with a scissors icon (Scissors from lucide-react, text-4xl text-headz-red/20) and "No tickets yet today. Add the first one."

ZONE C — End of Day Summary (full width, below the two-column zone):
  Section heading: "End of Day Summary" in font-bold text-xl + current date
  Card: rounded-2xl border border-black/[0.08] bg-white shadow-sm overflow-hidden

  Top row — 3 big animated metric blocks (grid-cols-3 divide-x divide-black/5):
    Block 1: TOTAL CASH — useAnimatedCounter, text-4xl font-black text-emerald-600, formatted as $X,XXX.XX
    Block 2: TOTAL CARD — useAnimatedCounter, text-4xl font-black text-blue-600
    Block 3: GRAND TOTAL — useAnimatedCounter, text-4xl font-black text-headz-red
  Each block has a small label above (text-xs uppercase tracking-wider text-headz-gray) and is padded py-6 px-5.

  Cash vs Card progress bar (full width):
  A 2-segment horizontal bar, 8px tall, rounded-full, transition-all duration-700:
    Left segment: bg-emerald-500 (cash %)
    Right segment: bg-blue-500 (card %)
  Below bar: "Cash: $X · Card: $X · {cashPct}% / {cardPct}%"

  Per-Barber Breakdown Table:
  Heading: "Breakdown by Barber" text-sm font-semibold text-headz-black mb-3
  Table: w-full text-sm
  Headers: Barber | Tickets | Cash | Card | Tips | Total — text-xs uppercase tracking-wider text-headz-gray border-b
  Rows (sorted by total desc):
    - Barber: avatar circle (32px) + name
    - Tickets: integer badge (rounded-full bg-headz-black/5 px-2 text-xs)
    - Cash: text-emerald-600 font-semibold
    - Card: text-blue-600 font-semibold
    - Tips: text-headz-gray
    - Total: text-headz-black font-bold
  Row entry animation: animate-fade-slide with stagger

  Footer row: totals row in bold, bg-headz-black/[0.02] border-t.

  "Print Summary" ghost button bottom-right (no functionality needed — just a UI placeholder for future).

---

## TASK 7 — UPDATE DashboardNav.tsx

Read components/dashboard/DashboardNav.tsx. Add "Tickets" as the SECOND item (after Overview, before Schedule):

  import { ReceiptText } from 'lucide-react'
  { href: '/dashboard/tickets', label: 'Tickets', icon: ReceiptText }

Final nav order:
  1. Overview      → /dashboard
  2. Tickets       → /dashboard/tickets       ← NEW
  3. Schedule      → /dashboard/schedule
  4. Payments      → /dashboard/payments
  5. Reports       → /dashboard/reports
  6. Staff Profiles → /dashboard/settings/staff
  7. Squire Settings → /dashboard/settings/squire

---

## TASK 8 — OVERVIEW DASHBOARD REVAMP

Read components/dashboard/AdminOverviewTab.tsx and components/dashboard/AdminDashboardClient.tsx in full.

Replace AdminOverviewTab with a complete revamp. The new overview is a beautiful command-center dashboard.

### Structure (AdminOverviewTab.tsx — full rewrite)

'use client'

Fetches: GET /api/dashboard/overview (already exists), GET /api/dashboard/tickets (new), GET /api/dashboard/reports?start=today&end=today

Loading state: 3 skeleton cards + 2 skeleton rows (use existing Skeleton component).
Error state: red pill with retry button.

#### Section 1 — Hero Stat Row
4 cards in a grid (grid-cols-2 lg:grid-cols-4 gap-4) with animate-slide-up stagger (delay 0, 60, 120, 180ms):

Card 1 — CASH TODAY
  Icon: Banknote (lucide) in bg-emerald-500/15 rounded-xl p-2.5
  Value: $X,XXX.XX (useAnimatedCounter, text-2xl font-black text-emerald-600)
  Label: "Cash today"
  Trend: tiny bar showing cash as % of daily total

Card 2 — CARD TODAY
  Icon: CreditCard (lucide) in bg-blue-500/15 rounded-xl p-2.5
  Value: $X,XXX.XX (useAnimatedCounter, text-2xl font-black text-blue-600)
  Label: "Card today"
  Trend: tiny bar

Card 3 — TICKETS TODAY
  Icon: ReceiptText (lucide) in bg-headz-red/15 rounded-xl p-2.5
  Value: integer count (useAnimatedCounter no decimal)
  Label: "Tickets today"
  Sub: "X cash · X card" in text-xs text-headz-gray

Card 4 — ACTIVE BARBERS
  Icon: Users (lucide) in bg-purple-500/15 rounded-xl p-2.5
  Value: integer count
  Label: "Active barbers"
  Sub: date formatted as "Mon Apr 14" text-xs text-headz-gray

Card style: rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm hover:shadow-md transition-shadow

#### Section 2 — Squire Command Center Card
Full-width card: rounded-2xl overflow-hidden (no border, uses gradient)
Background: bg-gradient-to-br from-headz-black via-[#1a0a0d] to-headz-black
Content (flex justify-between items-center px-7 py-6):
  Left:
    Small label: "POWERED BY SQUIRE" text-xs tracking-[0.2em] text-headz-red/80 uppercase mb-1
    Heading: "Manage Appointments & Staff" text-xl font-bold text-white
    Sub: "Live scheduling, availability, and client management live in Squire." text-sm text-white/50 mt-1
  Right: two buttons stacked (flex-col gap-2 sm:flex-row):
    "Open Squire Admin →" bg-headz-red hover:bg-headz-redDark text-white font-bold text-sm px-6 py-3 rounded-xl → href="https://app.getsquire.com" target="_blank"
    "Add Ticket" border border-white/20 text-white hover:bg-white/5 text-sm px-6 py-3 rounded-xl → href="/dashboard/tickets"

#### Section 3 — Two-column lower section (grid-cols-1 lg:grid-cols-2 gap-5)

LEFT — Today's Ticket Activity:
  Heading: "Today's Tickets" + "View all →" link to /dashboard/tickets
  Show last 5 tickets from GET /api/dashboard/tickets (newest first).
  Each row: avatar/initials + customer name + barber name + payment method pill + amount
  Same styling as the ticket list rows from Task 6 but compact (py-2 not py-3).
  If none: "No tickets recorded yet today." in text-sm text-headz-gray italic.

RIGHT — Barber Performance Today:
  Heading: "Barber Totals" + "Full report →" link to /dashboard/reports
  Show byBarber from GET /api/dashboard/tickets.
  Each barber row: initials circle (32px bg-headz-red/10 text-headz-red) + name + right-aligned total
  Mini cash/card bar (4px, emerald=cash, blue=card) below the name — width based on proportion
  Sort by total desc.
  If no data: "No sales recorded yet." text-sm text-headz-gray italic.

#### Section 4 — Quick Nav Cards (grid-cols-2 sm:grid-cols-4 gap-3)
Heading: "Jump to" text-xs uppercase tracking-wider text-headz-gray mb-3

4 mini nav cards (rounded-xl border border-black/[0.07] bg-white p-4 hover:border-headz-red/30 hover:shadow-sm transition-all cursor-pointer group):
  1. "Tickets"  icon=ReceiptText → /dashboard/tickets
  2. "Payments" icon=DollarSign  → /dashboard/payments
  3. "Reports"  icon=TrendingUp  → /dashboard/reports
  4. "Squire"   icon=ExternalLink → https://app.getsquire.com (target _blank)

Each card: icon in rounded-lg bg-black/5 group-hover:bg-headz-red/10 group-hover:text-headz-red p-2 mb-2, then label in text-sm font-medium text-headz-black.

---

## TASK 9 — PAYMENTS PAGE REDESIGN

Read app/dashboard/payments/page.tsx in full.

Redesign it to be the historical ledger — all transactions from posTransactions, not just today.

### Key changes:

1. Rename page title to "Payment History" (was "Payments").

2. Replace the subtitle "Payments processed through Squire POS" with a tab bar:
   Two tabs: "All Transactions" | "Manual Tickets"
   - "All Transactions": shows all posTransactions (current behavior)
   - "Manual Tickets": filters where source='manual' (manually entered via tickets page)
   Tab styling: pill tabs (not underline). Active: bg-headz-red text-white rounded-full px-4 py-1.5 text-sm font-semibold. Inactive: text-headz-gray hover:text-headz-black px-4 py-1.5 text-sm.

3. Summary cards at top (keep the today/week/month pattern but simplify to 3 cards):
   - Today: $X total (X cash / X card)
   - This Week: $X total
   - This Month: $X total
   Card style: rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm. Total in text-2xl font-black. Cash/card breakdown in text-xs text-headz-gray.

4. Cash vs Card bar: keep the existing bar but widen it (max-w-full instead of max-w-lg), make it 10px tall, and add animated width transition (transition-all duration-700).

5. Transaction table — redesign the columns:
   Remove: "Subtotal" column (keep total only).
   Reorder: Time | Barber | Customer | Service | Method | Total | Status | Actions
   - "Service" column: show items[0].name if items exist, else "—"
   - "Barber" column: show barber name (join through barberId → users)
   - Method badge: CASH → bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 text-xs font-semibold. CARD → bg-blue-100 text-blue-700 same. Add card brand + last4 below if present.
   - Source badge (small, secondary): if source='manual', show "manual" in text-headz-gray/50 text-[10px] below the method badge.
   - Total: text-headz-black font-bold tabular-nums. If tip > 0, show "+$X.XX tip" below in text-xs text-headz-gray.
   - Status: keep existing StatusBadge component.
   - Actions: Void button (replaces refund for manual tickets, calls DELETE /api/dashboard/tickets/[id]). Refund button for card transactions. External Squire link icon → https://app.getsquire.com/payments.

6. Add date range picker to filters:
   Alongside the existing method/barber/search filters, add:
   From date input (type="date") and To date input (type="date") with defaults of today.
   Pass as ?from=YYYY-MM-DD&to=YYYY-MM-DD to the API (already supported).

7. Export CSV button (top right, next to Refresh):
   On click: download a CSV of current filtered transactions.
   Columns: Date, Time, Barber, Customer, Service, Method, Subtotal, Tip, Total, Status.
   Use client-side CSV generation (build a data: URI, no server endpoint needed).

---

## TASK 10 — REPORTS PAGE: FEED FROM TICKETS

Read app/dashboard/(admin)/reports/page.tsx in full.
Read app/api/dashboard/reports/route.ts in full.

### API update (app/api/dashboard/reports/route.ts):

The existing reports route reads only from `appointments`. Add posTransactions data:

1. Add to the parallel Promise.all fetches:
   - posRevenue: sum of posTransactions.total for the date range (convert date range to timestamp bounds)
   - posByBarber: group posTransactions by barberId, sum total, count rows, join to users.fullName
   - posByMethod: group posTransactions by paymentMethod for the date range

2. In the response, add:
   posRevenue: number  (from posTransactions totals)
   combinedRevenue: appointments revenue + posRevenue
   cashTotal: number (from posByMethod where method='cash')
   cardTotal: number (from posByMethod where method='card')
   ticketsByBarber: { barber: string, tickets: number, revenue: number }[]  (from posByBarber)

### UI update (app/dashboard/(admin)/reports/page.tsx):

Read the existing full file.

1. Add a "Ticket Revenue" card to the summary row (4th card):
   Label: "Ticket Revenue"
   Value: $posRevenue.toFixed(2)
   Sub: "Manual + POS entries"
   Style matching existing summary cards.

2. Add a new section "Cash vs Card Split" between the existing "Revenue by barber" chart and "Bookings by service" chart:
   A horizontal bar visualization (not a Recharts chart — just divs):
   Cash bar: emerald, Card bar: blue
   Width proportional to amounts.
   Labels: "CASH $X,XXX" left, "CARD $X,XXX" right.
   Center: percentage split "X% / X%"
   Full-width card: rounded-xl border border-black/10 bg-white p-5 shadow-sm.

3. Add a new "Tickets by Barber" table section at the bottom (before the existing "Barber performance" table):
   Simple table: Barber | Tickets | Revenue | Avg/Ticket
   Sourced from ticketsByBarber in the API response.
   Style: match existing table styles in the file.

---

## TASK 11 — GENERAL WIRING

1. The server component app/dashboard/(admin)/tickets/page.tsx should:
   - Fetch barbers list (db.select from barbers where isActive=true orderBy sortOrder)
   - Fetch users with role='barber' and isActive=true to get the userId→name mapping
   - Build a BarberOption array: { id: users.id, name: barber.name ?? users.fullName, avatarUrl: barber.avatarUrl ?? users.avatarUrl }
   - Pass to TicketsPageClient as props
   - Metadata: { title: "Tickets | Headz Staff" }

2. The tickets page needs auth: same requireAdminApi pattern — add it to the layout (it's already covered by the admin layout guard).

3. All money values: use a helper formatMoney(n: number): string that returns `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`. Define this in lib/utils/format-money.ts.

4. The TicketsPageClient should auto-refresh tickets every 30 seconds (setInterval in useEffect, clearInterval on cleanup). Show a subtle "Updated just now" timestamp below the ticket list header.

5. When a ticket is added successfully:
   - Flash the corresponding stat card (animate-pulse-glow for 2 seconds)
   - Animate the new ticket row in with animate-slide-right
   - Update totals immediately (optimistic update from the API response)
   - Reset form: clear serviceLabel, amount, tip, customerName. Keep barberId and paymentMethod selected (so the same barber can quickly add another ticket).

---

## GENERAL RULES

- 'use client' on all interactive components. Server components only for data fetching shells.
- All money formatted via formatMoney() helper — no inline .toFixed(2) in JSX.
- useAnimatedCounter is used on all dollar amounts in the overview and tickets page.
- No new npm packages. date-fns (installed) for all date math. lucide-react (installed) for icons.
- Animations: CSS keyframes in globals.css + Tailwind utility classes. No inline style animations except where necessary for dynamic progress bar widths (use CSS custom property --progress-target or inline style width).
- TypeScript strict. No `any`. Type all API responses at the call site.
- After all changes: npx tsc --noEmit. Fix every error before submitting.
```

---

## ACTIVE PROMPT 3: Native Squire Booking Flow (3-Layer System)

Paste the entire block below into Cursor's composer.

```
You are working on the Headz Ain't Ready barbershop website — Next.js 14 App Router, Tailwind CSS, Drizzle ORM, Supabase Auth, deployed on Netlify. Color palette: headz-red (#C41E3A), headz-black (#111), headz-cream (#FDF6EC), headz-gray (#6b7280).

The Squire booking page at https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1 blocks iframe embedding. Squire has a separate widget subdomain at widget.getsquire.com/v2/ built specifically for third-party embedding. The goal is to keep the entire booking experience on the Headz site with only the final payment step going to Squire.

Implement a 3-layer booking system in priority order:
  Layer 1 — Try widget.getsquire.com/v2/ iframe (Squire's official embeddable widget endpoint)
  Layer 2 — Custom native multi-step booking flow (Steps 1–4 fully on-site, fully branded)
  Layer 3 — At the final confirm step, open Squire in a centered popup window (window.open — NOT a redirect, NOT an iframe, so no embedding restrictions apply)

Known shop constants (do not re-fetch, hardcode in lib/squire-config.ts):
  shopSlug   = "headz-aint-ready-jackson-heights-1"
  shopId     = "39b8356f-26e3-4c5d-972b-b33883bbb96f"
  bookingUrl = "https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1"
  widgetUrls = [
    "https://widget.getsquire.com/v2/headz-aint-ready-jackson-heights-1",
    "https://widget.getsquire.com/v2/?shop=headz-aint-ready-jackson-heights-1",
    "https://widget.getsquire.com/v2/?shopId=39b8356f-26e3-4c5d-972b-b33883bbb96f",
    "https://widget.getsquire.com/v2/?slug=headz-aint-ready-jackson-heights-1",
  ]
  hours      = Mon–Sat 09:30–19:00, Sun 10:00–18:00 (America/New_York)
  bookingIntervalMinutes  = 15
  minAdvanceMinutes       = 30
  maxAdvanceDays          = 60

Read each existing file before editing it. Do not delete any DB schema, migrations, or Drizzle config. Use TypeScript strict throughout — no `any`. No new npm packages — everything needed (date-fns, date-fns-tz, react-day-picker v9) is already installed. After all tasks run: npx tsc --noEmit and fix all errors.

---

## FILE 1 — lib/squire-config.ts (CREATE)

export const SQUIRE = {
  shopSlug: 'headz-aint-ready-jackson-heights-1',
  shopId:   '39b8356f-26e3-4c5d-972b-b33883bbb96f',
  bookingUrl: 'https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1',
  widgetUrls: [
    'https://widget.getsquire.com/v2/headz-aint-ready-jackson-heights-1',
    'https://widget.getsquire.com/v2/?shop=headz-aint-ready-jackson-heights-1',
    'https://widget.getsquire.com/v2/?shopId=39b8356f-26e3-4c5d-972b-b33883bbb96f',
    'https://widget.getsquire.com/v2/?slug=headz-aint-ready-jackson-heights-1',
  ] as const,
  hours: {
    weekday: { open: '09:30', close: '19:00' },
    sunday:  { open: '10:00', close: '18:00' },
  },
  bookingIntervalMinutes: 15,
  minAdvanceMinutes:      30,
  maxAdvanceDays:         60,
  timezone: 'America/New_York',
} as const

---

## FILE 2 — lib/booking/time-slots.ts (CREATE)

Pure utility, no React. Uses date-fns and date-fns-tz (already installed).

import { addMinutes, format, parse, isAfter, isSameDay } from 'date-fns'
import { toZonedTime }                                    from 'date-fns-tz'
import { SQUIRE }                                         from '@/lib/squire-config'

export function generateTimeSlots(date: Date): string[] {
  const tz       = SQUIRE.timezone
  const zonedNow = toZonedTime(new Date(), tz)
  const zonedDay = toZonedTime(date, tz)
  const dow      = zonedDay.getDay() // 0 = Sunday

  const { open, close } = dow === 0 ? SQUIRE.hours.sunday : SQUIRE.hours.weekday

  // Build open/close as Date objects on the selected day
  const base      = new Date(zonedDay.getFullYear(), zonedDay.getMonth(), zonedDay.getDate())
  const openTime  = parse(open,  'HH:mm', base)
  const closeTime = parse(close, 'HH:mm', base)

  const minBookable = addMinutes(zonedNow, SQUIRE.minAdvanceMinutes)

  const slots: string[] = []
  let cursor = openTime
  while (isAfter(closeTime, cursor)) {
    const isToday    = isSameDay(zonedDay, zonedNow)
    const tooSoon    = isToday && !isAfter(cursor, minBookable)
    if (!tooSoon) {
      slots.push(format(cursor, 'h:mm a'))
    }
    cursor = addMinutes(cursor, SQUIRE.bookingIntervalMinutes)
  }
  return slots
}

export function getMinBookableDate(): Date {
  const now = new Date()
  return addMinutes(now, SQUIRE.minAdvanceMinutes)
}

export function getMaxBookableDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + SQUIRE.maxAdvanceDays)
  return d
}

---

## FILE 3 — components/booking/SquireWidgetEmbed.tsx (CREATE)

'use client'

Attempts to embed the Squire widget by trying each URL in SQUIRE.widgetUrls in sequence.

import { useEffect, useRef, useState } from 'react'
import { SQUIRE } from '@/lib/squire-config'

interface SquireWidgetEmbedProps {
  onFailed: () => void
}

type Status = 'trying' | 'loaded' | 'failed'

export function SquireWidgetEmbed({ onFailed }: SquireWidgetEmbedProps) {
  const [urlIndex, setUrlIndex] = useState(0)
  const [status, setStatus]     = useState<Status>('trying')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentUrl = SQUIRE.widgetUrls[urlIndex]

  function tryNext() {
    if (timerRef.current) clearTimeout(timerRef.current)
    const next = urlIndex + 1
    if (next < SQUIRE.widgetUrls.length) {
      setUrlIndex(next)
      setStatus('trying')
    } else {
      setStatus('failed')
      onFailed()
    }
  }

  function handleLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
    // Give the iframe 2 seconds to render real content, then check
    timerRef.current = setTimeout(() => {
      try {
        const doc = (e.target as HTMLIFrameElement).contentDocument
        const body = doc?.body?.innerText?.trim() ?? ''
        // Squire's "no JS" fallback text — widget didn't load
        if (!body || body.includes('You need to enable JavaScript')) {
          tryNext()
        } else {
          setStatus('loaded')
        }
      } catch {
        // Cross-origin access blocked = widget IS rendering (good sign) or hard block
        // Treat cross-origin error as "probably loaded" — if it's blocked the user will see a blank frame
        setStatus('loaded')
      }
    }, 2000)
  }

  // Set a 10-second overall timeout per URL attempt
  useEffect(() => {
    const id = setTimeout(() => {
      if (status === 'trying') tryNext()
    }, 10_000)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIndex, status])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="relative w-full" style={{ minHeight: 'calc(100vh - 96px)' }}>
      {status === 'trying' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-headz-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-headz-red" />
          <p className="text-white/60 text-sm">Loading booking…</p>
        </div>
      )}

      {currentUrl && (
        <iframe
          key={currentUrl}
          src={currentUrl}
          title="Book at Headz Ain't Ready"
          allow="payment; camera; microphone; clipboard-write"
          onLoad={handleLoad}
          onError={tryNext}
          className="w-full border-0"
          style={{
            height: 'calc(100vh - 96px)',
            minHeight: '620px',
            opacity: status === 'loaded' ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </div>
  )
}

---

## FILE 4 — components/booking/NativeBookingFlow.tsx (CREATE)

'use client'

4-step booking flow that runs 100% on the Headz site. At Step 4 (Confirm) it opens Squire in a centered popup window.

### Types

export interface BookingService {
  id: string
  name: string
  price: number
  priceDisplayOverride: string | null
  durationMinutes: number
}

export interface BookingBarber {
  id: string
  name: string
  avatarUrl: string | null
}

interface Props {
  services: BookingService[]
  barbers:  BookingBarber[]
}

type Step = 1 | 2 | 3 | 4

interface BookingDraft {
  step:      Step
  serviceId: string | null
  barberId:  string | null   // null means "Any Barber"
  date:      Date   | null
  timeSlot:  string | null
  popupOpened: boolean
}

### Imports needed
import { useState, useMemo }    from 'react'
import { DayPicker }            from 'react-day-picker'
import { format }               from 'date-fns'
import { generateTimeSlots, getMinBookableDate, getMaxBookableDate } from '@/lib/booking/time-slots'
import { SQUIRE }               from '@/lib/squire-config'
import { formatServicePriceDisplay } from '@/lib/services/format-service-price'
import Image                    from 'next/image'

Import 'react-day-picker/dist/style.css' at the top of the component file.

### Step Progress Bar
Render above the form at all times. 4 steps: "Service", "Barber", "Date & Time", "Confirm".
- Steps connected by a thin line: `<div className="h-px flex-1 bg-black/10" />`
- Completed step circle: `<div className="h-3 w-3 rounded-full bg-headz-red" />`
- Active step circle: `<div className="h-3 w-3 rounded-full bg-headz-red ring-4 ring-headz-red/20" />`
- Future step circle: `<div className="h-3 w-3 rounded-full bg-black/10" />`
- Step label below circle: text-xs, headz-red for active, headz-black for completed, headz-gray for future

### Step 1 — Choose Service
Heading: "What can we do for you?"
Grid: `grid grid-cols-2 sm:grid-cols-3 gap-3`

Each card:
- Default:  `group cursor-pointer rounded-xl border-2 border-black/10 p-4 transition-all hover:border-headz-red/40 hover:shadow-sm`
- Selected: `cursor-pointer rounded-xl border-2 border-headz-red bg-headz-red/5 p-4 shadow-sm`
- Service name: `text-sm font-semibold text-headz-black`
- Price: use formatServicePriceDisplay(service) → `text-headz-red font-bold text-base`
- Duration: `{service.durationMinutes} min` → `text-xs text-headz-gray mt-1`
- On click: set serviceId → immediately advance to step 2

### Step 2 — Choose Your Barber
Heading: "Who's cutting today?"
Grid: `grid grid-cols-2 sm:grid-cols-3 gap-3`

First card always = "Any Barber":
- Icon: a centered ✂ character at text-3xl text-headz-red
- Name: "Any Barber"
- Sub: "Next available"
- barberId = null

Per-barber cards:
- Avatar: if avatarUrl, use next/image rounded-full w-14 h-14 object-cover mx-auto mb-2
- No avatarUrl: initials circle — `<div className="h-14 w-14 rounded-full bg-headz-red/10 flex items-center justify-center mx-auto mb-2"><span className="text-headz-red font-bold text-lg">{initials}</span></div>`
- Initials = first letter of each word in name, max 2 letters, uppercase
- Name below: text-sm font-semibold text-center
- Sub: "Master Barber" text-xs text-headz-gray text-center
- On click: set barberId → advance to step 3

### Step 3 — Pick a Date & Time
Heading: "When works for you?"
Layout: `grid grid-cols-1 md:grid-cols-2 gap-8`

Left column — Date Picker:
Sub-heading: "Choose a date" text-sm font-semibold text-headz-black mb-3
Render <DayPicker> with:
  mode="single"
  selected={draft.date ?? undefined}
  onSelect={(d) => setDraft(prev => ({ ...prev, date: d ?? null, timeSlot: null }))}
  disabled={[
    { before: getMinBookableDate() },
    { after: getMaxBookableDate() },
  ]}
  modifiersClassNames={{ selected: 'rdp-selected-headz' }}
Add this CSS via a <style> tag in the component (or inline style block):
  .rdp-selected-headz { background-color: #C41E3A !important; color: white !important; border-radius: 9999px; }
  .rdp-day:hover:not(.rdp-day_disabled) { background-color: rgba(196, 30, 58, 0.1) !important; border-radius: 9999px; }

Right column — Time Slots:
Sub-heading: "Choose a time" text-sm font-semibold text-headz-black mb-3
If no date selected: `<p className="text-headz-gray text-sm">Select a date first</p>`
If date selected:
  const slots = useMemo(() => draft.date ? generateTimeSlots(draft.date) : [], [draft.date])
  If slots.length === 0: `<p className="text-headz-gray text-sm">No available slots for this date. Try another day.</p>`
  Otherwise: `<div className="grid grid-cols-3 gap-2">` with buttons:
    Default:  `rounded-lg border border-black/10 px-2 py-2 text-sm text-headz-black hover:border-headz-red/50 hover:bg-headz-red/5 transition`
    Selected: `rounded-lg border-2 border-headz-red bg-headz-red text-white px-2 py-2 text-sm font-semibold`
    On click: set timeSlot

Below both columns (full width): show "Next →" button only when BOTH date AND timeSlot are set:
  `<button onClick={() => setDraft(p => ({...p, step: 4}))} className="mt-6 w-full sm:w-auto bg-headz-black hover:bg-black text-white font-semibold px-8 py-3 rounded-xl transition">Next →</button>`

### Step 4 — Confirm & Book
Heading: "Your appointment"

Summary card: `rounded-2xl border border-black/10 bg-[#fafaf8] p-6 space-y-4 shadow-sm`
Inside the card, show 4 rows each with icon + label + value:
  Row 1: ✂ icon  |  "Service"  |  selectedService.name + " · " + formatServicePriceDisplay(selectedService)
  Row 2: 👤 icon |  "Barber"   |  selectedBarber?.name ?? "Any Available Barber"
  Row 3: 📅 icon |  "Date"     |  format(draft.date!, 'EEEE, MMMM d')
  Row 4: 🕐 icon |  "Time"     |  draft.timeSlot!
Use emoji or lucide-react icons (already installed). Row label: text-xs uppercase tracking-wider text-headz-gray. Row value: text-headz-black font-semibold.

Below the summary card, if popupOpened is false:
  Two buttons side by side (stack on mobile):
  1. "← Edit" ghost button: `border border-black/10 rounded-xl px-6 py-3 text-sm text-headz-black hover:bg-black/5 transition`
     → onClick: setDraft(p => ({...p, step: 1}))
  2. "Complete Booking →" primary button: `bg-headz-red hover:bg-headz-redDark text-white font-bold uppercase tracking-widest text-sm px-10 py-4 rounded-xl shadow-lg shadow-headz-red/20 transition w-full sm:w-auto`
     → onClick: openSquirePopup()

If popupOpened is true, replace the buttons area with:
  `<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">`
    Green ✓ circle icon
    `<p className="font-semibold text-emerald-800">Booking window opened!</p>`
    `<p className="text-sm text-emerald-700">Complete your booking in the Squire window. Close it when done.</p>`
    `<button onClick={openSquirePopup} className="text-xs text-emerald-600 hover:underline mt-1">Didn't open? Click here</button>`
  `</div>`

### openSquirePopup function
function openSquirePopup() {
  const url = SQUIRE.bookingUrl
  const w = 480, h = 700
  const left = Math.max(0, (window.screen.width  - w) / 2 + (window.screenX ?? 0))
  const top  = Math.max(0, (window.screen.height - h) / 2 + (window.screenY ?? 0))
  const feat = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
  const popup = window.open(url, 'squire-booking', feat)
  if (!popup) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  setDraft(p => ({ ...p, popupOpened: true }))
}

### Back button
On steps 2, 3, 4: render `<button onClick={() => setDraft(p => ({...p, step: (p.step - 1) as Step}))} className="text-sm text-headz-gray hover:text-headz-black transition mb-6 flex items-center gap-1"><span>←</span> Back</button>`

### Full component structure
return (
  <div className="p-6 sm:p-8">
    <StepProgressBar currentStep={draft.step} />
    {draft.step > 1 && <BackButton />}
    {draft.step === 1 && <Step1Services />}
    {draft.step === 2 && <Step2Barbers />}
    {draft.step === 3 && <Step3DateTime />}
    {draft.step === 4 && <Step4Confirm />}
  </div>
)

---

## FILE 5 — components/booking/BookingPageClient.tsx (CREATE)

'use client'

Top-level orchestrator. Decides which layer to show.

import { useState }              from 'react'
import { SquireWidgetEmbed }     from './SquireWidgetEmbed'
import { NativeBookingFlow }     from './NativeBookingFlow'
import type { BookingService, BookingBarber } from './NativeBookingFlow'

interface Props {
  services: BookingService[]
  barbers:  BookingBarber[]
}

export function BookingPageClient({ services, barbers }: Props) {
  const [mode, setMode] = useState<'widget' | 'native'>('widget')

  return (
    <>
      {mode === 'widget' ? (
        <SquireWidgetEmbed onFailed={() => setMode('native')} />
      ) : (
        <NativeBookingFlow services={services} barbers={barbers} />
      )}

      {/* Subtle mode toggle at bottom */}
      <div className="px-6 pb-4 text-center">
        {mode === 'widget' ? (
          <button
            onClick={() => setMode('native')}
            className="text-xs text-headz-gray/50 hover:text-headz-gray transition underline underline-offset-2"
          >
            Having trouble? Switch to simple booking mode
          </button>
        ) : (
          <button
            onClick={() => setMode('widget')}
            className="text-xs text-headz-gray/50 hover:text-headz-gray transition underline underline-offset-2"
          >
            Switch back to full booking experience
          </button>
        )}
      </div>
    </>
  )
}

---

## FILE 6 — app/(marketing)/book/page.tsx (REWRITE)

Read the current file first. Replace entirely with:

import { BookingPageClient }        from '@/components/booking/BookingPageClient'
import type { BookingService, BookingBarber } from '@/components/booking/NativeBookingFlow'
import { db }                        from '@/lib/db'
import { barbers, services, users }  from '@/lib/db/schema'
import { asc, eq }                   from 'drizzle-orm'
import { bookableBarbersCondition }  from '@/lib/barbers/public-queries'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Book | Headz Ain't Ready",
  description: "Book your haircut at Headz Ain't Ready Barbershop, Jackson Heights Queens.",
}

export default async function BookPage() {
  const [barberRows, serviceRows] = await Promise.allSettled([
    db
      .select({ barber: barbers })
      .from(barbers)
      .innerJoin(users, eq(barbers.userId, users.id))
      .where(bookableBarbersCondition)
      .orderBy(asc(barbers.sortOrder))
      .then(rows =>
        rows.map((r): BookingBarber => ({
          id:        r.barber.id,
          name:      r.barber.name,
          avatarUrl: r.barber.avatarUrl ?? null,
        }))
      ),
    db
      .select({
        id:                   services.id,
        name:                 services.name,
        price:                services.price,
        priceDisplayOverride: services.priceDisplayOverride,
        durationMinutes:      services.durationMinutes,
      })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.displayOrder))
      .then(rows => rows as BookingService[]),
  ])

  const barbersList:  BookingBarber[]  = barberRows.status  === 'fulfilled' ? barberRows.value  : []
  const servicesList: BookingService[] = serviceRows.status === 'fulfilled' ? serviceRows.value : []

  return (
    <div className="min-h-screen bg-headz-black">
      {/* Sticky branded header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-headz-black/95 px-4 py-4 text-center backdrop-blur-sm">
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.25em] text-headz-red">
          Jackson Heights, Queens · NYC
        </p>
        <h1 className="font-headz-display text-xl text-white sm:text-2xl">
          Book Your Cut
        </h1>
      </div>

      {/* Main content card */}
      <div className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <BookingPageClient services={servicesList} barbers={barbersList} />
        </div>
      </div>
    </div>
  )
}

---

## FILE 7 — next.config.js (UPDATE)

Read the file. Find the CSP header value string and make two updates:

1. frame-src: ensure `https://widget.getsquire.com` is included.
   Current frame-src contains: `https://getsquire.com https://*.getsquire.com https://app.getsquire.com`
   Since `https://*.getsquire.com` already covers widget.getsquire.com, just verify it's there. If the wildcard is missing, add `https://widget.getsquire.com` explicitly.

2. connect-src: add Squire domains so the widget can make API calls.
   Find: `connect-src 'self' https://*.supabase.co wss://*.supabase.co`
   Replace with: `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.getsquire.com https://getsquire.com https://widget.getsquire.com`

Also add `https://images.squarecdn.com` and `https://seller-brand-assets-f.squarecdn.com` to img-src if not already present (Squire uses these for barber profile images).

---

## GENERAL RULES

- 'use client' on all 3 component files (SquireWidgetEmbed, NativeBookingFlow, BookingPageClient). The page file stays a server component.
- Import 'react-day-picker/dist/style.css' inside NativeBookingFlow.tsx (client component, so CSS import is fine).
- All date/time math uses date-fns and date-fns-tz — both already in package.json.
- DayPicker version in this project is v9 — use the v9 API (mode="single", disabled array with before/after objects, modifiersClassNames).
- Use formatServicePriceDisplay from @/lib/services/format-service-price for all price display.
- Use next/image for all barber avatars.
- Do NOT delete components/booking/BookingFlow.tsx if it exists — just stop importing it from the page.
- After all files are written: run npx tsc --noEmit and fix every type error before finishing.
```

---

## ACTIVE PROMPT 2: Squire Booking Embed + Full Dashboard Revamp

Paste the entire block below into Cursor's composer as a second pass after Prompt 1.

```
You are working on the Headz Ain't Ready barbershop website — Next.js 14 App Router, Tailwind CSS, Drizzle ORM, Supabase Auth, deployed on Netlify. Color palette: headz-red (#C41E3A), headz-black (#111), headz-cream (#FDF6EC), headz-gray (#6b7280). All design decisions must match the existing dark/red/white barbershop aesthetic.

Squire is now the SINGLE SOURCE OF TRUTH for:
  - All customer bookings and appointments
  - Barber scheduling and availability
  - Time-off requests
  - Services and pricing
  - POS / payments
  - No-show tracking

The Squire booking URL for this shop is:
  https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1

The Squire partner/business dashboard is at:
  https://app.getsquire.com

Keep the local database ONLY for:
  - User authentication (Supabase)
  - Barber public profiles (name, avatar, bio shown on the marketing site)
  - Website-specific settings (display order, published/unpublished for marketing)
  - Local payment transaction log (mirrored from Squire webhooks for reporting)

Everything else that duplicated Squire functionality must be removed or converted to a Squire embed / deep-link.

---

## TASK 1 — NATIVE SQUIRE BOOKING EMBED (replace BookingFlow)

### 1a. New booking page: app/(marketing)/book/page.tsx

Replace the entire current page with a clean embedded booking experience:

1. Remove the DB queries for barbers and services — Squire owns this data now.
2. Remove the `<BookingFlow>` component import and usage.
3. The page becomes a simple server component (no DB calls needed):

```tsx
export const metadata = {
  title: "Book | Headz Ain't Ready",
  description: 'Book your haircut at Headz Ain\'t Ready, Jackson Heights.',
}

export default function BookPage() {
  return (
    <div className="min-h-screen bg-headz-black flex flex-col">
      {/* Header strip */}
      <div className="bg-headz-black border-b border-white/10 px-4 py-4 text-center">
        <p className="text-headz-red text-xs uppercase tracking-[0.25em] font-semibold mb-1">
          Jackson Heights, Queens
        </p>
        <h1 className="font-headz-display text-white text-2xl sm:text-3xl">
          Book Your Cut
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Powered by Squire — your time is locked in the moment you confirm.
        </p>
      </div>

      {/* Squire iframe — full remaining viewport height */}
      <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 96px)' }}>
        <iframe
          src="https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1"
          title="Book at Headz Ain't Ready"
          className="w-full h-full absolute inset-0 border-0"
          style={{ minHeight: 'calc(100vh - 96px)' }}
          allow="payment; camera; microphone"
          loading="eager"
        />
      </div>
    </div>
  )
}
```

4. Add `frame-src https://getsquire.com` to the Content Security Policy in `next.config.js` (find the existing CSP headers config and add it — if no CSP exists, add a permissive one that includes Squire).

5. The marketing page CTA buttons (in app/(marketing)/page.tsx) already link to /book — no change needed there. Just confirm all "Book Appointment", "Book Now", "Book your cut" links point to `/book`.

### 1b. Remove now-redundant booking components and API routes

Read each file first, then DELETE (replace with a redirect or 410 stub) the following files since Squire fully handles this flow:
- `components/booking/BookingFlow.tsx` — Replace with a simple re-export redirect component: `export { default } from './SquireBookingEmbed'` — then create `components/booking/SquireBookingEmbed.tsx` as a thin wrapper `<iframe src="https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1" ... />` for any place that might still use `<BookingFlow>`.
- `app/api/appointments/route.ts` — Add a deprecation note comment at top: `// DEPRECATED: Booking is now handled by Squire. This endpoint remains for webhook-mirrored data only.` Do NOT delete — it may still receive Squire webhook mirrors.
- `app/api/appointments/slots/route.ts` — Return 410 Gone: `return NextResponse.json({ error: 'Slot availability is now managed by Squire.' }, { status: 410 })`
- `app/api/appointments/calendar/route.ts` — Keep but add deprecation comment.

---

## TASK 2 — ADMIN DASHBOARD FULL REVAMP

The admin dashboard must be completely reorganized around Squire. Here is the new page/nav structure:

### New admin nav items (update DashboardNav.tsx and DashboardShell.tsx):

KEEP (revamped):
  - /dashboard → "Overview"
  - /dashboard/payments → "Payments"
  - /dashboard/reports → "Reports"
  - /dashboard/settings/staff → "Staff Profiles" (rename from Barbers)

CONVERT TO SQUIRE DEEP-LINKS (update page to show embed + external link):
  - /dashboard/schedule → "Schedule" (embed Squire calendar)

REMOVE ENTIRELY from nav (delete nav links, pages become redirects to /dashboard):
  - /dashboard/availability → redirect to /dashboard (Squire owns this)
  - /dashboard/time-off → redirect to /dashboard (Squire owns this)
  - /dashboard/no-shows → redirect to /dashboard (Squire owns this)
  - /dashboard/settings/services → redirect to /dashboard (Squire owns services)
  - /dashboard/settings/barbers → merged into /dashboard/settings/staff
  - /dashboard/settings/devices → redirect to /dashboard/settings/squire (rename)

ADD NEW:
  - /dashboard/settings/squire → "Squire Settings" (already partially done in devices page — revamp it)

### Detailed changes:

#### 2a. app/dashboard/(admin)/page.tsx — Admin Overview (revamp AdminDashboardClient)

Read `components/dashboard/AdminDashboardClient.tsx` first. Revamp the Overview tab to:
- Remove the calendar/appointment scheduling UI from the overview (Squire owns it).
- Show a clean command-center layout with 4 stat cards at the top (pull from `/api/dashboard/reports` endpoint — today's revenue, today's appointments, this week's revenue, active barbers).
- Add a prominent "Open Squire Dashboard" card in the center: dark card with the Squire logo text, description "Manage appointments, availability, and scheduling in Squire", and a red "Open Squire →" button linking to `https://app.getsquire.com` (target _blank).
- Add a "Quick Actions" section with 4 buttons: "View Schedule in Squire" (→ https://app.getsquire.com/schedule), "Manage Staff in Squire" (→ https://app.getsquire.com/team), "View Payments" (→ /dashboard/payments), "Staff Profiles" (→ /dashboard/settings/staff).
- Keep the existing appointment list / calendar tab ONLY if it reads from local webhook-mirrored data. If it's calling the Squire API or local slot logic, replace with a message: "Appointments are managed in Squire. Click 'Open Squire Dashboard' to view the live calendar."
- Style: headz-black cards with white text and headz-red accents. Consistent with existing admin dashboard card style.

#### 2b. app/dashboard/(admin)/schedule/page.tsx — Schedule (embed Squire)

Read `components/dashboard/SchedulePageClient.tsx` first. Replace the page with:
- A full-height Squire schedule embed page.
- Top bar: title "Schedule", description "Live view from Squire — manage directly in the Squire app for changes."
- "Open in Squire" button → https://app.getsquire.com/schedule (target _blank), headz-red button.
- Iframe embed: `<iframe src="https://app.getsquire.com/schedule" className="w-full rounded-xl border border-black/10" style={{ height: 'calc(100vh - 160px)' }} />`
- Note: if Squire does not allow embedding their dashboard (X-Frame-Options), fall back gracefully: show a large card with the Squire logo, description, and a full-width "Open Squire Schedule →" button. Detect this with an `onError` handler on the iframe.
- The `SchedulePageClient` component and calendar grid components (`CalendarGrid.tsx`, `ScheduleBarberStrip.tsx`, etc.) can be LEFT IN PLACE — do not delete, just stop importing them from this page. They may be used elsewhere.

#### 2c. app/dashboard/(admin)/availability/page.tsx — Convert to redirect

Replace entire page content with:
```tsx
import { redirect } from 'next/navigation'
export default function AvailabilityPage() {
  redirect('/dashboard/settings/squire')
}
```

#### 2d. app/dashboard/(admin)/time-off/page.tsx — Convert to redirect

Same pattern: redirect to '/dashboard/settings/squire'

#### 2e. app/dashboard/(admin)/no-shows/page.tsx — Convert to redirect

Same pattern: redirect to '/dashboard/settings/squire'

#### 2f. app/dashboard/(admin)/settings/services/page.tsx — Convert to Squire link page

Replace with a clean "Services managed in Squire" page (do NOT redirect — give the user info):
- Title: "Services & Pricing"
- Message: "Services and pricing are managed directly in Squire. Changes made in Squire automatically appear in the booking flow."
- Card with: "Edit Services in Squire" button → https://app.getsquire.com/services (red button, target _blank)
- Secondary info: "The public price list on the website homepage pulls from the local services table. To update the website price list, sync it after making changes in Squire." (future TODO)

#### 2g. app/dashboard/(admin)/settings/barbers/page.tsx — Merge into staff profiles

Replace with a redirect to `/dashboard/settings/staff`:
```tsx
import { redirect } from 'next/navigation'
export default function BarbersSettingsPage() { redirect('/dashboard/settings/staff') }
```

#### 2h. app/dashboard/settings/devices/page.tsx → Rename concept to Squire Settings

Read the existing file (already partially updated to Squire). Revamp to be a full "Squire Integration Settings" page:
- Remove the redirect link to `/dashboard/pos` (which no longer exists as a useful page).
- Add an "Integration Health" section with three status rows:
  1. API Key: green ✓ if SQUIRE_API_KEY env var present, red ✗ if not (detected via /api/squire/status)
  2. Webhook: shows the webhook URL to configure in Squire: `https://[your-domain]/api/squire/webhook`
  3. Location ID: green ✓ if SQUIRE_LOCATION_ID set, yellow ⚠ if not
- Keep the existing configuration steps list.
- Keep the "Open Squire app" button.

#### 2i. app/dashboard/(admin)/reports/page.tsx — Update data source label

Read the existing reports page. It currently says "same totals as your Square dashboard." Update:
- Change all "Square" references to "Squire" in the UI text.
- The data source comment: update to say "Sourced from local transaction log (mirrored from Squire webhooks)".
- No logic changes needed — just text/label updates.

#### 2j. app/dashboard/payments/page.tsx — Update Square references

Read the existing payments page. Update:
- Remove the "same totals as your Square dashboard" subtitle → change to "Payments processed through Squire POS"
- Change the Square external link on transactions: currently links to `https://squareup.com/dashboard/sales/transactions/${t.squarePaymentId}` — update to link to `https://app.getsquire.com/payments` instead (since we don't have Squire-specific payment deep links yet, just link to the Squire payments overview).
- Remove the "Square" label from the external link icon and replace with "Squire".
- The refund button still calls `/api/squire/refund` which is correct — no change needed there.

#### 2k. DashboardNav.tsx — Rebuild nav items

Read `components/dashboard/DashboardNav.tsx`. Update the admin navigation to exactly:

```
Overview        → /dashboard
Schedule        → /dashboard/schedule
Payments        → /dashboard/payments
Reports         → /dashboard/reports
Staff Profiles  → /dashboard/settings/staff
Squire Settings → /dashboard/settings/squire
```

Remove from admin nav:
- Availability
- Time off
- No-shows
- Services & pricing (now a Squire redirect page, not worth nav space)
- Barbers (merged into Staff Profiles)
- Devices (renamed to Squire Settings)

#### 2l. Create app/dashboard/settings/squire/page.tsx

New dedicated Squire settings page that replaces /dashboard/settings/devices as the canonical Squire config hub. Copy and enhance the existing devices page content, adding the Integration Health section from 2h. Update the redirect in devices/page.tsx to point to this new page.

---

## TASK 3 — BARBER DASHBOARD FULL REVAMP

### New barber nav items (update BarberDashboardShell.tsx):

KEEP (revamped):
  - /dashboard/barber → "My Day" (renamed from generic schedule)
  - /dashboard/barber/profile → "My Profile"

CONVERT TO SQUIRE:
  - /dashboard/barber/pos → "Checkout" (Squire POS)

REMOVE ENTIRELY (redirect to Squire or /dashboard/barber):
  - /dashboard/barber/availability → redirect to Squire
  - /dashboard/barber/time-off → redirect to Squire

### Detailed changes:

#### 3a. app/dashboard/barber/page.tsx — "My Day" revamp

Read `components/barber/BarberDashboardClient.tsx` first. Revamp:
- Keep the barber's name/avatar header (this comes from local DB which is correct).
- Top section: "Today's Schedule" — either show local webhook-mirrored appointments for this barber, or show a clean "Your live schedule is in Squire" card with an "Open My Schedule →" button to `https://app.getsquire.com` (target _blank).
- Remove any slot-booking or new-appointment creation UI from the barber view — barbers do not create appointments, customers do via Squire.
- Add a "Quick Actions" row:
  - "Open Squire" button (red, → https://app.getsquire.com)
  - "Charge Customer" button (dark, → /dashboard/barber/pos)
  - "My Profile" button (outline, → /dashboard/barber/profile)
- Style: keep existing dark card style (bg-headz-black or bg-white cards depending on section).

#### 3b. app/dashboard/barber/availability/page.tsx — Convert to Squire redirect page

Replace with an informational page (not just a redirect — explain why):
- Title: "Availability"
- Message: "Your working hours and availability are managed in Squire. Changes take effect immediately in the booking flow."
- "Edit My Availability in Squire" button → https://app.getsquire.com/availability (red, target _blank)
- "Back to Dashboard" link → /dashboard/barber

#### 3c. app/dashboard/barber/time-off/page.tsx — Convert to Squire redirect page

Same pattern as availability:
- Title: "Time Off"
- Message: "Time off requests are submitted and approved in Squire."
- "Request Time Off in Squire" button → https://app.getsquire.com/time-off (red, target _blank)
- "Back to Dashboard" link → /dashboard/barber

#### 3d. app/dashboard/barber/pos/page.tsx — Squire POS page

Read the existing file first. Replace the current redirect with a functional Squire POS page:

```tsx
'use client'
// Full Squire POS checkout page for barbers
```

The page should:
- Show a dark full-screen layout (bg-headz-black).
- Top bar with: back arrow to /dashboard/barber, title "Checkout", SquirePOSStatus badge (import from components/pos/SquirePOSStatus.tsx).
- Primary action: a large "Open Squire POS Terminal" button → https://app.getsquire.com/pos (red, full-width on mobile, opens in new tab).
- Secondary section "Or charge from this device":
  - "Charge Card" button that POSTs to /api/squire/checkout — show a loading state while waiting for response.
  - "Record Cash Payment" button that POSTs to /api/squire/record-cash.
  - Checkout status display (uses useEffect polling /api/squire/checkout/:id every 3 seconds).
- Import SquirePOSStatus from @/components/pos/SquirePOSStatus.

#### 3e. BarberDashboardShell.tsx — Rebuild nav

Read `components/barber/BarberDashboardShell.tsx`. Update barber nav to exactly:
```
My Day       → /dashboard/barber
Checkout     → /dashboard/barber/pos
My Profile   → /dashboard/barber/profile
```

Remove from barber nav:
- Availability (now a Squire info page, not nav-worthy)
- Time off (now a Squire info page, not nav-worthy)

---

## TASK 4 — SQUIRE WEBHOOK DATA MIRROR

For the Reports and Payments pages to show real data from Squire, we need to mirror Squire webhook events into the local DB.

### 4a. app/api/squire/webhook/route.ts

Read the existing file. Enhance it:
1. Validate `x-squire-signature` HMAC-SHA256 header against `process.env.SQUIRE_WEBHOOK_SECRET` (raw body, not parsed JSON).
2. Parse the event. Handle these event types:
   - `appointment.completed` or `payment.completed`: Insert/upsert a row into the local `transactions` table (or whatever the payments table is called in the schema — read `lib/db/schema.ts` to find the correct table name). Map fields: barberId, customerId/customerName, amount, paymentMethod (card/cash), squirePaymentId, status=paid, createdAt.
   - `appointment.no_show`: Log to console for now (no-show tracking is in Squire).
   - `appointment.cancelled`: Log to console.
3. Return 200 for all recognized events, 400 for missing/invalid signature.

### 4b. Read lib/db/schema.ts

Read the schema to find the transactions/payments table name and column names. Use the correct table in the webhook handler above. Do not create a new table — use the existing one.

---

## TASK 5 — CLEANUP & CONSISTENCY

### 5a. Remove dead imports

After all the above changes, scan these files for now-unused imports and remove them:
- app/dashboard/(admin)/layout.tsx
- app/dashboard/barber/layout.tsx
- components/dashboard/DashboardShell.tsx
- components/dashboard/DashboardNav.tsx
- components/barber/BarberDashboardShell.tsx

### 5b. Update all "Square" text references in the UI

Search the entire codebase for the strings "Square", "squareup.com", "square" (case-insensitive) in `.tsx` and `.ts` files (excluding node_modules). For each occurrence in UI-visible text (labels, descriptions, button text, error messages), update to "Squire" or "Squire POS". Do NOT change:
- Variable names like `squarePaymentId` in the DB schema (that's a column name, changing it requires a migration)
- Import paths
- The existing `squarePaymentId` field — just don't display "Square" in the UI label for it

### 5c. Environment variable documentation

Read `.env.local.example` if it exists, or find the .env.example file. Add/ensure these variables are documented:
```
# Squire Integration
SQUIRE_API_KEY=           # From Squire Partner Portal
SQUIRE_WEBHOOK_SECRET=    # Set in Squire webhook settings
SQUIRE_LOCATION_ID=       # Your shop's Squire location ID

# These Square vars can be removed after verifying Squire works:
# SQUARE_ACCESS_TOKEN=
# SQUARE_WEBHOOK_SIGNATURE_KEY=
# SQUARE_LOCATION_ID=
# SQUARE_TERMINAL_DEVICE_ID=
```

### 5d. Final type check

Run `npx tsc --noEmit` and fix any type errors introduced by the above changes.

---

## GENERAL RULES

- Next.js 14 App Router. Server components by default; use 'use client' only when needed.
- Tailwind only — no new UI libraries.
- Always use next/image for images, never <img>.
- Full TypeScript throughout. No `any` unless unavoidable.
- Do NOT delete any DB schema, migrations, or Drizzle config.
- Do NOT remove Supabase auth — it still gates all dashboard routes.
- When replacing a page with a Squire link page, always include: a back link, a clear explanation of why the feature moved to Squire, and the external link button in headz-red.
- After all tasks: run `npx tsc --noEmit` to confirm zero type errors.
```

---

## ACTIVE PROMPT: Website Redesign + Squire Integration

Paste the entire block below into Cursor's composer to implement all 5 planned changes.

```
You are working on the Headz Ain't Ready barbershop website — a Next.js 14 App Router project using Tailwind CSS, Drizzle ORM, and deployed on Netlify. The codebase lives at the root of this repo. The main marketing page is `app/(marketing)/page.tsx`. The site color palette uses `headz-red` (#E22222), `headz-black` (#111), `headz-cream`, and `headz-gray`. All changes must feel cohesive with the existing dark/red/white luxury barbershop aesthetic.

---

## TASK 1 — ANIMATED HERO (Train passing by)

The hero section in `app/(marketing)/page.tsx` currently uses a static background image with a dark overlay. Replace the static approach with an animated train-passing-by hero.

Steps:
1. Keep the same section structure (`data-header-dark`, min-h-[85vh], flex col justify-center).
2. The background asset is `/hero-bg.png` (already in `/public`). This is a Queens/NYC train/subway-themed image.
3. Create a CSS keyframe animation called `trainPass` that:
   - Starts the background-position at `0% 50%`
   - Slowly pans to `100% 50%` over 30 seconds, then reverses (alternate direction), giving the illusion of a train slowly rolling through the background.
   - Use `background-size: 200% 100%` so there is room to pan.
4. Add a secondary subtle layer: a set of 2–3 absolutely-positioned blurred white "light streak" divs that animate across the image from left to right at different speeds (4s, 6s, 9s) to simulate train windows passing. Each streak should be: w-[2px] h-[60%] bg-white/10, blur-sm, animate via translateX from -10px to 100vw.
5. Define these keyframes in `app/globals.css` using `@keyframes trainPass` and `@keyframes lightStreak`.
6. The existing hero text content (Queens NYC label, H1, tagline, Book Now + Call CTA) stays exactly the same. Only the background animation changes.

---

## TASK 2 — MOBILE HERO / INTRO SECTION (Queens welcome screen)

After the main hero, before the Dream Team video section, insert a new full-width "Welcome" section that mirrors the aesthetic of the mobile reference image (dark cityscape bg, scissors/comb icon, "WELCOME TO THE LEGENDARY" in spaced caps, large italic script "Queen's", "HEADZ AIN'T READY BARBERSHOP" in wide tracking caps, and a red BOOK APPOINTMENT CTA).

Implementation:
1. Use `/hero-bg.png` as background with a `bg-black/65` overlay.
2. Center a scissors icon above the headline — use Unicode ✂ or an inline SVG, styled at text-5xl text-white.
3. Text layout (centered, full-width):
   - `<p>` "WELCOME TO THE LEGENDARY" — tracking-[0.3em] text-sm font-light text-white uppercase
   - `<h2>` "Queen's" — font-serif italic text-7xl sm:text-8xl text-white font-bold drop-shadow-lg
   - `<p>` "HEADZ AIN'T READY BARBERSHOP" — tracking-[0.25em] text-sm uppercase text-white/90 font-medium
4. Below: a red bordered Book Appointment button (border-2 border-headz-red bg-headz-red/20 hover:bg-headz-red text-white px-10 py-4 uppercase tracking-widest text-sm font-semibold transition) linking to `/book`.
5. Section: min-h-[75vh], flex flex-col items-center justify-center gap-6, `data-header-dark`.

---

## TASK 3 — HISTORY + TESTIMONIALS (replace "Skip the wait" section)

Remove the current "Skip the wait" dark section entirely. Insert a new two-column section AFTER the Dream Team video and BEFORE the Services section.

Left column — History & About (mirrors Image 1 style):
- Small red uppercase label: "OVER 25 YEARS IN..."
- Large bold serif italic headline: "The Industry" (font-serif italic text-5xl font-bold)
- Body paragraph: "Headz Ain't Ready Was Established In 1995 In Jackson Heights, Queens. Since Then We Have Been Serving Thousands Of Clients In New York & The Entire Tri-State Area. We Take Pride In Art Of Barbering & Let Our Work Speak For Itself."
- Two feature rows with a red circle checkmark SVG icon:
  - "Open 7 Days" / "Monday - Sun: 9am - 8pm"
  - "Master Barbers" / "& State Of The Art Chairs"
- Red BOOK APPOINTMENT button linking to /book.

Right column — Google Reviews (4 styled cards):
Do NOT copy-paste from Google. Re-create as styled cards using these review details:

  Card 1: Carlos M. ★★★★★ — "Been coming here since I was a kid. Real Queens institution. The barbers know their craft — fades are always clean and tight. Wouldn't go anywhere else."
  Card 2: David R. ★★★★★ — "Best shop in Jackson Heights, hands down. Walk in, get treated right, walk out looking fresh. Staff is professional and the vibe is always good."
  Card 3: Mike T. ★★★★★ — "These guys have been cutting hair in this neighborhood for decades and it shows. Consistent, sharp, and always on point. Highly recommend."
  Card 4: Anthony L. ★★★★★ — "Brought my son here for his first cut. The barber was patient and did an amazing job. This is the kind of place you keep coming back to."

Card design:
- `bg-headz-black/90 border border-white/10 rounded-xl p-5`
- A red "G" circle icon top-left (inline SVG or span styled with bg-headz-red rounded-full)
- 5 gold stars: ★★★★★ text-yellow-400
- Review text in text-white/80 text-sm
- Reviewer name in text-white font-semibold
- "Google Review" in text-white/40 text-xs

Section wrapper: `py-20 px-4 sm:px-6 bg-white` with `max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start`.

---

## TASK 4 — PRICE LIST + GALLERY SIDE BY SIDE

Redesign the price section as two columns: Price List LEFT, Photo Gallery RIGHT.

1. Change the price section wrapper from `max-w-2xl mx-auto` to `max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start`.
2. Left side = existing price list table (same logic, just inside the grid).
3. Right side = Gallery:
   - Title: "The Work" text-2xl font-bold mb-6
   - Sub-label: "FRESH CUTS • REAL CLIENTS" in text-headz-red uppercase tracking-widest text-xs mb-4
   - Grid of 6 images: `grid grid-cols-2 gap-3`
   - Use these Unsplash URLs:
     - https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80
     - https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80
     - https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80
     - https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=80
     - https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80
     - https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80
   - Each image: `aspect-square rounded-lg overflow-hidden hover:scale-105 transition-transform duration-300 shadow-md`, using Next.js `<Image>` with fill + object-cover inside a relative wrapper.
4. Add `images.unsplash.com` to `next.config.js` remotePatterns if not already present.

---

## TASK 5 — SQUIRE INTEGRATION (replace Square POS)

Replace the existing Square POS integration with Squire (getsquire.com).

### API Routes:

1. Deprecate these Square routes (return 410 Gone with JSON `{ error: "Square deprecated. Use /api/squire/" }`):
   - app/api/square/terminal-checkout/route.ts
   - app/api/square/terminal-checkout/[checkoutId]/route.ts
   - app/api/square/terminal-checkout/[checkoutId]/cancel/route.ts
   - app/api/square/devices/route.ts
   - app/api/square/devices/[id]/route.ts
   - app/api/square/record-cash/route.ts
   - app/api/square/refund/route.ts
   - app/api/square/webhook/route.ts

2. Create app/api/squire/ with:

   webhook/route.ts — POST. Validate `x-squire-signature` header against `process.env.SQUIRE_WEBHOOK_SECRET` using HMAC-SHA256. Parse and log event body. Return 200.

   checkout/route.ts — POST. Accept `{ barberId, serviceId, appointmentId, amount }`. POST to `https://api.getsquire.com/v1/terminal/checkout` with `Authorization: Bearer ${process.env.SQUIRE_API_KEY}`. Return checkout session JSON.

   checkout/[checkoutId]/route.ts — GET. Poll checkout status from `https://api.getsquire.com/v1/terminal/checkout/:checkoutId`.

   checkout/[checkoutId]/cancel/route.ts — POST. Cancel via `https://api.getsquire.com/v1/terminal/checkout/:checkoutId/cancel`.

   refund/route.ts — POST. Accept `{ paymentId, amount, reason }`. POST to `https://api.getsquire.com/v1/payments/:paymentId/refund`.

   record-cash/route.ts — POST. Accept `{ barberId, appointmentId, amount }`. Log and return 200 (stub for now).

   status/route.ts — GET. Return `{ connected: !!process.env.SQUIRE_API_KEY }`.

3. Add to .env.local.example (create if missing):
   SQUIRE_API_KEY=
   SQUIRE_WEBHOOK_SECRET=
   SQUIRE_LOCATION_ID=

### Dashboard Pages:

4. app/dashboard/(admin)/pos/page.tsx — Replace redirect with a real "Squire POS Terminal" server component page:
   - Fetch /api/squire/status to get connected boolean.
   - Show a SquirePOSStatus badge component.
   - "Launch Terminal" button linking to https://app.getsquire.com (target _blank).
   - Placeholder recent transactions table (3 static rows: date, barber, service, amount, status badge).
   - Dark card styling matching admin dashboard aesthetic with headz-red accents.

5. app/dashboard/barber/pos/page.tsx — Replace redirect with 'use client' barber checkout page:
   - "Charge Customer" button POSTing to /api/squire/checkout.
   - useEffect polling /api/squire/checkout/[checkoutId] every 3 seconds until COMPLETED or CANCELLED.
   - Status display: Pending → Processing → Complete (green ✓) or Failed (red ✗).
   - "Record Cash Payment" button POSTing to /api/squire/record-cash.
   - Styling: headz-black bg, headz-red accents, white text — match barber dashboard card style.

6. app/dashboard/settings/devices/page.tsx — Read this file first, then update all Square device/terminal references to say "Squire Terminal" and point config links to https://app.getsquire.com/settings.

### Components:

7. Create components/pos/SquirePOSStatus.tsx:
   Props: `{ connected: boolean }`
   - connected=true: green dot + "Squire POS Active" in text-green-400
   - connected=false: red dot + "Configure Squire API Key" in text-red-400
   Small pill badge style.

8. Read components/HeadzPOS.tsx first, then replace all Square SDK calls with fetch calls to the new /api/squire/ routes. Keep the same component props/interface so nothing breaks downstream.

---

## GENERAL RULES

- Next.js 14 App Router. Server components by default; use 'use client' only when needed (interactivity/hooks).
- Tailwind only — no new CSS libraries or component libraries.
- All keyframe animations go in app/globals.css.
- Always use next/image, never <img>.
- Full TypeScript — no `any` unless unavoidable with external API responses (type those as explicit interfaces).
- Do not remove or break the DB query logic at the top of app/(marketing)/page.tsx.
- After all tasks: run `npx tsc --noEmit` to confirm zero type errors.
```

---

# Using This Starter Kit with Cursor AI

This guide shows you how to leverage Cursor AI with this starter kit to build features incredibly fast.

## Why This Works So Well

The `.cursorrules` file teaches Claude your **exact architecture**. This means:

1. **No repetitive explanations** - Claude already knows you use Drizzle, not Prisma
2. **Consistent patterns** - All code follows the same structure
3. **Production quality** - Generated code includes error handling, types, validation
4. **Fast iteration** - Build features in minutes, not hours

## The Development Workflow

### 1. Start with a Clear Request

Instead of vague requests, be specific about what you want:

❌ **Bad**: "Add a blog"
✅ **Good**: "Add a blog posts feature with title, content, and published status. Users should be able to create, edit, and delete their own posts."

### 2. Let Cursor Build the Database Schema

**Your request:**
```
Add a blog posts table with:
- title (required)
- content (optional)
- published boolean (default false)
- user relationship
- timestamps
```

**What Cursor will do:**
1. Update `lib/db/schema.ts` with the new table
2. Tell you to run `npm run db:generate` and `npm run db:migrate`
3. Show you the exact schema it created

### 3. Build the API Routes

**Your request:**
```
Create API routes for blog posts:
- GET /api/posts - list all published posts
- GET /api/posts/my-posts - get current user's posts
- POST /api/posts - create new post
- PUT /api/posts/[id] - update post
- DELETE /api/posts/[id] - delete post
```

**What Cursor will do:**
1. Create all route files in the correct structure
2. Add authentication checks
3. Include input validation with Zod
4. Add proper error handling
5. Use the correct database operations

### 4. Build the UI Components

**Your request:**
```
Create a posts dashboard page with:
- List of user's posts
- Create new post button
- Edit and delete actions for each post
- Published/draft indicator
```

**What Cursor will do:**
1. Create the page with proper auth protection
2. Build form components with validation
3. Add loading states and error handling
4. Use proper TypeScript types
5. Style with Tailwind CSS

## Example Development Sessions

### Session 1: Building a Todo List Feature

```
You: "Add a todos table with title, completed boolean, and user relationship"

Cursor: [Creates schema] → You run migration

You: "Create CRUD API routes for todos"

Cursor: [Creates all routes with auth, validation, error handling]

You: "Build a todo list page where users can add, check off, and delete todos"

Cursor: [Creates complete UI with forms, list, and interactions]
```

**Time**: 10-15 minutes for a complete CRUD feature!

### Session 2: Adding User Profiles

```
You: "Add profile fields to the users table: bio, avatar, location, website"

Cursor: [Updates schema] → You run migration

You: "Create a profile settings page where users can update these fields"

Cursor: [Creates form with validation, image upload handling, API route]

You: "Create a public profile page at /profile/[userId]"

Cursor: [Creates public profile page with proper data fetching]
```

**Time**: 15-20 minutes for complete profile system!

### Session 3: Building a Comment System

```
You: "Add a comments table with content, postId, userId, and timestamps"

Cursor: [Creates schema with relationships]

You: "Add API routes for creating and listing comments on posts"

Cursor: [Creates routes with proper validation]

You: "Add a comments section to the post detail page"

Cursor: [Creates UI with comment form, list, and real-time updates]
```

**Time**: 15-20 minutes for a complete comment system!

## Pro Tips for Working with Cursor

### 1. Build Features Incrementally

Don't ask for everything at once. Break it down:

1. Database schema
2. API routes
3. UI components
4. Polish and refinement

This lets you test each layer before moving to the next.

### 2. Ask for Explanations When Learning

```
You: "Why did you use .returning() in the database insert?"

Cursor: [Explains that it returns the inserted row, useful for getting auto-generated IDs]
```

This helps you learn patterns while building.

### 3. Request Specific Patterns

Since Cursor knows your architecture:

```
"Follow the same pattern as the profile API route but for posts"
```

Cursor will replicate the exact structure, just adapted for your new feature.

### 4. Iterate and Refine

```
You: "Add pagination to the posts list"
You: "Add search functionality"
You: "Add sorting by date and popularity"
```

Build the basic version first, then add features one by one.

### 5. Use the Database Studio

```bash
npm run db:studio
```

Opens Drizzle Studio in your browser to:
- View your data visually
- Test queries
- Understand relationships
- Debug issues

## Common Patterns Cursor Knows

Because of `.cursorrules`, Cursor automatically:

### ✅ Database Operations
- Uses Drizzle ORM correctly
- Adds proper relationships
- Includes timestamps
- Uses UUID primary keys

### ✅ API Routes
- Checks authentication first
- Validates input with Zod
- Returns proper status codes
- Handles errors gracefully
- Uses TypeScript types

### ✅ Components
- Marks client components with "use client"
- Uses Server Components by default
- Includes loading states
- Handles errors properly
- Types all props

### ✅ Authentication
- Protects routes correctly
- Uses server client for Server Components
- Uses browser client for Client Components
- Handles redirects properly

## Debugging with Cursor

When something doesn't work:

```
You: "The posts aren't showing up on the dashboard. Help me debug this."

Cursor: [Checks database queries, auth logic, component rendering, suggests fixes]
```

Cursor can walk through your code and identify issues.

## Advanced Workflows

### Adding Third-Party APIs

```
You: "Add Stripe payment integration. Create an API route for checkout and one for webhooks."

Cursor: [Creates routes with proper Stripe SDK usage, webhook verification, database updates]
```

### Adding Real-Time Features

```
You: "Add real-time updates to the posts list using Supabase realtime"

Cursor: [Adds Supabase subscription in component, handles updates properly]
```

### Optimizing Performance

```
You: "This page is slow. Help me optimize it with proper caching and fewer database calls."

Cursor: [Suggests and implements caching strategies, query optimization, etc.]
```

## What to Build Next

Now that you understand the workflow, here are ideas to practice:

### Beginner Projects
1. **Todo App** - Classic CRUD operations
2. **Notes App** - Rich text editing
3. **Bookmark Manager** - Save and organize links

### Intermediate Projects
1. **Blog Platform** - Posts, comments, likes
2. **Project Tracker** - Tasks, boards, teams
3. **Recipe Book** - Recipes, ingredients, ratings

### Advanced Projects
1. **SaaS with Stripe** - Subscriptions, billing, teams
2. **Social Network** - Friends, posts, messages
3. **Marketplace** - Products, orders, reviews

## Key Takeaways

1. **Be specific in requests** - Claude works best with clear requirements
2. **Build incrementally** - Database → API → UI
3. **Trust the patterns** - The `.cursorrules` ensure consistency
4. **Ask questions** - Claude can explain why it chose certain approaches
5. **Iterate quickly** - Build fast, test, refine

## Remember

You're not just getting code generation. You're getting:
- **Architecture decisions** - Cursor knows the right patterns
- **Best practices** - Error handling, validation, security
- **Type safety** - Full TypeScript integration
- **Consistency** - Every feature follows the same structure

This means you can focus on **what** to build, not **how** to build it.

Happy building! 🚀
