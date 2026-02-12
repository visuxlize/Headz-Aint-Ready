import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'

/**
 * Database Schema Definition
 * 
 * Define all your database tables here. Drizzle will use these definitions to:
 * 1. Generate TypeScript types automatically
 * 2. Create SQL migrations
 * 3. Provide type-safe database operations
 * 
 * After modifying this file:
 * 1. Run: npm run db:generate (creates migration)
 * 2. Review migration in /drizzle folder
 * 3. Run: npm run db:migrate (applies migration)
 */

/**
 * Users table
 * 
 * Stores user profile information. The `id` should match Supabase Auth user IDs
 * for easy relationship management.
 * 
 * Example usage:
 * ```typescript
 * import { db } from '@/lib/db'
 * import { users } from '@/lib/db/schema'
 * 
 * // Insert new user
 * await db.insert(users).values({
 *   id: authUser.id,
 *   email: authUser.email,
 *   fullName: 'John Doe'
 * })
 * 
 * // Get user by ID
 * const user = await db.select().from(users).where(eq(users.id, userId))
 * ```
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/**
 * Example: Posts table (commented out, uncomment and modify as needed)
 * 
 * This shows how to create relationships between tables.
 */
/*
import { integer } from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
*/

/**
 * Type exports
 * 
 * Drizzle automatically generates TypeScript types from your schema.
 * You can export these for use in your application:
 * 
 * ```typescript
 * import { type User, type NewUser } from '@/lib/db/schema'
 * 
 * // User = full user object with all fields
 * // NewUser = user object for insertion (no auto-generated fields like id, createdAt)
 * ```
 */
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
