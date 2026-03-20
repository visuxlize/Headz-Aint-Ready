import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barberTimeOff, timeOffRequests } from '@/lib/db/schema'
import { and, eq, gte, lte } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'

function ymd(year: number, month1to12: number, day: number) {
  return `${year}-${String(month1to12).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** GET — day highlights for month grid: pending count + barber_time_off (approved blocks) */
export async function GET(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  const start = ymd(year, month, 1)
  const lastDay = new Date(year, month, 0).getDate()
  const end = ymd(year, month, lastDay)

  const pendingList = await db
    .select({ requestedDate: timeOffRequests.requestedDate })
    .from(timeOffRequests)
    .where(
      and(
        eq(timeOffRequests.status, 'pending'),
        gte(timeOffRequests.requestedDate, start),
        lte(timeOffRequests.requestedDate, end)
      )
    )

  const pendingCount = new Map<string, number>()
  for (const p of pendingList) {
    pendingCount.set(p.requestedDate, (pendingCount.get(p.requestedDate) ?? 0) + 1)
  }

  const blocks = await db
    .select({
      startDate: barberTimeOff.startDate,
      endDate: barberTimeOff.endDate,
    })
    .from(barberTimeOff)
    .where(and(lte(barberTimeOff.startDate, end), gte(barberTimeOff.endDate, start)))

  const days: Record<string, { pending: number; approvedBlock: boolean }> = {}

  for (let d = 1; d <= lastDay; d++) {
    const key = ymd(year, month, d)
    days[key] = { pending: pendingCount.get(key) ?? 0, approvedBlock: false }
  }

  for (const b of blocks) {
    const s = String(b.startDate)
    const e = String(b.endDate)
    for (let d = 1; d <= lastDay; d++) {
      const key = ymd(year, month, d)
      if (key >= s && key <= e && days[key]) {
        days[key].approvedBlock = true
      }
    }
  }

  return NextResponse.json({ data: { start, end, days } })
}
