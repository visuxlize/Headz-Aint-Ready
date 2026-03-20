import { loadEnvConfig } from '@next/env'
import type { Config } from 'drizzle-kit'

// drizzle-kit does not load .env.local by default; match Next.js env resolution
loadEnvConfig(process.cwd())

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
