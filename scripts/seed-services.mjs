#!/usr/bin/env node
/**
 * Seed services from the official price list.
 * Run: node scripts/seed-services.mjs
 */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
try {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch (e) {
  console.error('Could not load .env.local:', e.message);
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in .env.local');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });

const SERVICES = [
  { name: 'Kids Haircut', slug: 'kids-haircut', durationMinutes: 30, priceCents: 3000, category: 'kids', sortOrder: 0 },
  { name: 'Shape Up', slug: 'shape-up', durationMinutes: 30, priceCents: 2000, category: 'adults', sortOrder: 1 },
  { name: 'Shape Up & Beard', slug: 'shape-up-beard', durationMinutes: 30, priceCents: 3000, category: 'adults', sortOrder: 2 },
  { name: 'Senior Citizens', slug: 'senior-citizens', durationMinutes: 30, priceCents: 3000, category: 'seniors', sortOrder: 3 },
  { name: 'Haircut Adult', slug: 'haircut-adult', durationMinutes: 30, priceCents: 4000, category: 'adults', sortOrder: 4 },
  { name: 'Haircut & Beard', slug: 'haircut-beard', durationMinutes: 30, priceCents: 5000, category: 'adults', sortOrder: 5 },
  { name: 'Haircut / Beard / Hot Towel', slug: 'haircut-beard-hot-towel', durationMinutes: 30, priceCents: 5500, category: 'adults', sortOrder: 6 },
  { name: 'Enhancement beard color black/brown', slug: 'enhancement-beard-color', durationMinutes: 30, priceCents: 0, category: 'adults', sortOrder: 7 },
  { name: 'Braids', slug: 'braids', durationMinutes: 30, priceCents: 5000, category: 'adults', sortOrder: 8 },
];

async function main() {
  try {
    await sql`DELETE FROM appointments`;
    await sql`DELETE FROM services`;
    for (const s of SERVICES) {
      await sql`
        INSERT INTO services (name, slug, duration_minutes, price_cents, category, sort_order)
        VALUES (${s.name}, ${s.slug}, ${s.durationMinutes}, ${s.priceCents}, ${s.category}, ${s.sortOrder})
      `;
    }
    console.log('Inserted', SERVICES.length, 'services');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
