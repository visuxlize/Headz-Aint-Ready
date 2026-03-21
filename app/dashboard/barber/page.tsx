import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { BarberDashboardClient } from '@/components/barber/BarberDashboardClient'

export default async function BarberSchedulePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [b] = await db.select().from(barbers).where(eq(barbers.userId, user.id)).limit(1)
  const [u] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  const name = b?.name ?? u?.fullName ?? 'Barber'
  const parts = name.trim().split(/\s+/)
  const initials =
    parts.length >= 2
      ? `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
      : name.slice(0, 2).toUpperCase()

  return (
    <BarberDashboardClient
      userId={user.id}
      displayName={name}
      barberColumn={{
        id: user.id,
        name,
        initials,
        avatarUrl: b?.avatarUrl ?? u?.avatarUrl ?? null,
      }}
    />
  )
}
