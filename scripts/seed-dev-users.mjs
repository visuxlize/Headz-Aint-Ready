#!/usr/bin/env node
/**
 * Create Supabase Auth users + public.users rows for local/staging QA.
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 *
 *   npm run seed:dev-users
 *
 * Loads `.env.local` via scripts/load-env-local.mjs so JWT values with `=` (padding) are not
 * truncated — Node's --env-file can break on `=` inside values.
 *
 * Do not use weak passwords in production.
 */
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { loadEnvLocal } from './load-env-local.mjs'

loadEnvLocal()

function normalizeKey(raw) {
  if (!raw) return ''
  let s = String(raw).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  if (s.toLowerCase().startsWith('bearer ')) s = s.slice(7).trim()
  return s
}

const url = normalizeKey(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
const serviceKey = normalizeKey(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
const DATABASE_URL = normalizeKey(process.env.DATABASE_URL ?? '')

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY after loading .env.local.')
  console.error('Ensure .env.local exists in the project root and contains both variables.')
  process.exit(1)
}

try {
  const parts = serviceKey.split('.')
  if (parts.length !== 3) {
    console.error('SUPABASE_SERVICE_ROLE_KEY does not look like a JWT (expected three dot-separated segments).')
    process.exit(1)
  }
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  if (payload.role !== 'service_role') {
    console.error(
      `Wrong API key: JWT "role" is "${payload.role ?? 'missing'}" but must be "service_role".`
    )
    console.error('Use the "service_role" secret from Supabase → Project Settings → API (not the anon / public key).')
    process.exit(1)
  }
  const hostRef = new URL(url).hostname.replace('.supabase.co', '').split('.')[0]
  if (payload.ref && hostRef && payload.ref !== hostRef) {
    console.error(
      `URL/key mismatch: JWT project ref "${payload.ref}" does not match URL host "${hostRef}.supabase.co".`
    )
    console.error('Use the service_role key from the same project as NEXT_PUBLIC_SUPABASE_URL.')
    process.exit(1)
  }
} catch (e) {
  console.error('Could not validate SUPABASE_SERVICE_ROLE_KEY:', e?.message ?? e)
  process.exit(1)
}

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const sql = postgres(DATABASE_URL, { prepare: false, max: 1 })

async function getOrCreateAuthUser(email, password, userMetadata = {}) {
  const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = page?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    })
    if (error) throw error
    console.log(`  Auth: updated password for existing ${email} (${existing.id})`)
    return existing.id
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  })
  if (error) throw error
  if (!data.user) throw new Error('No user returned from createUser')
  console.log(`  Auth: created ${email} (${data.user.id})`)
  return data.user.id
}

async function main() {
  try {
    // --- Admin ---
    const adminEmail = 'test@test.com'
    const adminPassword = '123456'
    console.log('Admin:', adminEmail)
    const adminId = await getOrCreateAuthUser(adminEmail, adminPassword, { full_name: 'Test Admin' })
    await sql`
      INSERT INTO users (id, email, full_name, role, is_active)
      VALUES (${adminId}, ${adminEmail}, ${'Test Admin'}, ${'admin'}, true)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = true,
        updated_at = now()
    `
    await sql`
      INSERT INTO staff_allowlist (email) VALUES (${adminEmail})
      ON CONFLICT (email) DO NOTHING
    `
    console.log('  DB: users + staff_allowlist OK')

    // --- Barber ---
    const barberEmail = 'barbertest@test.com'
    const barberPassword = '123456'
    console.log('Barber:', barberEmail)
    const barberId = await getOrCreateAuthUser(barberEmail, barberPassword, { full_name: 'Barber Test' })
    await sql`
      INSERT INTO users (id, email, full_name, role, is_active)
      VALUES (${barberId}, ${barberEmail}, ${'Barber Test'}, ${'barber'}, true)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = true,
        updated_at = now()
    `
    await sql`
      INSERT INTO staff_allowlist (email) VALUES (${barberEmail})
      ON CONFLICT (email) DO NOTHING
    `
    // Avoid unique conflicts on slug or user_id (dev-only cleanup)
    await sql`DELETE FROM barbers WHERE user_id = ${barberId}`
    await sql`DELETE FROM barbers WHERE slug = ${'barber-test'}`
    const barberAvatar =
      'https://headzaintready.com/wp-content/uploads/2023/02/LOUIELIVE.jpg'
    await sql`
      INSERT INTO barbers (user_id, name, slug, email, avatar_url, is_active, sort_order)
      VALUES (${barberId}, ${'Barber Test'}, ${'barber-test'}, ${barberEmail}, ${barberAvatar}, true, 99)
    `
    console.log('  DB: users + staff_allowlist + barbers (with avatar) OK')

    console.log('\nDone. Sign in at /auth/login with either account.')
  } catch (e) {
    const msg = e?.message || String(e)
    console.error('Error:', msg)
    if (msg.includes('Bearer') || msg.includes('JWT')) {
      console.error(
        '\nFix: In Supabase Dashboard → Project Settings → API, copy the "service_role" key into SUPABASE_SERVICE_ROLE_KEY in .env.local (keep it secret).'
      )
    }
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
