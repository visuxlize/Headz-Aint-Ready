# Headz Ain't Ready — Cursor Prompts & Development Guide

---

## ACTIVE PROMPT: Website Redesign + Squire Integration

Paste the entire block below into Cursor's composer to implement all 5 planned changes.

```
You are working on the Headz Ain't Ready barbershop website — a Next.js 14 App Router project using Tailwind CSS, Drizzle ORM, and deployed on Netlify. The codebase lives at the root of this repo. The main marketing page is `app/(marketing)/page.tsx`. The site color palette uses `headz-red` (#E22222), `headz-black` (#111), `headz-cream`, and `headz-gray`. All changes must feel cohesive with the existing dark/red/white luxury barbershop aesthetic.

---

## TASK 1 — ANIMATED HERO (Train passing by)

The hero section in `app/(marketing)/page.tsx` currently uses a static background image with a dark overlay. Replace the static approach with an animated train-passing-by hero.

Steps:
1. Keep the same section structure (`data-header-dark`, min-h-[85vh], flex col justify-center).
2. The background asset is `/hero-bg.png` (already in `/public`). This is a Queens/NYC train/subway-themed image.
3. Create a CSS keyframe animation called `trainPass` that:
   - Starts the background-position at `0% 50%`
   - Slowly pans to `100% 50%` over 30 seconds, then reverses (alternate direction), giving the illusion of a train slowly rolling through the background.
   - Use `background-size: 200% 100%` so there is room to pan.
4. Add a secondary subtle layer: a set of 2–3 absolutely-positioned blurred white "light streak" divs that animate across the image from left to right at different speeds (4s, 6s, 9s) to simulate train windows passing. Each streak should be: w-[2px] h-[60%] bg-white/10, blur-sm, animate via translateX from -10px to 100vw.
5. Define these keyframes in `app/globals.css` using `@keyframes trainPass` and `@keyframes lightStreak`.
6. The existing hero text content (Queens NYC label, H1, tagline, Book Now + Call CTA) stays exactly the same. Only the background animation changes.

---

## TASK 2 — MOBILE HERO / INTRO SECTION (Queens welcome screen)

After the main hero, before the Dream Team video section, insert a new full-width "Welcome" section that mirrors the aesthetic of the mobile reference image (dark cityscape bg, scissors/comb icon, "WELCOME TO THE LEGENDARY" in spaced caps, large italic script "Queen's", "HEADZ AIN'T READY BARBERSHOP" in wide tracking caps, and a red BOOK APPOINTMENT CTA).

Implementation:
1. Use `/hero-bg.png` as background with a `bg-black/65` overlay.
2. Center a scissors icon above the headline — use Unicode ✂ or an inline SVG, styled at text-5xl text-white.
3. Text layout (centered, full-width):
   - `<p>` "WELCOME TO THE LEGENDARY" — tracking-[0.3em] text-sm font-light text-white uppercase
   - `<h2>` "Queen's" — font-serif italic text-7xl sm:text-8xl text-white font-bold drop-shadow-lg
   - `<p>` "HEADZ AIN'T READY BARBERSHOP" — tracking-[0.25em] text-sm uppercase text-white/90 font-medium
4. Below: a red bordered Book Appointment button (border-2 border-headz-red bg-headz-red/20 hover:bg-headz-red text-white px-10 py-4 uppercase tracking-widest text-sm font-semibold transition) linking to `/book`.
5. Section: min-h-[75vh], flex flex-col items-center justify-center gap-6, `data-header-dark`.

---

## TASK 3 — HISTORY + TESTIMONIALS (replace "Skip the wait" section)

Remove the current "Skip the wait" dark section entirely. Insert a new two-column section AFTER the Dream Team video and BEFORE the Services section.

Left column — History & About (mirrors Image 1 style):
- Small red uppercase label: "OVER 25 YEARS IN..."
- Large bold serif italic headline: "The Industry" (font-serif italic text-5xl font-bold)
- Body paragraph: "Headz Ain't Ready Was Established In 1995 In Jackson Heights, Queens. Since Then We Have Been Serving Thousands Of Clients In New York & The Entire Tri-State Area. We Take Pride In Art Of Barbering & Let Our Work Speak For Itself."
- Two feature rows with a red circle checkmark SVG icon:
  - "Open 7 Days" / "Monday - Sun: 9am - 8pm"
  - "Master Barbers" / "& State Of The Art Chairs"
- Red BOOK APPOINTMENT button linking to /book.

Right column — Google Reviews (4 styled cards):
Do NOT copy-paste from Google. Re-create as styled cards using these review details:

  Card 1: Carlos M. ★★★★★ — "Been coming here since I was a kid. Real Queens institution. The barbers know their craft — fades are always clean and tight. Wouldn't go anywhere else."
  Card 2: David R. ★★★★★ — "Best shop in Jackson Heights, hands down. Walk in, get treated right, walk out looking fresh. Staff is professional and the vibe is always good."
  Card 3: Mike T. ★★★★★ — "These guys have been cutting hair in this neighborhood for decades and it shows. Consistent, sharp, and always on point. Highly recommend."
  Card 4: Anthony L. ★★★★★ — "Brought my son here for his first cut. The barber was patient and did an amazing job. This is the kind of place you keep coming back to."

Card design:
- `bg-headz-black/90 border border-white/10 rounded-xl p-5`
- A red "G" circle icon top-left (inline SVG or span styled with bg-headz-red rounded-full)
- 5 gold stars: ★★★★★ text-yellow-400
- Review text in text-white/80 text-sm
- Reviewer name in text-white font-semibold
- "Google Review" in text-white/40 text-xs

Section wrapper: `py-20 px-4 sm:px-6 bg-white` with `max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start`.

---

## TASK 4 — PRICE LIST + GALLERY SIDE BY SIDE

Redesign the price section as two columns: Price List LEFT, Photo Gallery RIGHT.

1. Change the price section wrapper from `max-w-2xl mx-auto` to `max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start`.
2. Left side = existing price list table (same logic, just inside the grid).
3. Right side = Gallery:
   - Title: "The Work" text-2xl font-bold mb-6
   - Sub-label: "FRESH CUTS • REAL CLIENTS" in text-headz-red uppercase tracking-widest text-xs mb-4
   - Grid of 6 images: `grid grid-cols-2 gap-3`
   - Use these Unsplash URLs:
     - https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80
     - https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80
     - https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80
     - https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=80
     - https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80
     - https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80
   - Each image: `aspect-square rounded-lg overflow-hidden hover:scale-105 transition-transform duration-300 shadow-md`, using Next.js `<Image>` with fill + object-cover inside a relative wrapper.
4. Add `images.unsplash.com` to `next.config.js` remotePatterns if not already present.

---

## TASK 5 — SQUIRE INTEGRATION (replace Square POS)

Replace the existing Square POS integration with Squire (getsquire.com).

### API Routes:

1. Deprecate these Square routes (return 410 Gone with JSON `{ error: "Square deprecated. Use /api/squire/" }`):
   - app/api/square/terminal-checkout/route.ts
   - app/api/square/terminal-checkout/[checkoutId]/route.ts
   - app/api/square/terminal-checkout/[checkoutId]/cancel/route.ts
   - app/api/square/devices/route.ts
   - app/api/square/devices/[id]/route.ts
   - app/api/square/record-cash/route.ts
   - app/api/square/refund/route.ts
   - app/api/square/webhook/route.ts

2. Create app/api/squire/ with:

   webhook/route.ts — POST. Validate `x-squire-signature` header against `process.env.SQUIRE_WEBHOOK_SECRET` using HMAC-SHA256. Parse and log event body. Return 200.

   checkout/route.ts — POST. Accept `{ barberId, serviceId, appointmentId, amount }`. POST to `https://api.getsquire.com/v1/terminal/checkout` with `Authorization: Bearer ${process.env.SQUIRE_API_KEY}`. Return checkout session JSON.

   checkout/[checkoutId]/route.ts — GET. Poll checkout status from `https://api.getsquire.com/v1/terminal/checkout/:checkoutId`.

   checkout/[checkoutId]/cancel/route.ts — POST. Cancel via `https://api.getsquire.com/v1/terminal/checkout/:checkoutId/cancel`.

   refund/route.ts — POST. Accept `{ paymentId, amount, reason }`. POST to `https://api.getsquire.com/v1/payments/:paymentId/refund`.

   record-cash/route.ts — POST. Accept `{ barberId, appointmentId, amount }`. Log and return 200 (stub for now).

   status/route.ts — GET. Return `{ connected: !!process.env.SQUIRE_API_KEY }`.

