# Deployment – Netlify

This project is deployed on **Netlify** (Next.js runtime). The backend (API routes, database, booking) is configured to run there.

**→ Step-by-step instructions: [DEPLOY_NETLIFY.md](./DEPLOY_NETLIFY.md)**

You need:

- Repo on GitHub (e.g. `visuxlize/Headz-Aint-Ready`)
- Netlify account (GitHub login)
- Environment variables in Netlify: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`

Build is driven by `netlify.toml` in the repo.
