import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ForcePasswordChangeClient } from '@/components/dashboard/ForcePasswordChangeClient'

export default async function ForcePasswordChangePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!dbUser?.mustChangePassword) {
    redirect(dbUser?.role === 'admin' ? '/dashboard' : '/dashboard/barber')
  }

  return (
    <div className="min-h-screen bg-headz-cream flex items-center justify-center p-4">
      <ForcePasswordChangeClient email={user.email ?? ''} role={dbUser.role} />
    </div>
  )
}
