import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

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

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create PostgreSQL connection
// `prepare: false` is required for serverless environments
const client = postgres(process.env.DATABASE_URL, { prepare: false })

// Create Drizzle instance with schema
// The schema is imported so Drizzle knows about your tables and relationships
export const db = drizzle(client, { schema })