3. Add to .env.local.example (create if missing):
   SQUIRE_API_KEY=
   SQUIRE_WEBHOOK_SECRET=
   SQUIRE_LOCATION_ID=

### Dashboard Pages:

4. app/dashboard/(admin)/pos/page.tsx — Replace redirect with a real "Squire POS Terminal" server component page:
   - Fetch /api/squire/status to get connected boolean.
   - Show a SquirePOSStatus badge component.
   - "Launch Terminal" button linking to https://app.getsquire.com (target _blank).
   - Placeholder recent transactions table (3 static rows: date, barber, service, amount, status badge).
   - Dark card styling matching admin dashboard aesthetic with headz-red accents.

5. app/dashboard/barber/pos/page.tsx — Replace redirect with 'use client' barber checkout page:
   - "Charge Customer" button POSTing to /api/squire/checkout.
   - useEffect polling /api/squire/checkout/[checkoutId] every 3 seconds until COMPLETED or CANCELLED.
   - Status display: Pending → Processing → Complete (green ✓) or Failed (red ✗).
   - "Record Cash Payment" button POSTing to /api/squire/record-cash.
   - Styling: headz-black bg, headz-red accents, white text — match barber dashboard card style.

6. app/dashboard/settings/devices/page.tsx — Read this file first, then update all Square device/terminal references to say "Squire Terminal" and point config links to https://app.getsquire.com/settings.

