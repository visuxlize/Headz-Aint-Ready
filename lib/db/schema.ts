import { pgTable, text, timestamp, uuid, boolean, integer, date, time, numeric } from 'drizzle-orm/pg-core'

/**
 * Database Schema – Headz Ain't Ready
 * Staff use Supabase Auth; `users.id` matches auth.users.
 */

export const userRoles = ['admin', 'barber'] as const
export type UserRole = (typeof userRoles)[number]

/** Staff / dashboard users – id matches Supabase Auth */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  role: text('role').notNull().default('barber'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Emails allowed to access the staff dashboard. */
export const staffAllowlist = pgTable('staff_allowlist', {
  email: text('email').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type StaffAllowlist = typeof staffAllowlist.$inferSelect
export type NewStaffAllowlist = typeof staffAllowlist.$inferInsert

/** Barbers – public profile; optional link to auth user for appointments & RLS */
export const barbers = pgTable('barbers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }).unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  avatarUrl: text('avatar_url'),
  email: text('email'),
  bio: text('bio'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Weekly availability per barber (auth user). Times are local wall-clock (store TZ). */
export const availability = pgTable('availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  barberId: uuid('barber_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Blocks booking for a date range (barber profile id) */
export const barberTimeOff = pgTable('barber_time_off', {
  id: uuid('id').primaryKey().defaultRandom(),
  barberId: uuid('barber_id').notNull().references(() => barbers.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  type: text('type').notNull().default('time_off'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category: text('category'),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const appointmentStatuses = ['pending', 'completed', 'no_show', 'cancelled'] as const
export type AppointmentStatus = (typeof appointmentStatuses)[number]

/** Appointments – barber_id is the staff auth user (users.id) */
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  barberId: uuid('barber_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => services.id, { onDelete: 'cascade' }),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),
  appointmentDate: date('date', { mode: 'string' }).notNull(),
  timeSlot: time('time_slot').notNull(),
  isWalkIn: boolean('is_walk_in').default(false).notNull(),
  status: text('status').notNull().default('pending'),
  checkedOff: boolean('checked_off').default(false).notNull(),
  noShowFee: numeric('no_show_fee', { precision: 10, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const timeOffRequestStatuses = ['pending', 'approved', 'denied'] as const

export const timeOffRequests = pgTable('time_off_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  barberId: uuid('barber_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  requestedDate: date('requested_date', { mode: 'string' }).notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const storeHours = pgTable('store_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayOfWeek: integer('day_of_week').notNull(),
  openTime: time('open_time').notNull(),
  closeTime: time('close_time').notNull(),
  isOpen: boolean('is_open').default(true).notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Barber = typeof barbers.$inferSelect
export type NewBarber = typeof barbers.$inferInsert
export type Availability = typeof availability.$inferSelect
export type NewAvailability = typeof availability.$inferInsert
export type BarberTimeOff = typeof barberTimeOff.$inferSelect
export type NewBarberTimeOff = typeof barberTimeOff.$inferInsert
export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
export type TimeOffRequest = typeof timeOffRequests.$inferSelect
export type NewTimeOffRequest = typeof timeOffRequests.$inferInsert
export type StoreHourRow = typeof storeHours.$inferSelect
