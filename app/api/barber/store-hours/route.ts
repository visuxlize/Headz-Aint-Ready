import { NextResponse } from 'next/server'
import { requireBarberApi } from '@/lib/barber/api-auth'
import { getAllStoreWindows } from '@/lib/barber/store-hours'

export async function GET() {
  const auth = await requireBarberApi()
  if ('error' in auth) return auth.error

  const windows = await getAllStoreWindows()
  return NextResponse.json({ data: windows })
}
