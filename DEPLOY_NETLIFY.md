# Deploy Headz Ain't Ready to Netlify (Step-by-Step)

Follow these steps in order. You need your repo on GitHub first (e.g. https://github.com/visuxlize/Headz-Aint-Ready).

---

## Step 1: Open Netlify and sign in

1. Go to **https://app.netlify.com** in your browser.
2. Click **"Sign up"** or **"Log in"**.
3. Choose **"Sign up with GitHub"** or **"Log in with GitHub"** so Netlify can see your repos.

---

## Step 2: Add a new site from GitHub

1. From the Netlify dashboard, click **"Add new site"** → **"Import an existing project"**.
2. Under **"Connect to Git provider"**, click **"GitHub"**.
3. If you don’t see your repo:
   - Authorize Netlify for your GitHub account (or adjust permissions to include the repo).
   - Come back and refresh.
4. Find **"Headz-Aint-Ready"** (or your repo name) and click **"Import"** or **"Select"**.

---

## Step 3: Configure build (use repo defaults)

The repo’s `netlify.toml` sets the build and **includes the Next.js plugin** so API routes and the backend run. Confirm:

- **Build command:** `npm run build`
- **Publish directory:** leave default (the plugin sets this)
- **Base directory:** leave blank

Don’t click **"Deploy site"** yet.

---

## Step 4: Add environment variables

Your app needs these so it can talk to Supabase and the database.

1. On the same screen, expand **"Environment variables"** (or go to **Site settings → Environment variables** after the first deploy).
2. Add these (Name exactly as below; Value from your `.env.local`):

   | Name (copy exactly)              | Where to get the value                    |
   |----------------------------------|-------------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`       | In `.env.local`: line that starts with this |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | In `.env.local`: line that starts with this |
   | `DATABASE_URL`                   | In `.env.local`: line that starts with this |

3. Scope: **All** or **Production**.
4. Save each variable.

**Tip:** Copy from `.env.local`; don’t share that file or paste it in chat—only into Netlify’s form.

---

## Step 5: Deploy

1. Click **"Deploy site"** (or **"Deploy Headz-Aint-Ready"**).
2. Netlify will run install and build (from `netlify.toml`). This can take a few minutes.
3. If the build succeeds, you’re done. If it fails, see **Troubleshooting** below.

---

## Step 6: Open your live site

1. When the deploy finishes, Netlify shows a URL like `https://random-name-123.netlify.app`.
2. Click **"Open production deploy"** or the URL. That’s your live site.
3. You can change the site name under **Site configuration → Domain management** (e.g. `headz-aint-ready.netlify.app`) or add a custom domain.

---

## Troubleshooting

**“I don’t see my repo”**  
- Make sure you’re logged in with the GitHub account that owns the repo.  
- In Netlify: **Team settings → Integrations → GitHub** and ensure the repo (or org) is allowed.

**“Build failed”**  
- Open the failed deploy in Netlify and read the **Build log**.  
- Common: missing env vars—confirm all three variables are set and names have no typos or extra spaces.  
- If you see “Cannot find module 'autoprefixer'”, the repo’s `netlify.toml` sets `NPM_FLAGS = "--include=dev"` so devDependencies install; redeploy after pushing that.

**“Site loads but login/booking doesn’t work”**  
- Confirm all three env vars in **Site settings → Environment variables**.  
- Redeploy: **Deploys → Trigger deploy → Deploy site**.

**“I already deployed without env vars”**  
- **Site settings → Environment variables**: add the three variables.  
- **Deploys → Trigger deploy → Deploy site** so the new build picks them up.

---

## Quick checklist

- [ ] Signed in to Netlify with GitHub  
- [ ] Imported **Headz-Aint-Ready** (or your repo)  
- [ ] Added `NEXT_PUBLIC_SUPABASE_URL`  
- [ ] Added `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- [ ] Added `DATABASE_URL`  
- [ ] Clicked **Deploy site**  
- [ ] Build succeeded and opened the production URL  

That’s it. The backend (Supabase + DB) works on Netlify as long as those three variables are set and the build succeeds.

---

## Ensure the backend works (booking, login, API)

After the first deploy, do these so booking and staff login work in production.

### 1. Environment variables

- In Netlify: **Site configuration → Environment variables** (or **Site settings → Environment variables**).
- You must have all three set for **Production** (and **Deploy previews** if you want previews to use the DB):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL`
- **Redeploy after adding or changing env vars**: **Deploys → Trigger deploy → Deploy site**. Builds use env vars at build time; serverless functions use them at runtime only after a new deploy.

### 2. Database connection string (DATABASE_URL)

- Use Supabase **Session** (connection pooler) if possible, not **Direct**.
- In Supabase: **Project → Settings → Database → Connection string** → choose **URI** and **Session mode** (port **5432**). Copy that URI and set it as `DATABASE_URL` in Netlify.
- **ENOTFOUND on pooler host?** Use **`aws-0-[region]`** (hyphen after aws: **aws-0** not **aws0**). Fix `DATABASE_URL` in Netlify and redeploy.
- If you only have Direct and see connection errors (e.g. timeouts or ENETUNREACH) on Netlify, the app will still load but the book page will show “Booking is temporarily unavailable” until the DB is reachable.

### 3. Supabase auth redirect for your Netlify URL

- In Supabase: **Authentication → URL configuration**.
- Set **Site URL** to: `https://headz-aint-ready.netlify.app`
- In **Redirect URLs**, add: `https://headz-aint-ready.netlify.app/**` (and your custom domain if you use one later).
- This lets sign-in and callbacks work on the deployed site.

### 4. Next.js plugin (API routes / backend)

- The repo’s `netlify.toml` includes `@netlify/plugin-nextjs` so Netlify runs the Next.js runtime (SSR + API routes). The plugin is in `package.json` as a devDependency.
- If the backend still doesn’t work after adding env vars: **trigger a new deploy** (Deploys → Trigger deploy → Deploy site). The plugin runs during build and deploys serverless functions for your API routes.
- In **Site configuration → Build & deploy → Build settings**, leave **Build command** as `npm run build` and do not set a custom **Publish directory** (the plugin handles it).

### 5. Quick backend check

- Open your Netlify URL → **Book** → pick barber, service, date, time. If you can complete a booking, the backend is working.
- **Staff login**: go to **/auth/login**, sign in with an email that’s in `staff_allowlist` in the DB; you should reach the dashboard.

### 6. “Booking is temporarily unavailable” – diagnose with /api/health

If the Book page shows **“Booking is temporarily unavailable”**, the server can’t reach the database. Use the health endpoint to see why:

1. Open **https://headz-aint-ready.netlify.app/api/health** in your browser (or your actual Netlify URL + `/api/health`).
2. You’ll see JSON like:
   - `{ "ok": true, "hasDatabaseUrl": true, "dbOk": true }` → backend is fine; if Book still fails, do a hard refresh or redeploy.
   - `{ "ok": false, "hasDatabaseUrl": false }` → **DATABASE_URL is not set** in Netlify. Add it under **Site configuration → Environment variables**, then **Deploys → Trigger deploy**.
   - `{ "ok": false, "hasDatabaseUrl": true, "dbOk": false, "error": "…" }` → **DATABASE_URL is set but the DB connection failed.** Usually this means:
     - You’re using the **Direct** connection string. Switch to **Session** (pooler): Supabase → **Settings → Database → Connection string** → **URI** → **Session mode** (port **5432**). Replace `DATABASE_URL` in Netlify with that URI and redeploy.
     - Wrong password or project ref in the URI; fix the value and redeploy.
3. After any env change, **trigger a new deploy** so the serverless functions get the new variables.
