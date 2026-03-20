import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { availability, barbers } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { minutesToPgTime } from '@/lib/appointments/time'

const bodySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startMinutes: z.number().min(0).max(24 * 60 - 1),
  endMinutes: z.number().min(0).max(24 * 60),
})

/** POST – add a weekly availability window */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: barberProfileId } = await params
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const { dayOfWeek, startMinutes, endMinutes } = parsed.data
    if (endMinutes <= startMinutes) {
      return NextResponse.json({ error: 'End must be after start' }, { status: 400 })
    }

    const [barberRow] = await db.select().from(barbers).where(eq(barbers.id, barberProfileId)).limit(1)
    if (!barberRow?.userId) {
      return NextResponse.json(
        { error: 'Barber must be linked to a staff user before setting availability.' },
        { status: 400 }
      )
    }

    const [row] = await db
      .insert(availability)
      .values({
        barberId: barberRow.userId,
        dayOfWeek,
        startTime: minutesToPgTime(startMinutes),
        endTime: minutesToPgTime(endMinutes),
        isActive: true,
      })
      .returning()
    return NextResponse.json({ data: row })
  } catch (e) {
    console.error('POST /api/barbers/[id]/availability', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE – remove an availability window */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: barberProfileId } = await params
    const { searchParams } = new URL(request.url)
    const availabilityId = searchParams.get('id')
    if (!availabilityId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const [barberRow] = await db.select().from(barbers).where(eq(barbers.id, barberProfileId)).limit(1)
    if (!barberRow?.userId) {
      return NextResponse.json({ error: 'Barber has no linked staff user.' }, { status: 400 })
    }

    await db
      .delete(availability)
      .where(
        and(eq(availability.id, availabilityId), eq(availability.barberId, barberRow.userId))
      )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/barbers/[id]/availability', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
