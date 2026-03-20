import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** Admin or active barber — for POS and staff tools. */
export async function requireStaffApi() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const
  }
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!dbUser?.isActive) {
    return { error: NextResponse.json({ error: 'Account inactive' }, { status: 403 }) } as const
  }
  if (dbUser.role !== 'admin' && dbUser.role !== 'barber') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const
  }
  return { user, dbUser } as const
}
