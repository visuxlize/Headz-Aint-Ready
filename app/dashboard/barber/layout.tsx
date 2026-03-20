import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { BarberDashboardShell } from '@/components/barber/BarberDashboardShell'

export default async function BarberDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!dbUser) redirect('/auth/login')
  if (dbUser.role === 'admin') redirect('/dashboard')
  if (dbUser.role !== 'barber') redirect('/dashboard')

  const [barber] = await db.select().from(barbers).where(eq(barbers.userId, user.id)).limit(1)
  const displayName = barber?.name ?? dbUser.fullName ?? user.email?.split('@')[0] ?? 'Barber'

  return (
    <BarberDashboardShell barberName={displayName} avatarUrl={barber?.avatarUrl ?? dbUser.avatarUrl ?? null}>
      {children}
    </BarberDashboardShell>
  )
}
