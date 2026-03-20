import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { requireBarberApi } from '@/lib/barber/api-auth'

/** PATCH — cancel */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const [updated] = await db
    .update(appointments)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(and(eq(appointments.id, id), eq(appointments.barberId, auth.user.id)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ data: updated })
}
