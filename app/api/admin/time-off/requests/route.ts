import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, timeOffRequests } from '@/lib/db/schema'
import { and, desc, eq, gte, lte, or } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'

/** GET — list time off requests (pending queue, history, or single day for calendar panel) */
export async function GET(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // pending | approved | denied | resolved (approved+denied) | all
  const barberId = searchParams.get('barberId')
  const month = searchParams.get('month') // YYYY-MM
  const date = searchParams.get('date') // YYYY-MM-DD exact day

  const conditions = []

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    conditions.push(eq(timeOffRequests.requestedDate, date))
  } else {
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number)
      const start = `${month}-01`
      const lastDay = new Date(y, m, 0).getDate()
      const end = `${month}-${String(lastDay).padStart(2, '0')}`
      conditions.push(and(gte(timeOffRequests.requestedDate, start), lte(timeOffRequests.requestedDate, end)))
    }

    if (status && status !== 'all') {
      if (status === 'resolved') {
        conditions.push(or(eq(timeOffRequests.status, 'approved'), eq(timeOffRequests.status, 'denied')))
      } else {
        conditions.push(eq(timeOffRequests.status, status))
      }
    }
  }

  if (barberId && /^[0-9a-f-]{36}$/i.test(barberId)) {
    conditions.push(eq(timeOffRequests.barberId, barberId))
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions)

  const base = db
    .select({
      id: timeOffRequests.id,
      barberId: timeOffRequests.barberId,
      requestedDate: timeOffRequests.requestedDate,
      reason: timeOffRequests.reason,
      status: timeOffRequests.status,
      reviewedBy: timeOffRequests.reviewedBy,
      reviewedAt: timeOffRequests.reviewedAt,
      denialReason: timeOffRequests.denialReason,
      createdAt: timeOffRequests.createdAt,
      barberName: barbers.name,
      barberProfileId: barbers.id,
    })
    .from(timeOffRequests)
    .innerJoin(barbers, eq(barbers.userId, timeOffRequests.barberId))

  const rows = await (whereClause ? base.where(whereClause) : base).orderBy(desc(timeOffRequests.createdAt))

  return NextResponse.json({ data: rows })
}
