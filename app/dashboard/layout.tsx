import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { db } from '@/lib/db'
import { staffAllowlist } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const email = user.email?.trim().toLowerCase()
  if (!email) {
    await supabase.auth.signOut()
    redirect('/auth/login?error=unauthorized')
  }

  try {
    const [allowed] = await db
      .select()
      .from(staffAllowlist)
      .where(eq(staffAllowlist.email, email))
      .limit(1)
    if (!allowed) {
      await supabase.auth.signOut()
      redirect('/auth/login?error=unauthorized')
    }
  } catch (e) {
    console.error('Dashboard allowlist check failed:', e)
    await supabase.auth.signOut()
    redirect('/auth/login?error=unauthorized')
  }

  return (
    <DashboardShell userEmail={user.email ?? ''}>
      {children}
    </DashboardShell>
  )
}
