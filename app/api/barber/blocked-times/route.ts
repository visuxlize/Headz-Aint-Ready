import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { blockedTimes } from '@/lib/db/schema'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { normalizeTimeSlot } from '@/lib/appointments/time'

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  reason: z.string().max(200).optional(),
})

function toPgTime(s: string): string {
  return normalizeTimeSlot(s.includes(':') && s.split(':').length === 2 ? `${s}:00` : s)
}

/** POST /api/barber/blocked-times */
export async function POST(request: Request) {
  try {
    const auth = await requireBarberApi()
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
    const start = toPgTime(d.startTime)
    const end = toPgTime(d.endTime)

    const [row] = await db
      .insert(blockedTimes)
      .values({
        barberId: auth.user.id,
        date: d.date,
        startTime: start,
        endTime: end,
        reason: d.reason ?? 'Block',
        createdBy: auth.user.id,
      })
      .returning()

    return NextResponse.json({ data: row }, { status: 201 })
  } catch (e) {
    console.error('POST /api/barber/blocked-times:', e)
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
