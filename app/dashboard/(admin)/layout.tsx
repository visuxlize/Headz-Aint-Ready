import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** Admin-only shell: barbers use /dashboard/barber. */
export default async function AdminDashboardLayout({
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
  if (dbUser.role === 'barber') {
    redirect('/dashboard/barber')
  }
  if (dbUser.role !== 'admin') {
    redirect('/dashboard/barber')
  }

  return <DashboardShell userEmail={user.email ?? ''}>{children}</DashboardShell>
}
