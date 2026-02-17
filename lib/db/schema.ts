import { pgTable, text, timestamp, uuid, boolean, integer, date } from 'drizzle-orm/pg-core'

/**
 * Database Schema – Headz Ain't Ready
 * Barbers, services, appointments. Staff use Supabase Auth (users).
 */

/** Staff / dashboard users – id matches Supabase Auth */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Emails allowed to access the staff dashboard. Only these users can sign in and use /dashboard. */
export const staffAllowlist = pgTable('staff_allowlist', {
  email: text('email').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type StaffAllowlist = typeof staffAllowlist.$inferSelect
export type NewStaffAllowlist = typeof staffAllowlist.$inferInsert

/** Barbers – each has a display name and optional auth user link */
export const barbers = pgTable('barbers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  avatarUrl: text('avatar_url'),
  email: text('email'), // for calendar / schedule emails
  bio: text('bio'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Barber recurring weekly availability (minutes from midnight, store timezone).
 * If none for a day, barber is unavailable that day. Within store open/close. */
export const barberAvailability = pgTable('barber_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  barberId: uuid('barber_id').notNull().references(() => barbers.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  startMinutes: integer('start_minutes').notNull(), // e.g. 540 = 9:00
  endMinutes: integer('end_minutes').notNull(),   // e.g. 1200 = 20:00
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Barber time off / sick days – date range. Booking slots exclude these. */
export const barberTimeOff = pgTable('barber_time_off', {
  id: uuid('id').primaryKey().defaultRandom(),
  barberId: uuid('barber_id').notNull().references(() => barbers.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  type: text('type').notNull().default('time_off'), // 'time_off' | 'sick' | 'other'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Services (Kids, Adults, Seniors, etc.) with duration in minutes and price in cents */
export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  priceCents: integer('price_cents').notNull(),
  category: text('category'), // 'kids' | 'adults' | 'seniors'
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Appointments – booked or walk-in, linked to barber + service */
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  barberId: uuid('barber_id').notNull().references(() => barbers.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone'),
  clientEmail: text('client_email'),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  isWalkIn: boolean('is_walk_in').default(false).notNull(),
  status: text('status').notNull().default('confirmed'), // confirmed | completed | cancelled | no_show
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Barber = typeof barbers.$inferSelect
export type NewBarber = typeof barbers.$inferInsert
export type BarberAvailability = typeof barberAvailability.$inferSelect
export type NewBarberAvailability = typeof barberAvailability.$inferInsert
export type BarberTimeOff = typeof barberTimeOff.$inferSelect
export type NewBarberTimeOff = typeof barberTimeOff.$inferInsert
export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
