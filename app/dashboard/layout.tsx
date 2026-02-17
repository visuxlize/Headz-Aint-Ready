import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
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
    <div className="min-h-screen w-full flex bg-headz-cream">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-headz-black border-r border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-headz-red font-bold text-lg">Headz</span>
            <span className="text-white/70 text-sm">Staff</span>
          </Link>
        </div>
        <nav className="flex-1 p-3">
          <DashboardNav />
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-sm"
          >
            <ExternalIcon className="w-4 h-4" />
            View site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 bg-white border-b border-black/10 flex items-center justify-end px-6 gap-4">
          <span className="text-sm text-headz-gray truncate max-w-[200px]" title={user.email ?? ''}>
            {user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-headz-red hover:text-headz-redDark font-medium"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}
