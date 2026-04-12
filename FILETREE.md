# Project File Structure

```
saas-starter-kit/
│
├── 📄 Configuration Files
│   ├── .cursorrules              # AI instructions for Cursor (CRITICAL!)
│   ├── .env.example              # Environment variables template
│   ├── .gitignore                # Git ignore rules
│   ├── drizzle.config.ts         # Drizzle ORM configuration
│   ├── next.config.js            # Next.js configuration
│   ├── package.json              # Dependencies and scripts
│   ├── postcss.config.js         # PostCSS for Tailwind
│   ├── tailwind.config.js        # Tailwind CSS configuration
│   └── tsconfig.json             # TypeScript configuration
│
├── 📚 Documentation
│   ├── README.md                 # Complete documentation
│   ├── QUICKSTART.md             # 5-minute quick start
│   ├── CURSOR_GUIDE.md           # How to use with Cursor AI
│   ├── DEPLOYMENT.md             # Deployment overview (Vercel)
│   ├── vercel.json               # Cron schedule (no-show checker)
│   └── FILETREE.md               # This file
│
├── 🔧 Scripts
│   └── setup.sh                  # Project setup script
│
├── 📱 Application (app/)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   ├── globals.css               # Global styles with Tailwind
│   │
│   ├── auth/                     # Authentication routes
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   ├── signup/
│   │   │   └── page.tsx          # Signup page
│   │   └── signout/
│   │       └── route.ts          # Signout handler
│   │
│   ├── dashboard/                # Protected dashboard
│   │   ├── layout.tsx            # Dashboard layout with auth
│   │   └── page.tsx              # Dashboard home
│   │
│   └── api/                      # API routes
│       └── profile/
│           └── route.ts          # Example: User profile API
│
├── 🧩 Components (components/)
│   └── auth/
│       ├── LoginForm.tsx         # Login form component
│       └── SignupForm.tsx        # Signup form component
│
├── 🗄️ Database & Backend (lib/)
│   ├── db/
│   │   ├── index.ts              # Drizzle client connection
│   │   └── schema.ts             # Database schema definitions
│   │
│   └── supabase/
│       ├── client.ts             # Client-side Supabase client
│       └── server.ts             # Server-side Supabase client
│
├── 📁 Migrations (drizzle/)
│   └── (Auto-generated SQL migrations)
│
└── 🎨 Public Assets (public/)
    └── (Static files, images, etc.)
```

## File Descriptions

### Core Configuration

**`.cursorrules`** 
- **Most Important File!** 
- Teaches Cursor AI your entire architecture
- Contains all patterns, best practices, and conventions
- Makes AI assistance incredibly powerful

**`.env.example`**
- Template for environment variables
- Copy to `.env.local` and fill in your credentials

**`package.json`**
- Dependencies: Next.js, Supabase, Drizzle, etc.
- Scripts: dev, build, database commands

### Documentation Files

**`README.md`**
- Complete documentation
- All features explained
- Common tasks and examples
- Troubleshooting guide

**`QUICKSTART.md`**
- Get running in 5 minutes
- Step-by-step setup
- Most important for beginners

**`CURSOR_GUIDE.md`**
- How to use Cursor AI effectively
- Example workflows
- Pro tips and patterns

**`DEPLOYMENT.md`**
- Deploy to Vercel (env vars, cron, health check)
- Production configuration

### Application Structure

**`app/layout.tsx`**
- Root layout
- Wraps entire app
- Global metadata

**`app/page.tsx`**
- Homepage
- Landing page
- Navigation to key features

**`app/auth/*`**
- Authentication pages
- Login, signup, signout
- Form components

**`app/dashboard/*`**
- Protected routes
- Requires authentication
- User-specific content

**`app/api/*`**
- Backend API routes
- REST endpoints
- Server-side logic

### Components

**`components/auth/LoginForm.tsx`**
- Client component
- Handles login
- Form validation and submission

**`components/auth/SignupForm.tsx`**
- Client component
- User registration
- Password validation

### Database Layer

**`lib/db/schema.ts`**
- Define all database tables
- Type-safe schema
- Relationships between tables

**`lib/db/index.ts`**
- Database connection
- Drizzle client instance
- Used for all queries

### Supabase Clients

**`lib/supabase/server.ts`**
- Server-side authentication
- Use in Server Components
- Use in API routes

**`lib/supabase/client.ts`**
- Client-side authentication
- Use in Client Components
- Use in browser

## How Files Work Together

### Authentication Flow

1. **User visits** `/auth/login`
2. **Renders** `app/auth/login/page.tsx`
3. **Uses component** `components/auth/LoginForm.tsx`
4. **Calls** Supabase via `lib/supabase/client.ts`
5. **Redirects** to `/dashboard`
6. **Protected by** `app/dashboard/layout.tsx` checking auth

### Database Operation Flow

1. **Define schema** in `lib/db/schema.ts`
2. **Generate migration** with `npm run db:generate`
3. **Apply migration** with `npm run db:migrate`
4. **Use in API** via `lib/db/index.ts`
5. **Query database** with Drizzle ORM

### API Request Flow

1. **Client makes request** to `/api/profile`
2. **Handled by** `app/api/profile/route.ts`
3. **Authenticates** via `lib/supabase/server.ts`
4. **Queries database** via `lib/db/index.ts`
5. **Returns JSON** response

## Key Patterns

### Server vs Client Components

**Server Components** (default)
- No "use client" directive
- Can use `lib/supabase/server.ts`
- Can directly query database
- Better performance

**Client Components** (with "use client")
- Has "use client" at top
- Uses `lib/supabase/client.ts`
- Can use React hooks
- Interactive features

### Database Pattern

```typescript
// 1. Define schema
export const posts = pgTable('posts', { ... })

// 2. Generate migration
// npm run db:generate

// 3. Use in API
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
const allPosts = await db.select().from(posts)
```

### API Route Pattern

```typescript
// 1. Authenticate
const { data: { user } } = await supabase.auth.getUser()

// 2. Validate input
const schema = z.object({ ... })
const data = schema.parse(body)

// 3. Database operation
const result = await db.insert(table).values(data)

// 4. Return response
return NextResponse.json({ data: result })
```

## What to Modify First

### 1. Branding
- `app/layout.tsx` - Update title and description
- `app/page.tsx` - Update homepage content
- `tailwind.config.js` - Add your brand colors

### 2. Features
- `lib/db/schema.ts` - Add your tables
- `app/api/*` - Add your endpoints
- `app/dashboard/*` - Add your pages

### 3. Styling
- `app/globals.css` - Global styles
- `tailwind.config.js` - Theme customization
- Individual components - Component-specific styles

## Files You Shouldn't Modify

- `.cursorrules` - Unless you change architecture
- Configuration files - Unless you know what you're doing
- `lib/supabase/*` - These are standard patterns

## Next Steps

1. Read through `QUICKSTART.md`
2. Set up your environment with `.env.local`
3. Run the development server
4. Start adding features!

The structure is designed to scale from a small project to a full SaaS application.
