import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']).optional(),
}).refine(
  (data) => {
    if (data.startAt != null && data.endAt != null) {
      return new Date(data.endAt).getTime() > new Date(data.startAt).getTime()
    }
    return true
  },
  { message: 'endAt must be after startAt' }
)

/** PATCH /api/appointments/[id] – reschedule (startAt/endAt) or cancel (status) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid or missing appointment id' }, { status: 400 })
    }
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()
    const setPayload: {
      updatedAt: Date
      status?: string
      startAt?: Date
      endAt?: Date
    } = { updatedAt: now }
    if (data.status != null) setPayload.status = data.status
    if (data.startAt != null) setPayload.startAt = new Date(data.startAt)
    if (data.endAt != null) setPayload.endAt = new Date(data.endAt)

    const [updated] = await db
      .update(appointments)
      .set(setPayload)
      .where(eq(appointments.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    return NextResponse.json({ data: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('PATCH /api/appointments/[id]', e)
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    )
  }
}
