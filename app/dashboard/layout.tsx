import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { staffAllowlist, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { linkPlaceholderBarberIfNeeded } from '@/lib/staff/link-placeholder-barber'

async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1)))
      }
    }
  }
  throw last
}

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
    // Only select `email` — some DBs have an older `staff_allowlist` without `created_at`; full select() fails there.
    const [allowed] = await withDbRetry(() =>
      db.select({ email: staffAllowlist.email }).from(staffAllowlist).where(eq(staffAllowlist.email, email)).limit(1)
    )
    if (!allowed) {
      await supabase.auth.signOut()
      redirect('/auth/login?error=unauthorized')
    }

    let [dbUser] = await withDbRetry(() => db.select().from(users).where(eq(users.id, user.id)).limit(1))
    if (!dbUser) {
      const linked = await withDbRetry(() => linkPlaceholderBarberIfNeeded(user.id, email))
      if (linked) {
        ;[dbUser] = await withDbRetry(() => db.select().from(users).where(eq(users.id, user.id)).limit(1))
      }
    }
    if (!dbUser) {
      await supabase.auth.signOut()
      redirect('/auth/login?error=no_profile')
    }
    if (!dbUser.isActive) {
      await supabase.auth.signOut()
      redirect('/auth/login?error=inactive')
    }
  } catch (e) {
    const cause = e instanceof Error ? e.cause : undefined
    console.error('Dashboard allowlist check failed:', e, cause != null ? { cause } : '')
    const msg = e instanceof Error ? e.message : String(e)
    const reason = msg.includes('DATABASE_URL environment variable is not set') ? 'config' : 'db'
    // Keep Supabase session — transient DB issues were signing users out and looking like "login failed".
    redirect(`/auth/service-unavailable?reason=${reason}`)
  }

  return <>{children}</>
}
