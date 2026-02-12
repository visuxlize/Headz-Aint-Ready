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
