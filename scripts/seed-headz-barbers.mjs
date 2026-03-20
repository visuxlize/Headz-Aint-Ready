#!/usr/bin/env node
/**
 * Restore / upsert barber rows (names, slugs, avatar URLs from headzaintready.com).
 *
 * Usage:
 *   node scripts/seed-headz-barbers.mjs
 *   node scripts/seed-headz-barbers.mjs --wipe-appointments   # deletes all appointments first (dangerous)
 *
 * Loads DATABASE_URL from .env.local.
 * Does NOT create auth users — use Dashboard → Settings → Barbers to invite staff; booking needs a linked user.
 */
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch (e) {
  console.error('Could not load .env.local:', e.message)
  process.exit(1)
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in .env.local')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 })

const BARBERS = [
  { name: 'Louie Live', slug: 'louie-live', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/LOUIELIVE.jpg', sortOrder: 0 },
  { name: 'Johan', slug: 'johan', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2025/04/JOHAN.jpg', sortOrder: 1 },
  { name: 'King Rome', slug: 'king-rome', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/ROME-1.jpg', sortOrder: 2 },
  { name: 'Jesus', slug: 'jesus', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/JESUS.jpg', sortOrder: 3 },
  { name: 'Angel', slug: 'angel', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/ANGEL.jpg', sortOrder: 4 },
  { name: 'Victor', slug: 'victor', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/VICTOR.jpg', sortOrder: 5 },
  { name: 'Liseth', slug: 'liseth', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2025/04/Liseth.jpg', sortOrder: 6 },
  { name: 'Carlos', slug: 'carlos', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/CARLOS.jpg', sortOrder: 7 },
]

async function main() {
  const wipeAppointments = process.argv.includes('--wipe-appointments')
  try {
    if (wipeAppointments) {
      await sql`DELETE FROM appointments`
      console.log('Deleted all appointments (--wipe-appointments).')
    }

    for (const b of BARBERS) {
      await sql`
        INSERT INTO barbers (name, slug, avatar_url, sort_order, is_active)
        VALUES (${b.name}, ${b.slug}, ${b.avatarUrl}, ${b.sortOrder}, true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          sort_order = EXCLUDED.sort_order,
          is_active = true,
          updated_at = now()
      `
    }
    console.log('Upserted barbers:', BARBERS.map((x) => x.name).join(', '))

    const [{ count: servicesCount }] = await sql`SELECT COUNT(*)::int FROM services`
    if (servicesCount === 0) {
      await sql`
        INSERT INTO services (name, slug, duration_minutes, price, category, display_order) VALUES
          ('Kids cut', 'kids-cut', 30, 20.00, 'kids', 0),
          ('Adult cut', 'adult-cut', 30, 30.00, 'adults', 1),
          ('Senior cut', 'senior-cut', 30, 25.00, 'seniors', 2)
      `
      console.log('Inserted 3 services: Kids cut, Adult cut, Senior cut')
    } else {
      console.log('Services already exist, skipping.')
    }
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
