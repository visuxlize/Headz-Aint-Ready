import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveBarbersForCalendar } from '@/lib/dashboard/active-barbers'
import { SchedulePageClient } from '@/components/dashboard/SchedulePageClient'

export default async function SchedulePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const barbers = await getActiveBarbersForCalendar()

  return (
    <Suspense fallback={<p className="p-4 text-sm text-headz-gray">Loading…</p>}>
      <SchedulePageClient barbers={barbers} userId={user.id} />
    </Suspense>
  )
}
