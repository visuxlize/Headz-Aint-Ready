import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { services } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { requireBarberApi } from '@/lib/barber/api-auth'

/** GET /api/barber/services — active services for booking modal */
export async function GET() {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const list = await db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.displayOrder), asc(services.name))

  return NextResponse.json({ data: list })
}
