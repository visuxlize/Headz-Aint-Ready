import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveDbUserForAuth } from '@/lib/auth/resolve-db-user'

export async function requireAdminApi() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const
  }
  const dbUser = await resolveDbUserForAuth({ authUserId: user.id, authEmail: user.email })
  if (!dbUser?.isActive) {
    return { error: NextResponse.json({ error: 'Account inactive' }, { status: 403 }) } as const
  }
  if (dbUser.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const
  }
  return { user, dbUser } as const
}
