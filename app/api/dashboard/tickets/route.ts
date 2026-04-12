import { NextResponse } from 'next/server'
import { and, desc, eq, gte, isNotNull, lte, ne, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { barbers, posTransactions, services, users } from '@/lib/db/schema'
import type { PosLineItem } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { startOfNyDayUtc } from '@/lib/date/ny-bounds'
import {
  isMissingPosSourceColumnError,
  isMissingTicketDisplayColumnError,
  needsPosManualTicketDdls,
  postgresErrorText,
} from '@/lib/db/postgres-error'
import { runPosTransactionsManualTicketDdls } from '@/lib/db/pos-manual-ticket-ddl'

export const dynamic = 'force-dynamic'

function parseNum(v: string | null | undefined): number {
  if (v == null) return 0
  const n = Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

type TicketRow = {
  id: string
  customerName: string
  barberId: string | null
  barberProfileId: string | null
  barberName: string
  serviceId: string | null
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

    const key = r.barberProfileId ?? r.barberId
    if (!key) continue

    const prev = byBarber.get(key) ?? {
      barberId: key,
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
    byBarber.set(key, prev)
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
  const barberKey = r.barberProfileId ?? r.barberId ?? ''
  const serviceId =
    r.serviceId ?? (items?.[0]?.serviceId != null ? String(items[0].serviceId) : null)
  return {
    id: r.id,
    customerName: r.customerName,
    barberName: r.barberName,
    barberId: barberKey,
    serviceId,
    serviceName,
    total: parseNum(r.total),
    tipAmount: parseNum(r.tipAmount),
    paymentMethod: r.paymentMethod,
    createdAt: r.createdAt.toISOString(),
    source: r.source,
  }
}

const postSchema = z.object({
  barberProfileId: z.string().uuid(),
  customerName: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card']),
  serviceId: z.string().uuid(),
  tipAmount: z.number().min(0).optional(),
})

/** Run `scripts/add-pos-barber-profile-id.sql` in Supabase if this fires. */
function isMissingBarberProfileColumnError(e: unknown): boolean {
  const msg = postgresErrorText(e)
  return /barber_profile_id|column.*barber_profile|42703.*barber_profile/i.test(msg)
}

const ticketSelectBase = {
  id: posTransactions.id,
  customerName: posTransactions.customerName,
  barberId: posTransactions.barberId,
  barberProfileId: posTransactions.barberProfileId,
  barberName: sql<string>`coalesce(${users.fullName}, nullif(trim(${barbers.ticketDisplayName}), ''), ${barbers.name}, 'Staff')`,
  serviceId: posTransactions.serviceId,
  items: posTransactions.items,
  total: posTransactions.total,
  tipAmount: posTransactions.tipAmount,
  paymentMethod: posTransactions.paymentMethod,
  createdAt: posTransactions.createdAt,
} as const

/** Same as {@link ticketSelectBase} when `ticket_display_*` columns are not migrated yet. */
const ticketSelectBaseSansTicketUi = {
  id: posTransactions.id,
  customerName: posTransactions.customerName,
  barberId: posTransactions.barberId,
  barberProfileId: posTransactions.barberProfileId,
  barberName: sql<string>`coalesce(${users.fullName}, ${barbers.name}, 'Staff')`,
  serviceId: posTransactions.serviceId,
  items: posTransactions.items,
  total: posTransactions.total,
  tipAmount: posTransactions.tipAmount,
  paymentMethod: posTransactions.paymentMethod,
  createdAt: posTransactions.createdAt,
} as const

/** No `barber_profile_id` column — only rows with `barber_id` (staff) appear. */
const ticketSelectLegacyNoProfile = {
  id: posTransactions.id,
  customerName: posTransactions.customerName,
  barberId: posTransactions.barberId,
  barberName: sql<string>`coalesce(${users.fullName}, 'Staff')`,
  serviceId: posTransactions.serviceId,
  items: posTransactions.items,
  total: posTransactions.total,
  tipAmount: posTransactions.tipAmount,
  paymentMethod: posTransactions.paymentMethod,
  createdAt: posTransactions.createdAt,
} as const

function mapLegacyRow(
  r: {
    id: string
    customerName: string
    barberId: string | null
    barberName: string
    serviceId: string | null
    items: PosLineItem[] | null
    total: string
    tipAmount: string
    paymentMethod: string
    createdAt: Date
    source?: string | null
  },
  defaultSource: string
): TicketRow {
  return {
    id: r.id,
    customerName: r.customerName,
    barberId: r.barberId,
    barberProfileId: null,
    barberName: r.barberName,
    serviceId: r.serviceId,
    items: r.items,
    total: r.total,
    tipAmount: r.tipAmount,
    paymentMethod: r.paymentMethod,
    createdAt: r.createdAt,
    source: (r.source != null && r.source !== '') ? String(r.source) : defaultSource,
  }
}

/** Today’s tickets when DB has no `barber_profile_id` (migration not applied yet). Never selects `source` — column may not exist. */
async function fetchTodayTicketRowsLegacyDb(): Promise<TicketRow[]> {
  const dayStart = startOfNyDayUtc()
  const now = new Date()
  const dayWhere = and(
    gte(posTransactions.createdAt, dayStart),
    lte(posTransactions.createdAt, now),
    ne(posTransactions.paymentStatus, 'voided'),
    eq(posTransactions.paymentStatus, 'paid')
  )
  const where = and(dayWhere, isNotNull(posTransactions.barberId))

  const raw = await db
    .select({ ...ticketSelectLegacyNoProfile })
    .from(posTransactions)
    .leftJoin(users, eq(posTransactions.barberId, users.id))
    .where(where)
    .orderBy(desc(posTransactions.createdAt))
  return raw.map((row) =>
    mapLegacyRow(
      {
        ...row,
        total: String(row.total),
        tipAmount: String(row.tipAmount),
      },
      'manual'
    )
  )
}

async function fetchTodayTicketRows(): Promise<TicketRow[]> {
  const dayStart = startOfNyDayUtc()
  const now = new Date()
  const dayWhere = and(
    gte(posTransactions.createdAt, dayStart),
    lte(posTransactions.createdAt, now),
    ne(posTransactions.paymentStatus, 'voided'),
    eq(posTransactions.paymentStatus, 'paid')
  )
  const scopeBarber = or(isNotNull(posTransactions.barberId), isNotNull(posTransactions.barberProfileId))
  const where = and(dayWhere, scopeBarber)

  const run = async (
    base: typeof ticketSelectBase | typeof ticketSelectBaseSansTicketUi
  ): Promise<TicketRow[]> => {
    try {
      const raw = await db
        .select({
          ...base,
          source: posTransactions.source,
        })
        .from(posTransactions)
        .leftJoin(users, eq(posTransactions.barberId, users.id))
        .leftJoin(barbers, eq(posTransactions.barberProfileId, barbers.id))
        .where(where)
        .orderBy(desc(posTransactions.createdAt))
      return raw as TicketRow[]
    } catch (e) {
      if (!isMissingPosSourceColumnError(e)) throw e
      const raw = await db
        .select({ ...base })
        .from(posTransactions)
        .leftJoin(users, eq(posTransactions.barberId, users.id))
        .leftJoin(barbers, eq(posTransactions.barberProfileId, barbers.id))
        .where(where)
        .orderBy(desc(posTransactions.createdAt))
      return (raw as Omit<TicketRow, 'source'>[]).map((r) => ({ ...r, source: 'manual' }))
    }
  }

  try {
    return await run(ticketSelectBase)
  } catch (e) {
    if (isMissingBarberProfileColumnError(e)) {
      return fetchTodayTicketRowsLegacyDb()
    }
    if (isMissingTicketDisplayColumnError(e)) {
      return run(ticketSelectBaseSansTicketUi)
    }
    throw e
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

  const { barberProfileId, paymentMethod, serviceId, tipAmount } = parsed.data
  const tip = tipAmount ?? 0
  const customerName = (parsed.data.customerName?.trim() || 'Walk-in').trim() || 'Walk-in'

  let prof: { id: string; name: string; ticketDisplayName?: string | null } | undefined
  try {
    ;[prof] = await db
      .select({
        id: barbers.id,
        name: barbers.name,
        ticketDisplayName: barbers.ticketDisplayName,
      })
      .from(barbers)
      .where(and(eq(barbers.id, barberProfileId), eq(barbers.isActive, true)))
      .limit(1)
  } catch (e) {
    if (!isMissingTicketDisplayColumnError(e)) throw e
    ;[prof] = await db
      .select({ id: barbers.id, name: barbers.name })
      .from(barbers)
      .where(and(eq(barbers.id, barberProfileId), eq(barbers.isActive, true)))
      .limit(1)
  }

  if (!prof) {
    return NextResponse.json({ error: 'Invalid or inactive barber' }, { status: 400 })
  }

  const [svcRow] = await db
    .select({
      id: services.id,
      name: services.name,
      price: services.price,
    })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.isActive, true)))
    .limit(1)

  if (!svcRow) {
    return NextResponse.json({ error: 'Invalid or inactive service' }, { status: 400 })
  }

  const amount = Number.parseFloat(String(svcRow.price))
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid service price' }, { status: 400 })
  }

  const total = amount + tip
  const items: PosLineItem[] = [{ serviceId: svcRow.id, name: svcRow.name, price: amount.toFixed(2) }]

  const baseInsert = {
    customerName,
    barberId: null as string | null,
    barberProfileId: prof.id,
    appointmentId: null,
    serviceId: svcRow.id,
    items,
    subtotal: amount.toFixed(2),
    tipAmount: tip.toFixed(2),
    total: total.toFixed(2),
    paymentMethod,
    paymentStatus: 'paid' as const,
  }

  try {
    let inserted: typeof posTransactions.$inferSelect | undefined
    let lastInsertError: unknown

    const insertWithSource = () =>
      db.insert(posTransactions).values({ ...baseInsert, source: 'manual' as const }).returning()
    const insertNoSource = () => db.insert(posTransactions).values(baseInsert).returning()

    try {
      ;[inserted] = await insertWithSource()
    } catch (e) {
      lastInsertError = e
      if (needsPosManualTicketDdls(e)) {
        const migrated = await runPosTransactionsManualTicketDdls()
        if (migrated) {
          try {
            ;[inserted] = await insertWithSource()
          } catch (e2) {
            lastInsertError = e2
            if (isMissingPosSourceColumnError(e2)) {
              ;[inserted] = await insertNoSource()
            } else {
              lastInsertError = e2
            }
          }
        }
      } else if (isMissingPosSourceColumnError(e)) {
        try {
          ;[inserted] = await insertNoSource()
        } catch (e2) {
          lastInsertError = e2
          if (needsPosManualTicketDdls(e2)) {
            const migrated = await runPosTransactionsManualTicketDdls()
            if (migrated) {
              ;[inserted] = await insertNoSource()
            } else {
              lastInsertError = e2
            }
          } else {
            lastInsertError = e2
          }
        }
      } else {
        lastInsertError = e
      }

      if (!inserted && needsPosManualTicketDdls(lastInsertError)) {
        const [link] = await db
          .select({ userId: barbers.userId })
          .from(barbers)
          .where(eq(barbers.id, barberProfileId))
          .limit(1)
        const staffUserId = link?.userId

        if (staffUserId) {
          const legacyInsert = {
            customerName,
            barberId: staffUserId,
            appointmentId: null as string | null,
            serviceId: svcRow.id,
            items,
            subtotal: amount.toFixed(2),
            tipAmount: tip.toFixed(2),
            total: total.toFixed(2),
            paymentMethod,
            paymentStatus: 'paid' as const,
          }
          try {
            ;[inserted] = await db
              .insert(posTransactions)
              .values({ ...legacyInsert, source: 'manual' as const })
              .returning()
          } catch (e2) {
            if (!isMissingPosSourceColumnError(e2)) throw e2
            ;[inserted] = await db.insert(posTransactions).values(legacyInsert).returning()
          }
        }

        if (!inserted) {
          return NextResponse.json(
            {
              error:
                'Manual tickets need `barber_profile_id` on `pos_transactions` (and nullable `barber_id`), or a staff login linked to this barber. Automatic migration failed — use a direct Postgres URL for DDL: set `DATABASE_URL_NON_POOLING` to Supabase Connect → **Direct**, or run `scripts/add-pos-barber-profile-id.sql` in the SQL Editor.',
            },
            { status: 503 }
          )
        }
      } else if (!inserted) {
        throw lastInsertError
      }
    }

    if (!inserted) {
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    const barberName = (prof.ticketDisplayName?.trim() || prof.name).trim()
    const rowSource = (inserted as { source?: string }).source ?? 'manual'

    const ticketRow: TicketRow = {
      id: inserted.id,
      customerName: inserted.customerName,
      barberId: inserted.barberId,
      barberProfileId: (inserted as { barberProfileId?: string | null }).barberProfileId ?? prof.id,
      barberName,
      serviceId: inserted.serviceId ?? svcRow.id,
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
