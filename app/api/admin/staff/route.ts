import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { asc, eq, or } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'

/** GET — all admin + barber accounts (linked users) with barber profile when present. */
export async function GET() {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const staffUsers = await db
    .select({
      user: users,
      barberId: barbers.id,
      barberName: barbers.name,
    })
    .from(users)
    .leftJoin(barbers, eq(barbers.userId, users.id))
    .where(or(eq(users.role, 'admin'), eq(users.role, 'barber')))
    .orderBy(asc(users.role), asc(users.email))

  const data = staffUsers.map(({ user: u, barberId, barberName }) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    barberProfileId: barberId,
    displayName: barberName ?? u.fullName ?? u.email,
  }))

  return NextResponse.json({ data })
}
