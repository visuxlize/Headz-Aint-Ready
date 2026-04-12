import postgres from 'postgres'
import { postgresErrorText } from '@/lib/db/postgres-error'

/**
 * Prefer a **direct** Postgres URL for DDL. Supabase Transaction pooler (port 6543) often rejects or
 * mishandles `ALTER TABLE`; Dashboard → Connect → **Direct** (or “Session” pooler on 5432) works.
 * Falls back to `DATABASE_URL` if unset.
 */
function resolveDdlConnectionString(): string | null {
  const u =
    process.env.DATABASE_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL
  return u && u.length > 0 ? u : null
}

function isSupabaseHost(url: string): boolean {
  try {
    const u = new URL(url.replace(/^postgresql:/i, 'http:').replace(/^postgres:/i, 'http:'))
    return u.hostname.includes('supabase.co') || u.hostname.includes('pooler.supabase.com')
  } catch {
    return false
  }
}

/**
 * Applies the same intent as `scripts/add-pos-barber-profile-id.sql` so manual Tickets can store
 * `barbers.id` without a staff `users` row. Idempotent. Uses a short-lived connection so DDL does not
 * depend on the pooled Drizzle client.
 */
export async function runPosTransactionsManualTicketDdls(): Promise<boolean> {
  const url = resolveDdlConnectionString()
  if (!url) {
    console.error('[pos_transactions manual ticket DDL] No DATABASE_URL')
    return false
  }

  const sql = postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: 25,
    idle_timeout: 5,
    ...(isSupabaseHost(url) ? { ssl: 'require' as const } : {}),
  })

  try {
    // 1. Column without FK first — fewer failure modes than ADD … REFERENCES in one step.
    await sql`
      ALTER TABLE pos_transactions
      ADD COLUMN IF NOT EXISTS barber_profile_id uuid;
    `
    // 2. Manual tickets use roster-only barbers with null staff user.
    await sql`
      ALTER TABLE pos_transactions
      ALTER COLUMN barber_id DROP NOT NULL;
    `
    // 3. FK to barbers (ignore if constraint already exists — unsafe avoids `$` parsing in sql``).
    await sql.unsafe(`
      DO $$
      BEGIN
        ALTER TABLE pos_transactions
          ADD CONSTRAINT pos_transactions_barber_profile_id_fkey
          FOREIGN KEY (barber_profile_id) REFERENCES barbers(id) ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END
      $$;
    `)
    await sql`
      CREATE INDEX IF NOT EXISTS pos_transactions_barber_profile_id_idx ON pos_transactions (barber_profile_id);
    `
    return true
  } catch (e) {
    console.error('[pos_transactions manual ticket DDL]', postgresErrorText(e))
    return false
  } finally {
    await sql.end({ timeout: 15 })
  }
}
