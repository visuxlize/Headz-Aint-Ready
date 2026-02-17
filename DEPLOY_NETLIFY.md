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

The repo’s `netlify.toml` already sets the build. Netlify will detect Next.js. Confirm:

- **Build command:** `npm run build` (from `netlify.toml`)
- **Publish directory:** leave default (Netlify’s Next.js runtime uses this)
- **Base directory:** leave blank unless the app lives in a subfolder

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
