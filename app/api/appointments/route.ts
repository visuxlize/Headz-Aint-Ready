import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/schema'
import { and, eq, gte, lt } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  durationMinutes: z.coerce.number().min(15).max(120),
  clientName: z.string().min(1).max(200),
  clientPhone: z.string().max(50).optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  startAt: z.string().datetime(),
  isWalkIn: z.boolean().optional(),
})

/** GET /api/appointments?date=YYYY-MM-DD – list appointments for the day (staff only) */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
    }
    const dayStart = new Date(`${date}T09:00:00-04:00`)
    const dayEnd = new Date(`${date}T20:00:00-04:00`)
    const list = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.startAt, dayStart),
          lt(appointments.startAt, dayEnd),
          eq(appointments.status, 'confirmed')
        )
      )
    return NextResponse.json({ data: list })
  } catch (e) {
    console.error('GET /api/appointments', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/appointments – create a new appointment (public booking or staff walk-in) */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse({
      ...body,
      clientEmail: body.clientEmail || '',
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data
    const startAt = new Date(data.startAt)
    const endAt = new Date(startAt.getTime() + data.durationMinutes * 60 * 1000)

    const [appt] = await db
      .insert(appointments)
      .values({
        barberId: data.barberId,
        serviceId: data.serviceId,
        clientName: data.clientName,
        clientPhone: data.clientPhone || null,
        clientEmail: data.clientEmail || null,
        startAt,
        endAt,
        isWalkIn: data.isWalkIn ?? false,
        status: 'confirmed',
      })
      .returning()

    return NextResponse.json({ data: appt })
  } catch (e) {
    console.error('POST /api/appointments', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
