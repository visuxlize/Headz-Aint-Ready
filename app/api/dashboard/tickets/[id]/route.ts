import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { barbers, posTransactions, services } from '@/lib/db/schema'
import type { PosLineItem } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { buildManualTicketLines } from '@/lib/dashboard/manual-ticket-amounts'
import { startOfNyDayUtc } from '@/lib/date/ny-bounds'
import {
  isMissingPosSourceColumnError,
  isMissingTicketDisplayColumnError,
  postgresErrorText,
} from '@/lib/db/postgres-error'

function isMissingBarberProfileColumnError(e: unknown): boolean {
  const msg = postgresErrorText(e)
  return /barber_profile_id|column.*barber_profile|42703.*barber_profile/i.test(msg)
}

const patchSchema = z
  .object({
    barberProfileId: z.string().uuid(),
    serviceId: z.string().uuid(),
    paymentMethod: z.enum(['cash', 'card']),
    tipAmount: z.number().min(0),
    customerName: z.string().optional(),
    addCustomAmount: z.boolean().optional(),
    customAmount: z.number().min(0).max(50_000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.addCustomAmount === true) {
      const c = data.customAmount
      if (c == null || !Number.isFinite(c) || c <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a custom amount greater than $0.',
          path: ['customAmount'],
        })
      }
    }
  })

/** DELETE — void a ticket (soft-delete for reporting). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuid.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const [row] = await db.select({ id: posTransactions.id }).from(posTransactions).where(eq(posTransactions.id, id)).limit(1)
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.update(posTransactions).set({ paymentStatus: 'voided' }).where(eq(posTransactions.id, id))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/dashboard/tickets/[id]', e)
    return NextResponse.json({ error: 'Failed to void ticket' }, { status: 500 })
  }
}

/** PATCH — update a manual ticket from today (same rules as creation). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { id } = await params
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuid.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
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

  const { barberProfileId, serviceId, paymentMethod, tipAmount, addCustomAmount, customAmount } = parsed.data
  const customerName = (parsed.data.customerName?.trim() || 'Walk-in').trim() || 'Walk-in'

  try {
    let existing: {
      id: string
      createdAt: Date
      paymentStatus: string
      source?: string | null
    } | undefined

    try {
      ;[existing] = await db
        .select({
          id: posTransactions.id,
          createdAt: posTransactions.createdAt,
          paymentStatus: posTransactions.paymentStatus,
          source: posTransactions.source,
        })
        .from(posTransactions)
        .where(eq(posTransactions.id, id))
        .limit(1)
    } catch (e) {
      if (!isMissingPosSourceColumnError(e)) throw e
      ;[existing] = await db
        .select({
          id: posTransactions.id,
          createdAt: posTransactions.createdAt,
          paymentStatus: posTransactions.paymentStatus,
        })
        .from(posTransactions)
        .where(eq(posTransactions.id, id))
        .limit(1)
    }

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.paymentStatus === 'voided') {
      return NextResponse.json({ error: 'Cannot edit a voided ticket' }, { status: 400 })
    }
    const src = existing.source ?? 'manual'
    if (src !== 'manual') {
      return NextResponse.json({ error: 'Only manual walk-in tickets can be edited' }, { status: 400 })
    }

    const dayStart = startOfNyDayUtc()
    if (existing.createdAt < dayStart) {
      return NextResponse.json({ error: 'Only tickets from today can be edited' }, { status: 400 })
    }

    let prof: { id: string; name: string; ticketDisplayName?: string | null } | undefined
    try {
      ;[prof] = await db
        .select({
          id: barbers.id,
          name: barbers.name,
          ticketDisplayName: barbers.ticketDisplayName,
        })
        .from(barbers)
        .where(and(eq(barbers.id, barberProfileId), eq(barbers.isActive, true)))
        .limit(1)
    } catch (e) {
      if (!isMissingTicketDisplayColumnError(e)) throw e
      ;[prof] = await db
        .select({ id: barbers.id, name: barbers.name })
        .from(barbers)
        .where(and(eq(barbers.id, barberProfileId), eq(barbers.isActive, true)))
        .limit(1)
    }

    if (!prof) {
      return NextResponse.json({ error: 'Invalid or inactive barber' }, { status: 400 })
    }

    const [svcRow] = await db
      .select({
        id: services.id,
        name: services.name,
        price: services.price,
      })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.isActive, true)))
      .limit(1)

    if (!svcRow) {
      return NextResponse.json({ error: 'Invalid or inactive service' }, { status: 400 })
    }

    const { items, serviceAmount, subtotal, total } = buildManualTicketLines(svcRow, tipAmount, {
      addCustomAmount,
      customAmount,
    })
    if (!Number.isFinite(serviceAmount) || serviceAmount <= 0) {
      return NextResponse.json({ error: 'Invalid service price' }, { status: 400 })
    }

    const updatePayload = {
      customerName,
      barberId: null as string | null,
      barberProfileId: prof.id,
      serviceId: svcRow.id,
      items,
      subtotal: subtotal.toFixed(2),
      tipAmount: tipAmount.toFixed(2),
      total: total.toFixed(2),
      paymentMethod,
    }

    try {
      await db.update(posTransactions).set(updatePayload).where(eq(posTransactions.id, id))
    } catch (e) {
      if (!isMissingBarberProfileColumnError(e)) throw e
      const [link] = await db
        .select({ userId: barbers.userId })
        .from(barbers)
        .where(eq(barbers.id, barberProfileId))
        .limit(1)
      const staffUserId = link?.userId
      if (!staffUserId) {
        return NextResponse.json(
          {
            error:
              'This barber needs a staff login or the one-time SQL migration (scripts/add-pos-barber-profile-id.sql) before tickets can be edited.',
          },
          { status: 503 }
        )
      }
      await db
        .update(posTransactions)
        .set({
          customerName,
          barberId: staffUserId,
          serviceId: svcRow.id,
          items,
          subtotal: subtotal.toFixed(2),
          tipAmount: tipAmount.toFixed(2),
          total: total.toFixed(2),
          paymentMethod,
        })
        .where(eq(posTransactions.id, id))
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('PATCH /api/dashboard/tickets/[id]', e)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
