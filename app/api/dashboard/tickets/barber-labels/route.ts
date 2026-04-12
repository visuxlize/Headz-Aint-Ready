import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { barbers } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { orderedManualTicketBarberRows } from '@/lib/dashboard/manual-ticket-barbers'
import { fetchTicketBarberLabelRows } from '@/lib/dashboard/ticket-barber-labels-query'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  barbers: z.array(
    z.object({
      id: z.string().uuid(),
      ticketDisplayName: z.string().max(120).nullable(),
      ticketDisplayAvatarUrl: z.string().max(2000).nullable(),
    })
  ),
})

function normalizeNullable(s: string | null): string | null {
  if (s == null) return null
  const t = s.trim()
  return t === '' ? null : t
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** GET — barbers in the manual ticket allowlist, with marketing vs ticket-only fields. */
export async function GET() {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  try {
    const barbersPayload = await fetchTicketBarberLabelRows()
    return NextResponse.json({ barbers: barbersPayload })
  } catch (e) {
    console.error('GET /api/dashboard/tickets/barber-labels', e)
    return NextResponse.json(
      {
        error:
          'Could not load barber labels. If this is a new deploy, run scripts/add-barbers-ticket-display-columns.sql in Supabase.',
      },
      { status: 500 }
    )
  }
}

/** PATCH — update ticket-only display fields (Tickets page dropdown + labels only). */
export async function PATCH(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

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

  const baseRows = await db
    .select({ id: barbers.id, slug: barbers.slug })
    .from(barbers)
    .where(eq(barbers.isActive, true))

  const allowed = new Set(
    orderedManualTicketBarberRows(
      baseRows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: '',
        avatarUrl: null,
        ticketDisplayName: null,
        ticketDisplayAvatarUrl: null,
      }))
    ).map((r) => r.id)
  )

  for (const b of parsed.data.barbers) {
    if (!allowed.has(b.id)) {
      return NextResponse.json({ error: 'One or more barbers are not in the ticket allowlist' }, { status: 400 })
    }
    const avatar = normalizeNullable(b.ticketDisplayAvatarUrl)
    if (avatar && !isValidHttpUrl(avatar)) {
      return NextResponse.json({ error: 'Avatar URL must be a valid http(s) URL' }, { status: 400 })
    }
  }

  const now = new Date()
  try {
    for (const b of parsed.data.barbers) {
      await db
        .update(barbers)
        .set({
          ticketDisplayName: normalizeNullable(b.ticketDisplayName),
          ticketDisplayAvatarUrl: normalizeNullable(b.ticketDisplayAvatarUrl),
          updatedAt: now,
        })
        .where(eq(barbers.id, b.id))
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PATCH /api/dashboard/tickets/barber-labels', e)
    return NextResponse.json(
      {
        error:
          'Could not save. Run scripts/add-barbers-ticket-display-columns.sql in Supabase if columns are missing.',
      },
      { status: 500 }
    )
  }
}
