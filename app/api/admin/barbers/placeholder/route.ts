import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { barbers, staffAllowlist, users } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'
import { slugifyName } from '@/lib/utils/slug'

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  avatarUrl: z.string().url().optional().nullable(),
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

/** POST — add barber to roster before they sign up (links on first login when email matches). */
export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const name = parsed.data.name.trim()
  const emailLower = parsed.data.email.trim().toLowerCase()
  const avatarUrl = parsed.data.avatarUrl?.trim() || null

  const [dupUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailLower)).limit(1)
  if (dupUser) {
    return NextResponse.json({ error: 'A user with this email already exists. Use “Send invite” instead.' }, { status: 409 })
  }

  const [dupBarberEmail] = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(eq(barbers.email, emailLower))
    .limit(1)
  if (dupBarberEmail) {
    return NextResponse.json({ error: 'This email is already on the barber roster.' }, { status: 409 })
  }

  const slug = await uniqueBarberSlug(name)
  const maxOrder = await db.select({ m: barbers.sortOrder }).from(barbers).orderBy(desc(barbers.sortOrder)).limit(1)
  const nextOrder = (maxOrder[0]?.m ?? 0) + 1

  const [row] = await db
    .insert(barbers)
    .values({
      name,
      slug,
      email: emailLower,
      avatarUrl,
      isActive: true,
      sortOrder: nextOrder,
    })
    .returning()

  await db.insert(staffAllowlist).values({ email: emailLower }).onConflictDoNothing()

  return NextResponse.json(
    {
      data: row,
      message:
        'Barber added to the roster. When they sign up with this email, their profile will link automatically.',
    },
    { status: 201 }
  )
}
