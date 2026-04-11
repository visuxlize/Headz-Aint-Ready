import { NextResponse } from 'next/server'
import { isSquireConfigured } from '@/lib/squire/config'
import { requireStaffApi } from '@/lib/staff/require-staff-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireStaffApi()
  if ('error' in auth) return auth.error

  return NextResponse.json({
    connected: isSquireConfigured(),
    hasLocationId: Boolean(process.env.SQUIRE_LOCATION_ID?.trim()),
  })
}
