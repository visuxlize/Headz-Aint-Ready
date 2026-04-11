import { NextResponse } from 'next/server'
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { isMissingPosSourceColumnError } from '@/lib/db/pos-source-column-error'
import { posTransactions, users } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'

export const dynamic = 'force-dynamic'

function friendlyPaymentsError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  console.error('[payments API]', raw)
  if (/relation ["']?pos_transactions["']? does not exist/i.test(raw)) {
    return 'Payment history is temporarily unavailable. Try again later or ask your shop admin for help.'
  }
  if (/relation ["']?square_devices["']? does not exist/i.test(raw)) {
    return 'Payment history is temporarily unavailable. Try again later or ask your shop admin for help.'
  }
  return 'Could not load payment history. Please refresh the page or try again in a moment.'
}

async function sumPaidSince(method: 'card' | 'cash', since: Date) {
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${posTransactions.total}::numeric), 0)`,
    })
    .from(posTransactions)
    .where(
      and(
        eq(posTransactions.paymentStatus, 'paid'),
        eq(posTransactions.paymentMethod, method),
        gte(posTransactions.createdAt, since)
      )
    )
  return Number(row?.total ?? 0)
}

/** GET /api/dashboard/payments — admin POS transaction list */
export async function GET(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const method = searchParams.get('method')
  const barberId = searchParams.get('barberId')
  const q = searchParams.get('q')?.trim()
  const sourceFilter = searchParams.get('source')

  const conditions: SQL[] = []
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    conditions.push(gte(posTransactions.createdAt, new Date(`${from}T00:00:00`)))
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    conditions.push(lte(posTransactions.createdAt, new Date(`${to}T23:59:59.999`)))
  }
  if (method === 'card' || method === 'cash') {
    conditions.push(eq(posTransactions.paymentMethod, method))
  }
  if (barberId && /^[0-9a-f-]{36}$/i.test(barberId)) {
    conditions.push(eq(posTransactions.barberId, barberId))
  }
  if (q) {
    conditions.push(ilike(posTransactions.customerName, `%${q}%`))
  }

  const wantManualOnly = sourceFilter === 'manual'

  const paymentSelectBase = {
    id: posTransactions.id,
    customerName: posTransactions.customerName,
    barberId: posTransactions.barberId,
    barberName: sql<string | null>`coalesce(${users.fullName}, 'Staff')`,
    items: posTransactions.items,
    subtotal: posTransactions.subtotal,
    tipAmount: posTransactions.tipAmount,
    total: posTransactions.total,
    paymentMethod: posTransactions.paymentMethod,
    paymentStatus: posTransactions.paymentStatus,
    squarePaymentId: posTransactions.squarePaymentId,
    cardBrand: posTransactions.cardBrand,
    cardLastFour: posTransactions.cardLastFour,
    refundedAt: posTransactions.refundedAt,
    createdAt: posTransactions.createdAt,
  } as const

  const whereWithSourceColumn = () => {
    const c = [...conditions]
    if (wantManualOnly) c.push(eq(posTransactions.source, 'manual'))
    return c.length > 0 ? and(...c) : undefined
  }

  /** Without `source` column we cannot filter manual rows — return none for that tab. */
  const whereWithoutSourceColumn = () => {
    const c = [...conditions]
    if (wantManualOnly) c.push(sql`false`)
    if (c.length === 0) return undefined
    return and(...c)
  }

  type PaymentsListRow = {
    id: string
    customerName: string
    barberId: string
    barberName: string | null
    items: unknown
    subtotal: string
    tipAmount: string
    total: string
    paymentMethod: string
    paymentStatus: string
    squarePaymentId: string | null
    cardBrand: string | null
    cardLastFour: string | null
    refundedAt: Date | null
    createdAt: Date
    source: string
  }

  try {
    let rows: PaymentsListRow[]
    try {
      rows = (await db
        .select({
          ...paymentSelectBase,
          source: posTransactions.source,
        })
        .from(posTransactions)
        .leftJoin(users, eq(posTransactions.barberId, users.id))
        .where(whereWithSourceColumn())
        .orderBy(desc(posTransactions.createdAt))
        .limit(500)) as PaymentsListRow[]
    } catch (e) {
      if (!isMissingPosSourceColumnError(e)) throw e
      const raw = await db
        .select({ ...paymentSelectBase })
        .from(posTransactions)
        .leftJoin(users, eq(posTransactions.barberId, users.id))
        .where(whereWithoutSourceColumn())
        .orderBy(desc(posTransactions.createdAt))
        .limit(500)
      rows = raw.map((r) => ({ ...r, source: 'unknown' })) as PaymentsListRow[]
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      todayCard,
      todayCash,
      weekCard,
      weekCash,
      monthCard,
      monthCash,
      pendingCount,
    ] = await Promise.all([
      sumPaidSince('card', startOfDay),
      sumPaidSince('cash', startOfDay),
      sumPaidSince('card', startOfWeek),
      sumPaidSince('cash', startOfWeek),
      sumPaidSince('card', monthStart),
      sumPaidSince('cash', monthStart),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(posTransactions)
        .where(eq(posTransactions.paymentStatus, 'pending')),
    ])

    const barberList = await db
      .select({ id: users.id, name: users.fullName })
      .from(users)
      .where(eq(users.role, 'barber'))

    return NextResponse.json({
      summary: {
        today: { card: todayCard, cash: todayCash },
        week: { card: weekCard, cash: weekCash },
        month: { card: monthCard, cash: monthCash },
        pending: pendingCount[0]?.c ?? 0,
      },
      barbers: barberList,
      transactions: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        refundedAt: r.refundedAt?.toISOString() ?? null,
      })),
    })
  } catch (e) {
    console.error('GET /api/dashboard/payments', e)
    return NextResponse.json({ error: friendlyPaymentsError(e) }, { status: 500 })
  }
}
