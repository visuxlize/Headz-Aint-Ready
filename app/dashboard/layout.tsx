import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { staffAllowlist, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** Auth + staff allowlist + active account for all /dashboard routes. Shell is provided by nested layouts: (admin) or barber. */
export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

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

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
    if (dbUser && !dbUser.isActive) {
      await supabase.auth.signOut()
      redirect('/auth/login?error=inactive')
    }
  } catch (e) {
    console.error('Dashboard allowlist check failed:', e)
    await supabase.auth.signOut()
    redirect('/auth/login?error=unauthorized')
  }

  return <>{children}</>
}
