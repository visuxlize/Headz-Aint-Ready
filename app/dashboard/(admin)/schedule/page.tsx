import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminScheduleSquireClient } from '@/components/dashboard/AdminScheduleSquireClient'

export default async function SchedulePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return <AdminScheduleSquireClient />
}
