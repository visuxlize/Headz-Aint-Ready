import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { squareDevices } from '@/lib/db/schema'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { requireStaffApi } from '@/lib/staff/require-staff-api'
import { requireSquareClient, newIdempotencyKey } from '@/lib/square/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Staff (admin + barber) — POS needs paired device ids */
export async function GET() {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  try {
    const rows = await db.select().from(squareDevices).orderBy(desc(squareDevices.createdAt))
    return NextResponse.json({
      devices: rows.map((d) => ({
        id: d.id,
        deviceId: d.deviceId,
        deviceCodeId: d.deviceCodeId,
        deviceName: d.deviceName,
        status: d.status,
        pairedAt: d.pairedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('GET /api/square/devices', e)
    const msg = e instanceof Error ? e.message : 'Database error'
    const hint =
      /square_devices/.test(msg) && /does not exist/i.test(msg)
        ? ' Run scripts/ensure-pos-payments-schema.sql in Supabase.'
        : ''
    return NextResponse.json({ error: `Could not load devices.${hint}`, devices: [] }, { status: 500 })
  }
}

const postSchema = z.object({
  deviceName: z.string().min(1).max(120),
})

export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const locationId = process.env.SQUARE_LOCATION_ID
  if (!locationId) {
    return NextResponse.json({ error: 'SQUARE_LOCATION_ID not configured' }, { status: 500 })
  }

  try {
    const client = requireSquareClient()
    const res = await client.devices.codes.create({
      idempotencyKey: newIdempotencyKey(),
      deviceCode: {
        name: parsed.data.deviceName,
        productType: 'TERMINAL_API',
        locationId,
      },
    })

    const dc = res.deviceCode
    if (!dc?.id) {
      return NextResponse.json({ error: 'Square did not return a device code' }, { status: 502 })
    }

    await db.insert(squareDevices).values({
      deviceCodeId: dc.id,
      deviceName: parsed.data.deviceName,
      status: 'unpaired',
    })

    return NextResponse.json({
      deviceCodeId: dc.id,
      code: dc.code ?? '',
      pairBy: dc.pairBy ?? null,
    })
  } catch (e) {
    console.error('square/devices POST', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create device code' },
      { status: 500 }
    )
  }
}
