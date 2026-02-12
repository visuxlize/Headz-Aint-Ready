# SaaS Starter Kit

A production-ready SaaS starter kit built with Next.js 14+, Supabase, and Drizzle ORM. Designed to work seamlessly with Cursor AI for rapid development.

## Features

- ✅ **Next.js 14+ App Router** - Modern React framework with server components
- ✅ **Supabase Authentication** - Secure auth with email/password and OAuth
- ✅ **Drizzle ORM** - Type-safe database operations
- ✅ **TypeScript** - Full type safety across the stack
- ✅ **Tailwind CSS** - Utility-first styling
- ✅ **Cursor AI Ready** - Pre-configured `.cursorrules` for AI-assisted development
- ✅ **Protected Routes** - Authentication middleware built-in
- ✅ **API Route Examples** - Standard patterns for backend logic
- ✅ **One-Click Deploy** - Ready for Vercel deployment

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14+ (App Router) |
| **Database** | Supabase (PostgreSQL) |
| **ORM** | Drizzle ORM |
| **Authentication** | Supabase Auth |
| **Styling** | Tailwind CSS |
| **Language** | TypeScript |
| **Deployment** | Vercel |

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works great)
- Git installed

### 2. Clone and Install

```bash
# If using as template, copy the folder
cp -r saas-starter-kit my-new-project
cd my-new-project

# Install dependencies
npm install
```

### 3. Setup Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be ready (takes about 2 minutes)
3. Go to **Project Settings** → **API**
4. Copy your project credentials

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials
```

Your `.env.local` should look like this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to find these:**
- **NEXT_PUBLIC_SUPABASE_URL**: Project Settings → API → Project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Project Settings → API → Project API keys → anon/public
- **SUPABASE_SERVICE_ROLE_KEY**: Project Settings → API → Project API keys → service_role
- **DATABASE_URL**: Project Settings → Database → Connection string → URI

### 5. Setup Database

```bash
# Generate initial migration
npm run db:generate

# Apply migration to your database
npm run db:migrate
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
saas-starter-kit/
├── .cursorrules              # AI instructions for Cursor
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   └── profile/          # Example: User profile endpoint
│   ├── auth/                 # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── signout/
│   ├── dashboard/            # Protected dashboard
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Homepage
├── components/               # Reusable components
│   └── auth/                 # Auth-related components
│       ├── LoginForm.tsx
│       └── SignupForm.tsx
├── lib/
│   ├── db/                   # Database configuration
│   │   ├── index.ts          # Drizzle client
│   │   └── schema.ts         # Database schema
│   └── supabase/             # Supabase clients
│       ├── client.ts         # Client-side
│       └── server.ts         # Server-side
├── drizzle/                  # Generated migrations
├── public/                   # Static files
├── .env.example              # Environment variables template
├── .gitignore
├── drizzle.config.ts         # Drizzle configuration
├── next.config.js            # Next.js configuration
├── package.json
├── postcss.config.js         # PostCSS for Tailwind
├── tailwind.config.js        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

## Using with Cursor

This starter kit includes a comprehensive `.cursorrules` file that teaches Cursor your exact architecture. This means:

1. **Just ask Claude to build features** - Claude knows your tech stack
2. **Consistent code patterns** - All generated code follows the same structure
3. **No repetitive explanations** - You don't need to explain "I use Drizzle" every time
4. **Production-ready code** - Follows best practices automatically

### Example Prompts

```
"Add a posts table with user relationship"
"Create an API route to fetch user posts"
"Build a settings page where users can update their profile"
"Add pagination to the posts list"
```

Cursor will generate code that fits perfectly into your existing architecture.

## Common Tasks

### Adding a New Database Table

1. **Update schema** in `lib/db/schema.ts`:

