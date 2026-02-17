import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { barberTimeOff } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: barberId } = await params
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: barberId } = await params
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
