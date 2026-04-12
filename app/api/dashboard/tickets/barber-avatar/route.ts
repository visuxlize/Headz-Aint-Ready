import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { barbers } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { isSlugInManualTicketAllowlist } from '@/lib/dashboard/manual-ticket-barbers'
import { isMissingTicketDisplayColumnError } from '@/lib/db/postgres-error'

export const dynamic = 'force-dynamic'

const BUCKET = 'barber-avatars'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/**
 * POST — multipart upload for **Tickets-only** avatar (`ticket_display_avatar_url`).
 * Field names: `file`, `barberId` (uuid). Does not change marketing `avatar_url`.
 */
export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const barberIdRaw = formData.get('barberId')
  const file = formData.get('file')
  if (typeof barberIdRaw !== 'string' || !/^[0-9a-f-]{36}$/i.test(barberIdRaw)) {
    return NextResponse.json({ error: 'Invalid barberId' }, { status: 400 })
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be 5MB or smaller' }, { status: 400 })
  }

  const type = file.type || 'application/octet-stream'
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Use JPEG, PNG, WebP, or GIF' }, { status: 400 })
  }

  const [row] = await db
    .select({ id: barbers.id, slug: barbers.slug })
    .from(barbers)
    .where(eq(barbers.id, barberIdRaw))
    .limit(1)

  if (!row || !isSlugInManualTicketAllowlist(row.slug)) {
    return NextResponse.json({ error: 'Barber is not in the ticket allowlist' }, { status: 403 })
  }

  const ext =
    type === 'image/jpeg'
      ? 'jpg'
      : type === 'image/png'
        ? 'png'
        : type === 'image/webp'
          ? 'webp'
          : 'gif'

  const path = `ticket-ui/${row.id}/${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    console.error('ticket barber avatar: service role', e)
    return NextResponse.json({ error: 'Server storage is not configured' }, { status: 503 })
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: type,
    upsert: false,
  })

  if (upErr) {
    console.error('ticket barber avatar upload', upErr)
    return NextResponse.json(
      {
        error: upErr.message.includes('Bucket not found')
          ? 'Storage bucket missing — run scripts/storage-barber-avatars.sql in Supabase'
          : 'Upload failed',
      },
      { status: 500 }
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)

  try {
    await db
      .update(barbers)
      .set({ ticketDisplayAvatarUrl: publicUrl, updatedAt: new Date() })
      .where(eq(barbers.id, row.id))
  } catch (e) {
    if (!isMissingTicketDisplayColumnError(e)) throw e
    return NextResponse.json(
      {
        error: 'Run scripts/add-barbers-ticket-display-columns.sql in Supabase, then try again.',
      },
      { status: 503 }
    )
  }

  return NextResponse.json({ url: publicUrl })
}
