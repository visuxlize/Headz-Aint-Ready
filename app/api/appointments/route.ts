import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { appointments, barbers } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { isoToNyDateAndTime } from '@/lib/appointments/time'

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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
    }
    const list = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.appointmentDate, date),
          eq(appointments.status, 'pending')
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

    const [barberRow] = await db.select().from(barbers).where(eq(barbers.id, data.barberId)).limit(1)
    if (!barberRow?.userId) {
      return NextResponse.json(
        { error: 'This barber is not linked to a staff account yet; booking is unavailable.' },
        { status: 400 }
      )
    }

    const { date: appointmentDate, timeSlot } = isoToNyDateAndTime(data.startAt)

    const [appt] = await db
      .insert(appointments)
      .values({
        barberId: barberRow.userId,
        serviceId: data.serviceId,
        customerName: data.clientName,
        customerPhone: data.clientPhone || null,
        customerEmail: data.clientEmail || null,
        appointmentDate,
        timeSlot,
        isWalkIn: data.isWalkIn ?? false,
        status: 'pending',
      })
      .returning()

    return NextResponse.json({ data: appt })
  } catch (e) {
    console.error('POST /api/appointments', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