```typescript
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

2. **Generate migration**:
```bash
npm run db:generate
```

3. **Review migration** in `drizzle/` folder

4. **Apply migration**:
```bash
npm run db:migrate
```

### Creating an API Route

Create file: `app/api/your-endpoint/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Your logic here
  return NextResponse.json({ message: 'Success' })
}
```

### Protecting a Page

Option 1: Layout-level protection (recommended for multiple pages)

```typescript
// app/protected/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({ children }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <>{children}</>
}
```

Option 2: Page-level protection (for individual pages)

```typescript
// app/protected/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <div>Protected content</div>
}
```

### Database Operations

```typescript
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Select all
const allUsers = await db.select().from(users)

// Select with conditions
const user = await db.select().from(users).where(eq(users.email, 'test@example.com'))

// Insert
await db.insert(users).values({ email: 'new@example.com' })

// Update
await db.update(users).set({ fullName: 'John Doe' }).where(eq(users.id, userId))

// Delete
await db.delete(users).where(eq(users.id, userId))
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Add environment variables (copy from `.env.local`)
6. Click "Deploy"

### Environment Variables for Production

Make sure to add these in Vercel's project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL` (your production URL)

## Available Scripts

```bash
# Development
npm run dev          # Start dev server

# Building
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migrations to database
npm run db:push      # Push schema changes directly (use in dev only)
npm run db:studio    # Open Drizzle Studio (visual database manager)

# Code Quality
npm run lint         # Run ESLint
```

## Database Migrations

### When to generate migrations

- After adding/modifying tables in `schema.ts`
- After adding/removing columns
- After changing column types or constraints

### Migration workflow

```bash
# 1. Update your schema in lib/db/schema.ts
# 2. Generate migration
npm run db:generate

# 3. Review the SQL in drizzle/ folder
# 4. Apply migration
npm run db:migrate
```

## Security Best Practices

✅ **Never expose service role key** - Keep it server-side only
✅ **Validate all inputs** - Use Zod for API routes
✅ **Enable Row Level Security** - Configure RLS policies in Supabase
✅ **Use HTTPS in production** - Always
✅ **Rate limit API routes** - Prevent abuse
✅ **Sanitize user input** - Especially for database queries

## Troubleshooting

### "Database URL not set" error

Make sure `.env.local` exists and contains `DATABASE_URL`.

### "Unauthorized" on protected routes

Clear your cookies and sign in again. Your session may have expired.

### Migration errors

Try:
```bash
npm run db:push  # Push schema directly (dev only)
```

Or drop the database and start fresh (dev only):
```bash
# In Supabase SQL Editor
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Then regenerate and apply migrations
npm run db:generate
npm run db:migrate
```

### Build fails on Vercel

1. Check environment variables are set correctly
2. Make sure you're using Node 18+
3. Check build logs for specific errors

## Customization

### Change App Name

1. Update `package.json` → `name`
2. Update `app/layout.tsx` → `metadata.title`
3. Update `app/page.tsx` → Header text

### Add More Auth Providers

See [Supabase Auth documentation](https://supabase.com/docs/guides/auth/social-login) for OAuth setup.

### Styling

This kit uses Tailwind CSS. Modify `tailwind.config.js` to customize:
- Colors
- Fonts
- Spacing
- Breakpoints

## FAQ

**Q: Can I use Prisma instead of Drizzle?**
A: Yes, but you'll need to update the `.cursorrules` file and replace the database layer.

**Q: How do I add email verification?**
A: Supabase handles this automatically. Configure email templates in Supabase dashboard.

**Q: Can I use this for a mobile app?**
A: The backend (API routes + Supabase) can be used with any frontend. For mobile, consider React Native with Supabase client.

**Q: How do I add payments?**
A: Integrate Stripe. Add API routes for checkout and webhooks. Store subscription data in your database.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## License

MIT - Feel free to use this for your projects.

## Support

For issues or questions:
1. Check the documentation above
2. Review the `.cursorrules` file for patterns
3. Ask Cursor AI for help (it knows your architecture!)
4. Open an issue on GitHub

---

Built with ❤️ for rapid SaaS development
