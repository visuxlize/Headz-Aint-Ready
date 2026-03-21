import { NextResponse } from 'next/server'
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { posTransactions, users } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'

export const dynamic = 'force-dynamic'

function friendlyPaymentsError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (/relation ["']?pos_transactions["']? does not exist/i.test(raw)) {
    return 'Database is missing the payments table. In Supabase → SQL Editor, run scripts/ensure-pos-payments-schema.sql, then refresh.'
  }
  if (/relation ["']?square_devices["']? does not exist/i.test(raw)) {
    return 'Database is missing Square device tables. Run scripts/ensure-pos-payments-schema.sql in Supabase.'
  }
  if (/Failed query:/i.test(raw)) {
    return 'Could not load payments from the database. If this persists, run scripts/ensure-pos-payments-schema.sql in Supabase (or check DATABASE_URL).'
  }
  return raw
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

  const conditions = []
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

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  try {
    const rows = await db
      .select({
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
      })
      .from(posTransactions)
      .leftJoin(users, eq(posTransactions.barberId, users.id))
      .where(whereClause)
      .orderBy(desc(posTransactions.createdAt))
      .limit(500)

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
