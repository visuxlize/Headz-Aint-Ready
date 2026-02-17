# Deploy Headz Ain't Ready to Vercel (Step-by-Step)

Follow these steps in order. You need your repo on GitHub first (you already have: https://github.com/visuxlize/Headz-Aint-Ready).

---

## Step 1: Open Vercel and sign in

1. Go to **https://vercel.com** in your browser.
2. Click **"Sign Up"** or **"Log In"**.
3. Choose **"Continue with GitHub"** and approve so Vercel can see your repos.

---

## Step 2: Create a new project from GitHub

1. From the Vercel dashboard, click **"Add New..."** (top right) → **"Project"**.
   - Or go directly: **https://vercel.com/new**
2. You’ll see **"Import Git Repository"**.
3. If you don’t see your repo:
   - Click **"Adjust GitHub App Permissions"** or **"Configure GitHub"**.
   - Allow Vercel access to your GitHub account (or at least the **visuxlize** org / your user).
   - Come back to **https://vercel.com/new** and refresh.
4. Find **"Headz-Aint-Ready"** in the list (under visuxlize).
5. Click **"Import"** next to it.

---

## Step 3: Configure the project (leave most as default)

On the import screen:

- **Project Name:** `headz-aint-ready` (or whatever you like).
- **Framework Preset:** should say **Next.js** (don’t change it).
- **Root Directory:** leave as **`.`** (blank or “./”).
- **Build Command:** leave default (**`npm run build`** or empty).
- **Output Directory:** leave default (Vercel sets this for Next.js).
- **Install Command:** leave default (**`npm install`** or empty).

Don’t click **Deploy** yet.

---

## Step 4: Add environment variables

Your app needs these so it can talk to Supabase and the database.

1. On the same page, find the section **"Environment Variables"** (often below the build settings).
2. For each row below, type the **Name** exactly, then paste the **Value** from your `.env.local`:

   | Name (copy exactly)              | Where to get the value                    |
   |----------------------------------|-------------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`       | In `.env.local`: line that starts with this |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | In `.env.local`: line that starts with this |
   | `DATABASE_URL`                   | In `.env.local`: line that starts with this |

3. For each variable, you can leave the **Environment** as **Production** (and add **Preview** later if you want).
4. Click **"Add"** or the plus so the variable is added. Do all three.

**Tip:** Open `.env.local` in your project and copy-paste each value. Don’t share `.env.local` or paste it in chat; only paste into Vercel’s form.

---

## Step 5: Deploy

1. Click the big **"Deploy"** button.
2. Vercel will run `npm install` and `npm run build`. This can take 1–3 minutes.
3. If the build turns green (success), you’re done. If it’s red (failed), see **Troubleshooting** below.

---

## Step 6: Open your live site

1. When the deployment finishes, you’ll see **"Visit"** or a link like `https://headz-aint-ready-xxxx.vercel.app`.
2. Click it. That’s your live site.
3. You can change the domain later under **Project → Settings → Domains**.

---

## Troubleshooting

**“I don’t see Headz-Aint-Ready in the list”**  
- Make sure you’re logged in with the GitHub account that owns **visuxlize/Headz-Aint-Ready**.  
- Use **“Adjust GitHub App Permissions”** and grant Vercel access to that repo (or all repos).

**“Build failed”**  
- Open the failed deployment in Vercel and read the **Build Logs**.  
- Often it’s missing env vars: double-check that all three variables are set and that there are no extra spaces in the names.

**“Site loads but login/booking doesn’t work”**  
- Confirm all three env vars are set in **Project → Settings → Environment Variables**.  
- Redeploy (Deployments → three dots on latest → Redeploy).

**“I already deployed without env vars”**  
- Go to your project on Vercel → **Settings** → **Environment Variables**.  
- Add the three variables, then go to **Deployments** → **Redeploy** the latest.

---

## Quick checklist

- [ ] Signed in to Vercel with GitHub  
- [ ] Imported **visuxlize/Headz-Aint-Ready**  
- [ ] Added `NEXT_PUBLIC_SUPABASE_URL`  
- [ ] Added `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- [ ] Added `DATABASE_URL`  
- [ ] Clicked **Deploy**  
- [ ] Build succeeded and you opened the **Visit** link  

That’s it. Your backend (Supabase + DB) will work as long as those three variables are set and the build succeeds.
