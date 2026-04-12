#!/usr/bin/env node
/**
 * Restore / upsert Dream Team barber rows (names, slugs, avatar URLs from headzaintready.com).
 * Rows have no user_id until you invite barbers in Admin → Barbers (needed for booking/POS).
 *
 * Usage:
 *   npm run seed:barbers
 *   node scripts/seed-headz-barbers.mjs --wipe-appointments   # deletes all appointments first (dangerous)
 *
 * Services are NOT touched here — use npm run restore:services for the full pricelist.
 * For a one-shot local/staging reset: npm run seed:all
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

/** Shop roster — avatar URLs reuse headzaintready.com assets where names match; others null until you add photos. */
const BARBERS = [
  {
    name: 'Victor Zambrano',
    slug: 'victor-zambrano',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/VICTOR.jpg',
    sortOrder: 0,
  },
  { name: 'Matthew Mirabella', slug: 'matthew-mirabella', avatarUrl: null, sortOrder: 1 },
  { name: 'Luis Benites', slug: 'luis-benites', avatarUrl: null, sortOrder: 2 },
  {
    name: 'Liseth Calderon',
    slug: 'liseth-calderon',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2025/04/Liseth.jpg',
    sortOrder: 3,
  },
  {
    name: 'Jesus Theodoro',
    slug: 'jesus-theodoro',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/JESUS.jpg',
    sortOrder: 4,
  },
  { name: 'Jerome Glenn', slug: 'jerome-glenn', avatarUrl: null, sortOrder: 5 },
  { name: 'David Fernandez', slug: 'david-fernandez', avatarUrl: null, sortOrder: 6 },
  {
    name: 'Carlos Principal',
    slug: 'carlos-principal',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/CARLOS.jpg',
    sortOrder: 7,
  },
  {
    name: 'Angle Miranda',
    slug: 'angle-miranda',
    avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/ANGEL.jpg',
    sortOrder: 8,
  },
  { name: 'Daniel', slug: 'daniel', avatarUrl: null, sortOrder: 9 },
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
          avatar_url = COALESCE(EXCLUDED.avatar_url, barbers.avatar_url),
          sort_order = EXCLUDED.sort_order,
          is_active = true,
          updated_at = now()
      `
    }
    console.log('Upserted barbers:', BARBERS.map((x) => x.name).join(', '))
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
