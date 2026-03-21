import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import dns from 'node:dns'

// Prefer IPv4 so serverless (e.g. Netlify) can reach Supabase when IPv6 is unreachable (ENETUNREACH)
dns.setDefaultResultOrder('ipv4first')

/**
 * Database Connection
 * 
 * This creates a connection to your PostgreSQL database using Drizzle ORM.
 * The connection is configured for serverless environments (Netlify, etc.)
 * 
 * Why Drizzle?
 * - Type-safe queries (catch errors at compile time)
 * - Better performance than ORMs like Prisma
 * - Flexible and SQL-like syntax
 * - Great developer experience
 * 
 * Example usage:
 * ```typescript
 * import { db } from '@/lib/db'
 * import { users } from '@/lib/db/schema'
 * import { eq } from 'drizzle-orm'
 * 
 * // Select all users
 * const allUsers = await db.select().from(users)
 * 
 * // Select with conditions
 * const activeUsers = await db
 *   .select()
 *   .from(users)
 *   .where(eq(users.isActive, true))
 * 
 * // Insert a user
 * const newUser = await db
 *   .insert(users)
 *   .values({ email: 'test@example.com' })
 *   .returning()
 * 
 * // Update a user
 * await db
 *   .update(users)
 *   .set({ fullName: 'New Name' })
 *   .where(eq(users.id, userId))
 * 
 * // Delete a user
 * await db
 *   .delete(users)
 *   .where(eq(users.id, userId))
 * ```
 */

// Lazy init so the app can load even when DATABASE_URL is missing (e.g. marketing page can render).
// First actual use of `db` will throw if DATABASE_URL is not set or connection fails.
//
// Cache on globalThis so Next.js dev (HMR) does not open a new postgres client on every reload.
// Without this, Session pooler (:5432) hits "MaxClientsInSessionMode: max clients reached" quickly.
const globalForDb = globalThis as unknown as {
  __headzPostgres?: ReturnType<typeof postgres>
  __headzDrizzle?: ReturnType<typeof drizzle>
  __headzSessionPoolerWarned?: boolean
}

function warnIfSupabaseSessionPooler(url: string) {
  if (globalForDb.__headzSessionPoolerWarned) return
  try {
    const normalized = url.replace(/^postgresql:/i, 'http:').replace(/^postgres:/i, 'http:')
    const u = new URL(normalized)
    if (u.hostname.includes('pooler.supabase.com') && (u.port === '5432' || u.port === '')) {
      globalForDb.__headzSessionPoolerWarned = true
      console.warn(
        '[db] DATABASE_URL uses Supabase Session pooler (port 5432). It allows very few concurrent clients and often fails in Next dev. Prefer the Transaction pooler on port 6543 (Dashboard → Connect → Transaction pool). `prepare: false` is already set for PgBouncer.'
      )
    }
  } catch {
    /* ignore */
  }
}

function getDb(): ReturnType<typeof drizzle> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  if (process.env.NODE_ENV === 'development') {
    warnIfSupabaseSessionPooler(process.env.DATABASE_URL)
  }

  if (!globalForDb.__headzPostgres) {
    globalForDb.__headzPostgres = postgres(process.env.DATABASE_URL, {
      // Required for Supabase Transaction pooler (PgBouncer).
      prepare: false,
      max: 1,
      connect_timeout: 10,
      idle_timeout: 20,
    })
    globalForDb.__headzDrizzle = drizzle(globalForDb.__headzPostgres, { schema })
  }
  return globalForDb.__headzDrizzle as ReturnType<typeof drizzle>
}

// Create Drizzle instance with schema (lazy: only connects on first use)
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
