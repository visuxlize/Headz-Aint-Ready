import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDashboardClient } from '@/components/dashboard/AdminDashboardClient'
import { getActiveBarbersForCalendar } from '@/lib/dashboard/active-barbers'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const barbers = await getActiveBarbersForCalendar()

  return (
    <Suspense fallback={<div className="text-headz-gray text-sm py-8">Loading dashboard…</div>}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AdminDashboardClient barbers={barbers} userId={user.id} />
      </div>
    </Suspense>
  )
}
