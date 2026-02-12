# Quick Start Guide

This guide will get you up and running in 5 minutes.

## Step 1: Setup Supabase (2 minutes)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: Your project name (e.g., "my-saas-app")
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait about 2 minutes for setup to complete

## Step 2: Get Your Credentials (1 minute)

While still in Supabase:

1. Click **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these values:

   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY`

4. Click **Database** in the left menu
5. Scroll to "Connection string" → Click **URI**
6. Copy the connection string → This is your `DATABASE_URL`
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db...`
   - Replace `[YOUR-PASSWORD]` with the password you chose in Step 1

## Step 3: Configure Your Project (1 minute)

1. Open the project in your code editor
2. Rename `.env.example` to `.env.local`
3. Paste your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=paste_your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here
DATABASE_URL=paste_your_database_url_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Install and Run (1 minute)

Open your terminal and run:

```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you're done! 🎉

## What You Can Do Now

### Test Authentication

1. Go to [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup)
2. Create an account
3. You'll be redirected to the dashboard

### Open Cursor and Start Building

The `.cursorrules` file is already configured. Just ask Claude:

- "Add a blog posts feature with CRUD operations"
- "Create a user profile page with edit functionality"
- "Add a settings page"

Claude knows your entire architecture and will generate production-ready code!

## Common Issues

### "Database URL not set"
- Make sure you renamed `.env.example` to `.env.local`
- Check that `DATABASE_URL` has no spaces
- Make sure you replaced `[YOUR-PASSWORD]` with your actual password

### Can't sign up
- Check Supabase dashboard → Authentication → Email Auth is enabled
- Check browser console for errors
- Try clearing cookies and cache

### Migration errors
- Make sure your `DATABASE_URL` is correct
- Try running `npm run db:push` instead (dev only)

## Next Steps

1. Read the [full README.md](./README.md) for detailed documentation
2. Explore the `.cursorrules` file to see what Claude knows
3. Check out `app/api/profile/route.ts` for API route examples
4. Customize `tailwind.config.js` for your brand colors
5. Start building your features!

## Need Help?

- Check the README.md for detailed docs
- Ask Cursor AI for help (it knows your architecture!)
- Review example code in `app/api/profile/route.ts`
- Look at the auth components in `components/auth/`

Happy building! 🚀
