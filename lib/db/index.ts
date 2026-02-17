import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import dns from 'node:dns'

// Prefer IPv4 so serverless (e.g. Vercel) can reach Supabase when IPv6 is unreachable (ENETUNREACH)
dns.setDefaultResultOrder('ipv4first')

/**
 * Database Connection
 * 
 * This creates a connection to your PostgreSQL database using Drizzle ORM.
 * The connection is configured for serverless environments (Vercel, etc.)
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
let _client: ReturnType<typeof postgres> | null = null
let _db: ReturnType<typeof drizzle> | null = null

function getDb(): ReturnType<typeof drizzle> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  if (!_client) {
    _client = postgres(process.env.DATABASE_URL, { prepare: false })
    _db = drizzle(_client, { schema })
  }
  return _db as ReturnType<typeof drizzle>
}

// Create Drizzle instance with schema (lazy: only connects on first use)
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
