import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, barbers, staffAllowlist, users } from '@/lib/db/schema'
import { and, eq, gt } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { nyTodayDateString } from '@/lib/appointments/time'

const patchSchema = z.object({
  isActive: z.boolean(),
})

/** PATCH — deactivate / reactivate barber (users + barbers rows) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  if (id === auth.user.id) {
    return NextResponse.json({ error: 'You cannot change your own active status here.' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const { isActive } = parsed.data

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!target || target.role !== 'barber') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (isActive === false) {
    const today = nyTodayDateString()
    const blocking = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        timeSlot: appointments.timeSlot,
        customerName: appointments.customerName,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.barberId, id),
          eq(appointments.status, 'pending'),
          gt(appointments.appointmentDate, today)
        )
      )

    if (blocking.length > 0) {
      return NextResponse.json(
        {
          error: 'This barber has future pending appointments. Reassign or cancel them first.',
          blockingAppointments: blocking,
        },
        { status: 409 }
      )
    }
  }

  const now = new Date()
  await db.update(users).set({ isActive, updatedAt: now }).where(eq(users.id, id))
  await db.update(barbers).set({ isActive, updatedAt: now }).where(eq(barbers.userId, id))

  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return NextResponse.json({ data: u })
}

/** DELETE — permanently remove linked barber account (auth + DB). Blocked if any appointments exist. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  if (id === auth.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account here.' }, { status: 400 })
  }

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!target || target.role !== 'barber') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existingAppts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.barberId, id))
    .limit(1)
  if (existingAppts.length > 0) {
    return NextResponse.json(
      {
        error:
          'This barber has appointments in the system. Reassign or remove those records before permanent deletion.',
      },
      { status: 409 }
    )
  }

  const em = target.email?.trim().toLowerCase()
  if (em) {
    await db.delete(staffAllowlist).where(eq(staffAllowlist.email, em))
  }

  await db.delete(barbers).where(eq(barbers.userId, id))
  await db.delete(users).where(eq(users.id, id))

  try {
    const supabase = createServiceRoleClient()
    await supabase.auth.admin.deleteUser(id)
  } catch (e) {
    console.error('Supabase auth deleteUser:', e)
    return NextResponse.json(
      {
        error:
          'Database profile removed but auth user deletion failed. Remove the user manually in Supabase Dashboard if needed.',
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
