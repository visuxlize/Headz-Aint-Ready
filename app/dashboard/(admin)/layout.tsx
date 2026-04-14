import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { resolveDbUserForAuth } from '@/lib/auth/resolve-db-user'

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

  const dbUser = await resolveDbUserForAuth({ authUserId: user.id, authEmail: user.email })
  if (!dbUser) redirect('/auth/login')
  if (dbUser.mustChangePassword) {
    redirect('/dashboard/force-password-change')
  }
  if (dbUser.role === 'barber') {
    redirect('/dashboard/barber')
  }
  if (dbUser.role !== 'admin') {
    redirect('/dashboard/barber')
  }

  return <DashboardShell userEmail={user.email ?? ''}>{children}</DashboardShell>
}
