import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { computeBarberSlotIsoStrings } from '@/lib/barber/compute-slots'

const querySchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().min(15).max(120),
})

/** GET /api/appointments/slots?barberId=&date=&durationMinutes=
 * barberId is the barbers table id (public profile).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      barberId: searchParams.get('barberId'),
      date: searchParams.get('date'),
      durationMinutes: searchParams.get('durationMinutes'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid params', details: parsed.error.flatten() }, { status: 400 })
    }
    const { barberId, date, durationMinutes } = parsed.data

    const [barberRow] = await db.select().from(barbers).where(eq(barbers.id, barberId)).limit(1)
    if (!barberRow?.userId) {
      return NextResponse.json({ slots: [] })
    }
    const [barberUser] = await db.select().from(users).where(eq(users.id, barberRow.userId)).limit(1)
    if (!barberUser?.isActive) {
      return NextResponse.json({ slots: [] })
    }

    const slots = await computeBarberSlotIsoStrings({
      barberProfileId: barberId,
      barberUserId: barberRow.userId,
      date,
      durationMinutes,
    })
    return NextResponse.json({ slots })
  } catch (e) {
    console.error('GET /api/appointments/slots', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
