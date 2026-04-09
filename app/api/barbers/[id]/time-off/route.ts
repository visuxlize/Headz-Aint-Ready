import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barberTimeOff, barbers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { requireBarberUserId } from '@/lib/staff/barber-scope'

const bodySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['time_off', 'sick', 'other']).default('time_off'),
  notes: z.string().max(500).nullable().optional(),
})

/** POST – add time off */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApi()
    if ('error' in auth) return auth.error

    const { id: barberProfileId } = await params
    const [profile] = await db.select().from(barbers).where(eq(barbers.id, barberProfileId)).limit(1)
    if (!profile) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }
    if (!profile.userId) {
      return NextResponse.json({ error: 'Barber is not linked to a staff account.' }, { status: 400 })
    }
    const scoped = requireBarberUserId(auth, profile.userId)
    if (scoped) return scoped

    const barberId = barberProfileId
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const { startDate, endDate, type, notes } = parsed.data
    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 })
    }

    const [row] = await db
      .insert(barberTimeOff)
      .values({ barberId, startDate, endDate, type, notes: notes ?? null })
      .returning()
    return NextResponse.json({ data: row })
  } catch (e) {
    console.error('POST /api/barbers/[id]/time-off', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE – remove a time-off entry */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffApi()
    if ('error' in auth) return auth.error

    const { id: barberProfileId } = await params
    const [profile] = await db.select().from(barbers).where(eq(barbers.id, barberProfileId)).limit(1)
    if (!profile?.userId) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }
    const scoped = requireBarberUserId(auth, profile.userId)
    if (scoped) return scoped

    const barberId = barberProfileId
    const { searchParams } = new URL(request.url)
    const timeOffId = searchParams.get('id')
    if (!timeOffId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    await db
      .delete(barberTimeOff)
      .where(
        and(
          eq(barberTimeOff.id, timeOffId),
          eq(barberTimeOff.barberId, barberId)
        )
      )
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/barbers/[id]/time-off', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
