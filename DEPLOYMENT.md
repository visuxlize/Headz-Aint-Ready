# Deployment Guide - Vercel

This guide walks you through deploying your SaaS app to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Your code pushed to a GitHub repository

## Step 1: Push to GitHub

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add your files
git add .
git commit -m "Initial commit"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

## Step 2: Import to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

## Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

### Required Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Important:** 
- Get these from your Supabase project settings
- Update `NEXT_PUBLIC_APP_URL` with your Vercel URL after first deployment
- All variables are **case-sensitive**

## Step 4: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Your app is live! 🎉

## Step 5: Update Supabase Settings

After your first deployment:

1. Go to Supabase dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel URL to:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

This allows authentication redirects to work properly.

## Step 6: Setup Custom Domain (Optional)

1. In Vercel, go to project → **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update `NEXT_PUBLIC_APP_URL` environment variable to your custom domain
5. Update Supabase redirect URLs to include your custom domain

## Automatic Deployments

Every time you push to GitHub:
- Vercel automatically builds and deploys
- Preview deployments for pull requests
- Production deployment for main branch

## Database Migrations in Production

Before deploying database changes:

```bash
# 1. Generate migration locally
npm run db:generate

# 2. Commit migration files
git add drizzle/
git commit -m "Add migration for [feature]"

# 3. Push to GitHub
git push

# 4. Vercel will automatically run migrations during build
```

The build process automatically runs `npm run build`, which should include your migrations.

## Monitoring and Logs

### View Logs
1. Go to your Vercel project
2. Click "Deployments"
3. Click on a deployment
4. View build logs and runtime logs

### Error Tracking

Consider adding error tracking:
- [Sentry](https://sentry.io) - Error monitoring
- [LogRocket](https://logrocket.com) - Session replay
- [PostHog](https://posthog.com) - Product analytics

## Environment-Specific Configuration

### Development
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production
```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Preview Deployments
Vercel automatically sets preview URLs. Access via Vercel dashboard.

## Performance Optimization

### 1. Enable Edge Runtime (Optional)

For API routes that can run on the edge:

```typescript
// app/api/your-route/route.ts
export const runtime = 'edge'
```

### 2. Optimize Images

Already configured in `next.config.js`:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
    },
  ],
}
```

### 3. Enable Caching

Add caching to API routes:
```typescript
export const revalidate = 60 // Cache for 60 seconds
```

## Security Checklist

Before going to production:

- [ ] All environment variables set correctly
- [ ] Service role key is NOT exposed to client
- [ ] Supabase Row Level Security (RLS) policies configured
- [ ] CORS configured properly
- [ ] Rate limiting on sensitive endpoints
- [ ] Input validation on all API routes
- [ ] HTTPS enforced (automatic with Vercel)

## Cost Optimization

### Vercel Free Tier Limits
- 100GB bandwidth/month
- Unlimited deployments
- Automatic SSL
- Edge network
- More than enough for most projects!

### Supabase Free Tier Limits
- 500MB database
- 1GB file storage
- 50,000 monthly active users
- Great for getting started!

### When to Upgrade
- Vercel: When you exceed bandwidth or need more team features
- Supabase: When you need more storage or compute

## Troubleshooting

### Build Fails

**Check:**
1. All dependencies in `package.json`
2. Environment variables set correctly
3. TypeScript errors in code
4. Database connection works

**Common fixes:**
```bash
# Locally test production build
npm run build
```

### "Cannot find module" errors

Make sure all imports use the `@/` alias correctly:
```typescript
// ✅ Good
import { db } from '@/lib/db'

// ❌ Bad
import { db } from '../../../lib/db'
```

### Database Connection Issues

1. Check `DATABASE_URL` is correct
2. Verify Supabase project is not paused
3. Check connection pooling limits
4. Review Supabase logs

### Authentication Not Working

1. Verify redirect URLs in Supabase
2. Check environment variables
3. Ensure cookies are enabled
4. Verify API keys are correct

## Rollback Deployments

If something breaks:

1. Go to Vercel dashboard
2. Click "Deployments"
3. Find a working deployment
4. Click "..." → "Promote to Production"

Instant rollback! 🎉

## CI/CD Best Practices

### Preview Deployments

Every PR gets a preview URL:
1. Test changes in production-like environment
2. Share with team for review
3. Automatic cleanup after merge

### Protected Branches

In GitHub:
1. Go to repository → **Settings** → **Branches**
2. Add rule for `main` branch
3. Require:
   - Pull request reviews
   - Status checks (Vercel preview)
   - Up-to-date branches

## Scaling Considerations

As your app grows:

### 1. Database Optimization
- Add indexes to frequently queried columns
- Use database connection pooling
- Consider read replicas

### 2. Caching Strategy
- Cache API responses
- Use Vercel Edge Config
- Implement Redis for session storage

### 3. CDN for Assets
- Images already optimized via Next.js
- Static files served from edge
- Consider Cloudflare for additional CDN

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

## Next Steps

After deployment:

1. ✅ Set up monitoring (Vercel Analytics)
2. ✅ Configure error tracking
3. ✅ Enable SSL (automatic)
4. ✅ Set up custom domain (optional)
5. ✅ Configure email templates in Supabase
6. ✅ Test all features in production
7. ✅ Set up backup strategy

Your app is now live and ready for users! 🚀
