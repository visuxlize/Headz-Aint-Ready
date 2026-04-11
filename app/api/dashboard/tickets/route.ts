import { NextResponse } from 'next/server'
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { posTransactions, users } from '@/lib/db/schema'
import type { PosLineItem } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { startOfNyDayUtc } from '@/lib/date/ny-bounds'
import { isMissingPosSourceColumnError } from '@/lib/db/pos-source-column-error'

export const dynamic = 'force-dynamic'

function parseNum(v: string | null | undefined): number {
  if (v == null) return 0
  const n = Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

type TicketRow = {
  id: string
  customerName: string
  barberId: string
  barberName: string
  items: PosLineItem[] | null
  total: string
  tipAmount: string
  paymentMethod: string
  createdAt: Date
  source: string
}

type BarberTotal = {
  barberId: string
  barberName: string
  cash: number
  card: number
  tickets: number
  total: number
}

function computeTotals(rows: TicketRow[]) {
  let cash = 0
  let card = 0
  const byBarber = new Map<string, BarberTotal>()

  for (const r of rows) {
    const t = parseNum(r.total)
    if (r.paymentMethod === 'cash') cash += t
    else if (r.paymentMethod === 'card') card += t

    const prev = byBarber.get(r.barberId) ?? {
      barberId: r.barberId,
      barberName: r.barberName,
      cash: 0,
      card: 0,
      tickets: 0,
      total: 0,
    }
    prev.tickets += 1
    prev.total += t
    if (r.paymentMethod === 'cash') prev.cash += t
    if (r.paymentMethod === 'card') prev.card += t
    byBarber.set(r.barberId, prev)
  }

  const byBarberList = [...byBarber.values()].sort((a, b) => b.total - a.total)

  return {
    cash,
    card,
    count: rows.length,
    byBarber: byBarberList,
  }
}

function toTicketPayload(r: TicketRow) {
  const items = r.items
  const serviceName =
    items && items.length > 0 && items[0]?.name ? (items[0].name as string) : null
  return {
    id: r.id,
    customerName: r.customerName,
    barberName: r.barberName,
    barberId: r.barberId,
    serviceName,
    total: parseNum(r.total),
    tipAmount: parseNum(r.tipAmount),
    paymentMethod: r.paymentMethod,
    createdAt: r.createdAt.toISOString(),
    source: r.source,
  }
}

const postSchema = z.object({
  barberId: z.string().uuid(),
  customerName: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card']),
  amount: z.number().positive(),
  tipAmount: z.number().min(0).optional(),
  serviceLabel: z.string().optional(),
})

const ticketSelectBase = {
  id: posTransactions.id,
  customerName: posTransactions.customerName,
  barberId: posTransactions.barberId,
  barberName: sql<string>`coalesce(${users.fullName}, 'Staff')`,
  items: posTransactions.items,
  total: posTransactions.total,
  tipAmount: posTransactions.tipAmount,
  paymentMethod: posTransactions.paymentMethod,
  createdAt: posTransactions.createdAt,
} as const

async function fetchTodayTicketRows(): Promise<TicketRow[]> {
  const dayStart = startOfNyDayUtc()
  const now = new Date()
  const where = and(
    gte(posTransactions.createdAt, dayStart),
    lte(posTransactions.createdAt, now),
    ne(posTransactions.paymentStatus, 'voided'),
    eq(posTransactions.paymentStatus, 'paid')
  )

  try {
    const raw = await db
      .select({
        ...ticketSelectBase,
        source: posTransactions.source,
      })
      .from(posTransactions)
      .innerJoin(users, eq(posTransactions.barberId, users.id))
      .where(where)
      .orderBy(desc(posTransactions.createdAt))
    return raw as TicketRow[]
  } catch (e) {
    if (!isMissingPosSourceColumnError(e)) throw e
    const raw = await db
      .select({ ...ticketSelectBase })
      .from(posTransactions)
      .innerJoin(users, eq(posTransactions.barberId, users.id))
      .where(where)
      .orderBy(desc(posTransactions.createdAt))
    return (raw as Omit<TicketRow, 'source'>[]).map((r) => ({ ...r, source: 'manual' }))
  }
}

/** GET — today's POS tickets (NY day, paid/non-voided). POST — manual ticket. */
export async function GET() {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  try {
    const rows = await fetchTodayTicketRows()
    const totals = computeTotals(rows)
    const tickets = rows.map(toTicketPayload)

    return NextResponse.json({ tickets, totals })
  } catch (e) {
    console.error('GET /api/dashboard/tickets', e)
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { barberId, paymentMethod, amount, tipAmount, serviceLabel } = parsed.data
  const tip = tipAmount ?? 0
  const total = amount + tip
  const customerName = (parsed.data.customerName?.trim() || 'Walk-in').trim() || 'Walk-in'

  const items: PosLineItem[] | null = serviceLabel?.trim()
    ? [{ name: serviceLabel.trim(), price: amount.toFixed(2) }]
    : null

  const baseInsert = {
    customerName,
    barberId,
    appointmentId: null,
    serviceId: null,
    items,
    subtotal: amount.toFixed(2),
    tipAmount: tip.toFixed(2),
    total: total.toFixed(2),
    paymentMethod,
    paymentStatus: 'paid' as const,
  }

  try {
    let inserted: typeof posTransactions.$inferSelect | undefined
    try {
      ;[inserted] = await db
        .insert(posTransactions)
        .values({ ...baseInsert, source: 'manual' })
        .returning()
    } catch (e) {
      if (!isMissingPosSourceColumnError(e)) throw e
      ;[inserted] = await db.insert(posTransactions).values(baseInsert).returning()
    }

    if (!inserted) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    const [u] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, barberId)).limit(1)
    const barberName = u?.fullName ?? 'Staff'
    const rowSource = (inserted as { source?: string }).source ?? 'manual'

    const ticketRow: TicketRow = {
      id: inserted.id,
      customerName: inserted.customerName,
      barberId: inserted.barberId,
      barberName,
      items: inserted.items as PosLineItem[] | null,
      total: String(inserted.total),
      tipAmount: String(inserted.tipAmount),
      paymentMethod: inserted.paymentMethod,
      createdAt: inserted.createdAt,
      source: rowSource,
    }

    const todayRows = await fetchTodayTicketRows()
    const totals = computeTotals(todayRows)

    return NextResponse.json({
      ticket: toTicketPayload(ticketRow),
      totals,
    })
  } catch (e) {
    console.error('POST /api/dashboard/tickets', e)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
