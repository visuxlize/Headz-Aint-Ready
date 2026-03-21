import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { blockedTimes } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { normalizeTimeSlot } from '@/lib/appointments/time'
import { resolveBarberUserIdForBlock } from '@/lib/blocked-times/resolve-barber-user-id'

const createSchema = z.object({
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  reason: z.string().max(200).optional(),
})

function toPgTime(s: string): string {
  return normalizeTimeSlot(s.includes(':') && s.split(':').length === 2 ? `${s}:00` : s)
}

/** POST /api/admin/blocked-times */
export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi()
    if ('error' in auth) return auth.error

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data

    const barberUserId = await resolveBarberUserIdForBlock(d.barberId)
    if (!barberUserId) {
      return NextResponse.json(
        {
          error:
            'Invalid barber: use a linked barber staff account, or run scripts/fix-blocked-times-barber-fk.sql if inserts still fail (FK may point at barbers.id instead of users.id).',
        },
        { status: 400 }
      )
    }

    const start = toPgTime(d.startTime)
    const end = toPgTime(d.endTime)

    const [row] = await db
      .insert(blockedTimes)
      .values({
        barberId: barberUserId,
        date: d.date,
        startTime: start,
        endTime: end,
        reason: d.reason ?? 'Block',
        createdBy: auth.user.id,
      })
      .returning()

    return NextResponse.json({ data: row }, { status: 201 })
  } catch (e) {
    console.error('POST /api/admin/blocked-times:', e)
    let msg = e instanceof Error ? e.message : 'Server error'
    const cause = e && typeof e === 'object' && 'cause' in e ? (e as { cause?: unknown }).cause : undefined
    if (cause instanceof Error && cause.message) {
      msg = `${msg} (${cause.message})`
    }
    if (
      typeof msg === 'string' &&
      (msg.includes('blocked_times_barber_id_fkey') || msg.includes('foreign key'))
    ) {
      msg =
        'Could not save block: database foreign key on blocked_times.barber_id may reference barbers(id) instead of users(id). Run scripts/fix-blocked-times-barber-fk.sql in Supabase SQL, then try again.'
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
