import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { services } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { z } from 'zod'
import { slugifyName } from '@/lib/utils/slug'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.coerce.number().int().optional().default(0),
})

async function uniqueServiceSlug(base: string): Promise<string> {
  let slug = slugifyName(base)
  let n = 0
  for (;;) {
    const [row] = await db.select({ id: services.id }).from(services).where(eq(services.slug, slug)).limit(1)
    if (!row) return slug
    n += 1
    slug = `${slugifyName(base)}-${n}`
  }
}

/** GET — all services (active + inactive) */
export async function GET() {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  const list = await db.select().from(services).orderBy(asc(services.displayOrder), asc(services.name))
  return NextResponse.json({ data: list })
}

/** POST — create service */
export async function POST(request: Request) {
  const auth = await requireAdminApi()
  if ('error' in auth) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const d = parsed.data
  const slug = await uniqueServiceSlug(d.name)
  const price = Number.parseFloat(d.price).toFixed(2)

  const [row] = await db
    .insert(services)
    .values({
      name: d.name.trim(),
      slug,
      description: d.description?.trim() || null,
      durationMinutes: d.durationMinutes,
      price,
      displayOrder: d.displayOrder ?? 0,
      isActive: d.isActive ?? true,
    })
    .returning()

  return NextResponse.json({ data: row }, { status: 201 })
}