### Components:

7. Create components/pos/SquirePOSStatus.tsx:
   Props: `{ connected: boolean }`
   - connected=true: green dot + "Squire POS Active" in text-green-400
   - connected=false: red dot + "Configure Squire API Key" in text-red-400
   Small pill badge style.

8. Read components/HeadzPOS.tsx first, then replace all Square SDK calls with fetch calls to the new /api/squire/ routes. Keep the same component props/interface so nothing breaks downstream.

---

## GENERAL RULES

- Next.js 14 App Router. Server components by default; use 'use client' only when needed (interactivity/hooks).
- Tailwind only — no new CSS libraries or component libraries.
- All keyframe animations go in app/globals.css.
- Always use next/image, never <img>.
- Full TypeScript — no `any` unless unavoidable with external API responses (type those as explicit interfaces).
- Do not remove or break the DB query logic at the top of app/(marketing)/page.tsx.
- After all tasks: run `npx tsc --noEmit` to confirm zero type errors.
```

---

# Using This Starter Kit with Cursor AI

This guide shows you how to leverage Cursor AI with this starter kit to build features incredibly fast.

## Why This Works So Well

The `.cursorrules` file teaches Claude your **exact architecture**. This means:

1. **No repetitive explanations** - Claude already knows you use Drizzle, not Prisma
2. **Consistent patterns** - All code follows the same structure
3. **Production quality** - Generated code includes error handling, types, validation
4. **Fast iteration** - Build features in minutes, not hours

## The Development Workflow

### 1. Start with a Clear Request

Instead of vague requests, be specific about what you want:

❌ **Bad**: "Add a blog"
✅ **Good**: "Add a blog posts feature with title, content, and published status. Users should be able to create, edit, and delete their own posts."

### 2. Let Cursor Build the Database Schema

**Your request:**
```
Add a blog posts table with:
- title (required)
- content (optional)
- published boolean (default false)
- user relationship
- timestamps
```

**What Cursor will do:**
1. Update `lib/db/schema.ts` with the new table
2. Tell you to run `npm run db:generate` and `npm run db:migrate`
3. Show you the exact schema it created

### 3. Build the API Routes

**Your request:**
```
Create API routes for blog posts:
- GET /api/posts - list all published posts
- GET /api/posts/my-posts - get current user's posts
- POST /api/posts - create new post
- PUT /api/posts/[id] - update post
- DELETE /api/posts/[id] - delete post
```

**What Cursor will do:**
1. Create all route files in the correct structure
2. Add authentication checks
3. Include input validation with Zod
4. Add proper error handling
5. Use the correct database operations

### 4. Build the UI Components

**Your request:**
```
Create a posts dashboard page with:
- List of user's posts
- Create new post button
- Edit and delete actions for each post
- Published/draft indicator
```

**What Cursor will do:**
1. Create the page with proper auth protection
2. Build form components with validation
3. Add loading states and error handling
4. Use proper TypeScript types
5. Style with Tailwind CSS

## Example Development Sessions

### Session 1: Building a Todo List Feature

```
You: "Add a todos table with title, completed boolean, and user relationship"

Cursor: [Creates schema] → You run migration

You: "Create CRUD API routes for todos"

Cursor: [Creates all routes with auth, validation, error handling]

You: "Build a todo list page where users can add, check off, and delete todos"

Cursor: [Creates complete UI with forms, list, and interactions]
```

**Time**: 10-15 minutes for a complete CRUD feature!

### Session 2: Adding User Profiles

```
You: "Add profile fields to the users table: bio, avatar, location, website"

