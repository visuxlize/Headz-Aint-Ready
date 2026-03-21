import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, staffAllowlist, users } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { slugifyName } from '@/lib/utils/slug'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
})

async function uniqueBarberSlug(base: string): Promise<string> {
  let slug = slugifyName(base)
  let n = 0
  for (;;) {
    const [row] = await db.select({ id: barbers.id }).from(barbers).where(eq(barbers.slug, slug)).limit(1)
    if (!row) return slug
    n += 1
    slug = `${slugifyName(base)}-${n}`
  }
}

/** GET — all barber profiles (Dream Team + invited), with or without linked staff login */
export async function GET() {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const rows = await db
    .select({
      barberProfileId: barbers.id,
      userId: barbers.userId,
      barberName: barbers.name,
      barberEmail: barbers.email,
      avatarUrl: barbers.avatarUrl,
      barberActive: barbers.isActive,
      barberCreatedAt: barbers.createdAt,
      userEmail: users.email,
      userFullName: users.fullName,
      userIsActive: users.isActive,
      userCreatedAt: users.createdAt,
    })
    .from(barbers)
    .leftJoin(users, eq(barbers.userId, users.id))
    .orderBy(asc(barbers.sortOrder), asc(barbers.name))

  const data = rows.map((r) => {
    const linked = r.userId != null
    return {
      barberProfileId: r.barberProfileId,
      userId: r.userId,
      linked,
      displayName: r.barberName,
      email: r.userEmail ?? r.barberEmail,
      avatarUrl: r.avatarUrl,
      isActive: linked ? (r.userIsActive ?? false) : r.barberActive,
      createdAt: (linked ? r.userCreatedAt : r.barberCreatedAt)?.toISOString?.() ?? String(linked ? r.userCreatedAt : r.barberCreatedAt),
      /** Use for PATCH /api/admin/barbers/:id when linked */
      staffUserId: r.userId,
    }
  })

  return NextResponse.json({ data })
}

/** POST — invite barber (auth) + users + barbers + staff_allowlist */
export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const name = parsed.data.name.trim()
  const emailLower = parsed.data.email.trim().toLowerCase()

  const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailLower)).limit(1)
  if (dup) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
  }

  const admin = createServiceRoleClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(emailLower, {
    data: { full_name: name },
    redirectTo: `${appUrl.replace(/\/$/, '')}/auth/callback`,
  })

  if (inviteErr || !invited?.user) {
    const msg = inviteErr?.message ?? 'Invite failed'
    const status = msg.toLowerCase().includes('already') ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }

  const userId = invited.user.id
  const slug = await uniqueBarberSlug(name)

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: emailLower,
        fullName: name,
        role: 'barber',
        isActive: true,
      })
      await tx.insert(barbers).values({
        userId,
        name,
        slug,
        email: emailLower,
        isActive: true,
      })
      await tx.insert(staffAllowlist).values({ email: emailLower }).onConflictDoNothing()
    })
  } catch (e) {
    console.error('POST /api/admin/barbers db error', e)
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch (delErr) {
      console.error('Rollback: deleteUser failed', delErr)
    }
    return NextResponse.json({ error: 'Could not save barber profile. Try again.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: { id: userId, email: emailLower },
      message: 'Invitation sent. They can set a password from the email.',
    },
    { status: 201 }
  )
}
