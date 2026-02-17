#!/usr/bin/env node
/**
 * Seed barbers and services from headzaintready.com (Team + pricing).
 * Run: node scripts/seed-headz-barbers.mjs
 * Loads .env.local for DATABASE_URL.
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

const BARBERS = [
  { name: 'Louie Live', slug: 'louie-live', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/LOUIELIVE.jpg', sortOrder: 0 },
  { name: 'Johan', slug: 'johan', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2025/04/JOHAN.jpg', sortOrder: 1 },
  { name: 'King Rome', slug: 'king-rome', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/ROME-1.jpg', sortOrder: 2 },
  { name: 'Jesus', slug: 'jesus', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/JESUS.jpg', sortOrder: 3 },
  { name: 'Angel', slug: 'angel', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/ANGEL.jpg', sortOrder: 4 },
  { name: 'Victor', slug: 'victor', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/VICTOR.jpg', sortOrder: 5 },
  { name: 'Liseth', slug: 'liseth', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2025/04/Liseth.jpg', sortOrder: 6 },
  { name: 'Carlos', slug: 'carlos', avatarUrl: 'https://headzaintready.com/wp-content/uploads/2023/02/CARLOS.jpg', sortOrder: 7 },
];

async function main() {
  try {
    await sql`DELETE FROM appointments`;
    await sql`DELETE FROM barbers`;
    for (const b of BARBERS) {
      await sql`
        INSERT INTO barbers (name, slug, avatar_url, sort_order)
        VALUES (${b.name}, ${b.slug}, ${b.avatarUrl}, ${b.sortOrder})
      `;
    }
    console.log('Inserted 8 barbers:', BARBERS.map((b) => b.name).join(', '));

    const [{ count: servicesCount }] = await sql`SELECT COUNT(*)::int FROM services`;
    if (servicesCount === 0) {
      await sql`
        INSERT INTO services (name, slug, duration_minutes, price_cents, category, sort_order) VALUES
          ('Kids cut', 'kids-cut', 30, 2000, 'kids', 0),
          ('Adult cut', 'adult-cut', 30, 3000, 'adults', 1),
          ('Senior cut', 'senior-cut', 30, 2500, 'seniors', 2)
      `;
      console.log('Inserted 3 services: Kids cut, Adult cut, Senior cut');
    } else {
      console.log('Services already exist, skipping.');
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