Cursor: [Updates schema] → You run migration

You: "Create a profile settings page where users can update these fields"

Cursor: [Creates form with validation, image upload handling, API route]

You: "Create a public profile page at /profile/[userId]"

Cursor: [Creates public profile page with proper data fetching]
```

**Time**: 15-20 minutes for complete profile system!

### Session 3: Building a Comment System

```
You: "Add a comments table with content, postId, userId, and timestamps"

Cursor: [Creates schema with relationships]

You: "Add API routes for creating and listing comments on posts"

Cursor: [Creates routes with proper validation]

You: "Add a comments section to the post detail page"

Cursor: [Creates UI with comment form, list, and real-time updates]
```

**Time**: 15-20 minutes for a complete comment system!

## Pro Tips for Working with Cursor

### 1. Build Features Incrementally

Don't ask for everything at once. Break it down:

1. Database schema
2. API routes
3. UI components
4. Polish and refinement

This lets you test each layer before moving to the next.

### 2. Ask for Explanations When Learning

```
You: "Why did you use .returning() in the database insert?"

Cursor: [Explains that it returns the inserted row, useful for getting auto-generated IDs]
```

This helps you learn patterns while building.

### 3. Request Specific Patterns

Since Cursor knows your architecture:

```
"Follow the same pattern as the profile API route but for posts"
```

Cursor will replicate the exact structure, just adapted for your new feature.

### 4. Iterate and Refine

```
You: "Add pagination to the posts list"
You: "Add search functionality"
You: "Add sorting by date and popularity"
```

Build the basic version first, then add features one by one.

### 5. Use the Database Studio

```bash
npm run db:studio
```

Opens Drizzle Studio in your browser to:
- View your data visually
- Test queries
- Understand relationships
- Debug issues

## Common Patterns Cursor Knows

Because of `.cursorrules`, Cursor automatically:

### ✅ Database Operations
- Uses Drizzle ORM correctly
- Adds proper relationships
- Includes timestamps
- Uses UUID primary keys

### ✅ API Routes
- Checks authentication first
- Validates input with Zod
- Returns proper status codes
- Handles errors gracefully
- Uses TypeScript types

### ✅ Components
- Marks client components with "use client"
- Uses Server Components by default
- Includes loading states
- Handles errors properly
- Types all props

### ✅ Authentication
- Protects routes correctly
- Uses server client for Server Components
- Uses browser client for Client Components
- Handles redirects properly

## Debugging with Cursor

When something doesn't work:

```
You: "The posts aren't showing up on the dashboard. Help me debug this."

Cursor: [Checks database queries, auth logic, component rendering, suggests fixes]
```

Cursor can walk through your code and identify issues.

## Advanced Workflows

### Adding Third-Party APIs

```
You: "Add Stripe payment integration. Create an API route for checkout and one for webhooks."

Cursor: [Creates routes with proper Stripe SDK usage, webhook verification, database updates]
```

### Adding Real-Time Features

```
You: "Add real-time updates to the posts list using Supabase realtime"

Cursor: [Adds Supabase subscription in component, handles updates properly]
```

### Optimizing Performance

```
You: "This page is slow. Help me optimize it with proper caching and fewer database calls."

Cursor: [Suggests and implements caching strategies, query optimization, etc.]
```

## What to Build Next

Now that you understand the workflow, here are ideas to practice:

### Beginner Projects
1. **Todo App** - Classic CRUD operations
2. **Notes App** - Rich text editing
3. **Bookmark Manager** - Save and organize links

### Intermediate Projects
1. **Blog Platform** - Posts, comments, likes
2. **Project Tracker** - Tasks, boards, teams
3. **Recipe Book** - Recipes, ingredients, ratings

### Advanced Projects
1. **SaaS with Stripe** - Subscriptions, billing, teams
2. **Social Network** - Friends, posts, messages
3. **Marketplace** - Products, orders, reviews

## Key Takeaways

1. **Be specific in requests** - Claude works best with clear requirements
2. **Build incrementally** - Database → API → UI
3. **Trust the patterns** - The `.cursorrules` ensure consistency
4. **Ask questions** - Claude can explain why it chose certain approaches
5. **Iterate quickly** - Build fast, test, refine

## Remember

You're not just getting code generation. You're getting:
- **Architecture decisions** - Cursor knows the right patterns
- **Best practices** - Error handling, validation, security
- **Type safety** - Full TypeScript integration
- **Consistency** - Every feature follows the same structure

This means you can focus on **what** to build, not **how** to build it.

Happy building! 🚀
