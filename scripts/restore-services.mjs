#!/usr/bin/env node
/**
 * Upserts the canonical Headz pricelist (9 services — same as Feb 2026 marketing PRICE_LIST, commit 671a5b8).
 *
 *   npm run restore:services
 *
 * Data source: lib/services/default-headz-services.json (keep in sync with lib/services/default-price-list.ts).
 * Run `scripts/add-price-display-override.sql` once if the column is missing.
 * Loads DATABASE_URL from `.env.local` (handles `=` in connection string safely).
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'
import { loadEnvLocal } from './load-env-local.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

loadEnvLocal()

const DATABASE_URL = process.env.DATABASE_URL?.trim()
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Use: npm run restore:services')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 })

const jsonPath = join(__dirname, '../lib/services/default-headz-services.json')
const ROWS = JSON.parse(readFileSync(jsonPath, 'utf8'))

async function main() {
  try {
    for (const r of ROWS) {
      await sql`
        INSERT INTO services (
          name,
          slug,
          description,
          duration_minutes,
          price,
          price_display_override,
          category,
          display_order,
          is_active
        )
        VALUES (
          ${r.name},
          ${r.slug},
          ${r.description},
          ${r.durationMinutes},
          ${r.price},
          ${r.priceDisplayOverride},
          ${r.category},
          ${r.displayOrder},
          true
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          duration_minutes = EXCLUDED.duration_minutes,
          price = EXCLUDED.price,
          price_display_override = EXCLUDED.price_display_override,
          category = EXCLUDED.category,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now()
      `
    }
    console.log('Restored', ROWS.length, 'services:', ROWS.map((x) => x.slug).join(', '))
  } catch (e) {
    console.error('Error:', e.message)
    if (String(e.message || '').includes('price_display_override')) {
      console.error('Hint: run scripts/add-price-display-override.sql on your database first.')
    }
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
