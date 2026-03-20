import { BarberProfileClient } from '@/components/barber/BarberProfileClient'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export default async function BarberProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!dbUser || dbUser.role !== 'barber') redirect('/dashboard')

  const [profile] = await db.select().from(barbers).where(eq(barbers.userId, user.id)).limit(1)
  if (!profile) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
        No barber profile is linked to your account. Ask an admin to connect your staff profile.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Profile</h1>
        <p className="text-headz-gray text-sm mt-1">{profile.name}</p>
      </div>
      <BarberProfileClient initialName={profile.name} initialAvatarUrl={profile.avatarUrl} />
    </div>
  )
}
