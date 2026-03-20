#!/usr/bin/env node
/**
 * Restore the full Headz pricelist (11 services from the official flyer).
 *
 *   npm run restore:services
 *
 * Upserts by slug. Run `scripts/add-price-display-override.sql` once if the column is missing.
 * Requires DATABASE_URL in .env.local (via --env-file in package.json).
 */
import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL?.trim()
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Use: npm run restore:services')
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 })

const ROWS = [
  {
    name: 'Haircut',
    slug: 'haircut',
    description: 'Clippers, Scissor & Blade Finish',
    duration: 30,
    price: '35.00',
    price_display_override: null,
    category: 'adults',
    order: 0,
  },
  {
    name: 'Haircut & Beard',
    slug: 'haircut-beard',
    description: 'Clippers, Scissor & Blade Finish',
    duration: 30,
    price: '45.00',
    price_display_override: null,
    category: 'adults',
    order: 1,
  },
  {
    name: 'Haircut & Design',
    slug: 'haircut-design',
    description: 'Clippers, Scissor, Blade & Design',
    duration: 30,
    price: '45.00',
    price_display_override: '$45.00 & Up',
    category: 'adults',
    order: 2,
  },
  {
    name: 'Full VIP Service',
    slug: 'full-vip-service',
    description: 'Clippers, Scissor, Blade & Hot Towel',
    duration: 30,
    price: '55.00',
    price_display_override: null,
    category: 'adults',
    order: 3,
  },
  {
    name: 'Senior Special',
    slug: 'senior-special',
    description: 'Clippers, Scissor & Blade Finish ( 62+ Yrs )',
    duration: 30,
    price: '25.00',
    price_display_override: null,
    category: 'seniors',
    order: 4,
  },
  {
    name: 'Shape-Up',
    slug: 'shape-up',
    description: 'T-Liner & Blade Finish',
    duration: 30,
    price: '25.00',
    price_display_override: null,
    category: 'adults',
    order: 5,
  },
  {
    name: 'Shape-Up & Beard',
    slug: 'shape-up-beard',
    description: 'T-Liner & Blade Finish',
    duration: 30,
    price: '30.00',
    price_display_override: null,
    category: 'adults',
    order: 6,
  },
  {
    name: 'Clean Shave & Hot Towel',
    slug: 'clean-shave-hot-towel',
    description: 'T-Liner & Blade Finish',
    duration: 30,
    price: '25.00',
    price_display_override: null,
    category: 'adults',
    order: 7,
  },
  {
    name: '1st Haircut Special',
    slug: 'first-haircut-special',
    description: '3 Years Old & Younger',
    duration: 30,
    price: '20.00',
    price_display_override: null,
    category: 'kids',
    order: 8,
  },
  {
    name: 'Kids Special',
    slug: 'kids-special',
    description: '12 Years Old & Younger',
    duration: 30,
    price: '25.00',
    price_display_override: null,
    category: 'kids',
    order: 9,
  },
  {
    name: 'Student Special',
    slug: 'student-special',
    description: 'Mon - Tues ( With School ID )',
    duration: 30,
    price: '25.00',
    price_display_override: null,
    category: 'adults',
    order: 10,
  },
]

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
          ${r.duration},
          ${r.price},
          ${r.price_display_override},
          ${r.category},
          ${r.order},
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
