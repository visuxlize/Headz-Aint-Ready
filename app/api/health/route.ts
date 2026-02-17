import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { services } from '@/lib/db/schema'

/**
 * GET /api/health – Backend diagnostic for Netlify.
 * Open https://your-site.netlify.app/api/health to verify DATABASE_URL and DB connection.
 * No secrets are returned.
 */
export async function GET() {
  const hasDatabaseUrl = Boolean(
    process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0
  )
  let dbOk = false
  let error: string | null = null

  if (hasDatabaseUrl) {
    try {
      await db.select().from(services).limit(1)
      dbOk = true
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  }

  const ok = hasDatabaseUrl && dbOk
  return NextResponse.json(
    {
      ok,
      hasDatabaseUrl,
      dbOk: hasDatabaseUrl ? dbOk : undefined,
      error: error ?? undefined,
    },
    { status: ok ? 200 : 503 }
  )
}
