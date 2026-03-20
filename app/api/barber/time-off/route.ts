import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { db } from '@/lib/db'
import { appointments, timeOffRequests } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { STORE_TZ } from '@/lib/appointments/time'

const postSchema = z.object({
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
})

export async function GET() {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const rows = await db
    .select()
    .from(timeOffRequests)
    .where(eq(timeOffRequests.barberId, auth.user.id))
    .orderBy(desc(timeOffRequests.createdAt))

  return NextResponse.json({ data: rows })
}

export async function POST(request: Request) {
  const auth = await requireBarberApi()
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

  const todayStr = format(toZonedTime(new Date(), STORE_TZ), 'yyyy-MM-dd')
  if (parsed.data.requestedDate <= todayStr) {
    return NextResponse.json({ error: 'Pick a future date.' }, { status: 400 })
  }

  const [pendingAppt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.barberId, auth.user.id),
        eq(appointments.appointmentDate, parsed.data.requestedDate),
        eq(appointments.status, 'pending')
      )
    )
    .limit(1)

  if (pendingAppt) {
    return NextResponse.json(
      {
        error:
          'You already have a pending appointment that day. Cancel it in your schedule before requesting time off.',
      },
      { status: 400 }
    )
  }

  const [row] = await db
    .insert(timeOffRequests)
    .values({
      barberId: auth.user.id,
      requestedDate: parsed.data.requestedDate,
      reason: parsed.data.reason?.trim() || null,
      status: 'pending',
    })
    .returning()

  return NextResponse.json({ data: row }, { status: 201 })
}
