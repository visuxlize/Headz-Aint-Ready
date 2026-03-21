import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/schema'
import { ilike } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'

/** GET /api/admin/customers/search?q= — distinct past customer names */
export async function GET(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 1) {
    return NextResponse.json({ names: [] })
  }

  const pattern = `%${q.replace(/%/g, '\\%')}%`

  const rows = await db
    .selectDistinct({ name: appointments.customerName })
    .from(appointments)
    .where(ilike(appointments.customerName, pattern))
    .limit(20)

  const names = rows.map((r) => r.name).filter(Boolean)
  return NextResponse.json({ names })
}
