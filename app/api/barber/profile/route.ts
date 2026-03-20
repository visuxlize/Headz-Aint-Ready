import { NextResponse } from 'next/server'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { barbers, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const AVATAR_BUCKET = 'barber-avatars'
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const patchSchema = z.object({
  avatarUrl: z.string().url().optional(),
})

/** GET — current barber profile (for dashboard) */
export async function GET() {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const [profile] = await db.select().from(barbers).where(eq(barbers.userId, auth.user.id)).limit(1)
  if (!profile) {
    return NextResponse.json({ error: 'Barber profile not found' }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      id: profile.id,
      name: profile.name,
      slug: profile.slug,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      email: profile.email,
    },
  })
}

/**
 * POST — multipart file upload for profile photo (stored in Supabase Storage).
 * Field name: `file`
 */
export async function POST(request: Request) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const [profile] = await db.select().from(barbers).where(eq(barbers.userId, auth.user.id)).limit(1)
  if (!profile) {
    return NextResponse.json({ error: 'Barber profile not found' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be 2MB or smaller' }, { status: 400 })
  }

  const type = file.type || 'application/octet-stream'
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Use JPEG, PNG, WebP, or GIF' }, { status: 400 })
  }

  const ext =
    type === 'image/jpeg'
      ? 'jpg'
      : type === 'image/png'
        ? 'png'
        : type === 'image/webp'
          ? 'webp'
          : 'gif'

  const path = `${profile.id}/${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    console.error('barber profile upload: service role', e)
    return NextResponse.json({ error: 'Server storage is not configured' }, { status: 503 })
  }

  const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, buf, {
    contentType: type,
    upsert: false,
  })

  if (upErr) {
    console.error('barber avatar upload', upErr)
    return NextResponse.json(
      { error: upErr.message.includes('Bucket not found') ? 'Storage bucket missing — run scripts/storage-barber-avatars.sql in Supabase' : 'Upload failed' },
      { status: 500 }
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const [updated] = await db
    .update(barbers)
    .set({ avatarUrl: publicUrl, updatedAt: new Date() })
    .where(eq(barbers.id, profile.id))
    .returning()

  await db
    .update(users)
    .set({ avatarUrl: publicUrl, updatedAt: new Date() })
    .where(eq(users.id, auth.user.id))

  return NextResponse.json({
    data: {
      avatarUrl: updated?.avatarUrl ?? publicUrl,
    },
  })
}

/** PATCH — set avatar URL (e.g. paste a hosted image URL) */
export async function PATCH(request: Request) {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const [profile] = await db.select().from(barbers).where(eq(barbers.userId, auth.user.id)).limit(1)
  if (!profile) {
    return NextResponse.json({ error: 'Barber profile not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const avatarUrl = parsed.data.avatarUrl
  if (avatarUrl === undefined) {
    return NextResponse.json({ error: 'avatarUrl required' }, { status: 400 })
  }

  const [updated] = await db
    .update(barbers)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(barbers.id, profile.id))
    .returning()

  await db
    .update(users)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(users.id, auth.user.id))

  return NextResponse.json({ data: { avatarUrl: updated?.avatarUrl ?? avatarUrl } })
}
