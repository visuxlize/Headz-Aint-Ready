import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { barbers, staffAllowlist, users } from '@/lib/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'

/**
 * Links a new Supabase auth user to an existing `barbers` row when emails match
 * (barber profile already exists from seed/admin; staff adds their email at signup).
 * Creates `public.users` + `staff_allowlist` if missing.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const emailLower = user.email.trim().toLowerCase()

  const [existingUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (existingUser) {
    return NextResponse.json({ ok: true, linked: false, message: 'Profile already exists' })
  }

  const [match] = await db
    .select()
    .from(barbers)
    .where(
      and(
        isNull(barbers.userId),
        sql`lower(trim(${barbers.email})) = ${emailLower}`,
        sql`${barbers.email} is not null`,
        sql`trim(${barbers.email}) <> ''`
      )
    )
    .limit(1)

  if (!match) {
    return NextResponse.json(
      {
        ok: false,
        code: 'no_barber_profile',
        error:
          'No barber profile matches this email. Ask an admin to add your email on your barber card in Settings → Barbers, then try again.',
      },
      { status: 404 }
    )
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: user.id,
        email: emailLower,
        fullName: match.name,
        role: 'barber',
        isActive: true,
      })
      await tx.insert(staffAllowlist).values({ email: emailLower }).onConflictDoNothing()
      await tx
        .update(barbers)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(eq(barbers.id, match.id))
    })
    return NextResponse.json({ ok: true, linked: true, barberProfileId: match.id })
  } catch (e) {
    console.error('claim-barber', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not link barber profile' },
      { status: 500 }
    )
  }
}
