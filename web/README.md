# My Records — React + Supabase

A React (Vite) single-page app for a personal record collection and wishlist,
backed by Supabase (Postgres + Auth). This is the migration of the original
Flask app to a static frontend deployable on Vercel — no server to run.

- **Data**: your existing Supabase tables `albums` and `wishlist` (unchanged).
- **Auth**: Supabase email/password. Private collection — login required.
- **Metadata**: Apple Music (iTunes Search API, via JSONP) for album search,
  MusicBrainz + Cover Art Archive for cover art. Both called from the browser.

## Local development

```bash
cd web
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev
```

`.env.local` needs:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

Both come from the Supabase dashboard → Project Settings → API. The anon key is
safe to expose in the browser **as long as RLS is enabled** (see below).

## One-time Supabase setup

The original Flask app connected with the Postgres password, so Row Level
Security was never needed. This browser app uses the public anon key instead, so
you must lock the tables down first. Do these three things once:

### 1. Enable Row Level Security

Supabase dashboard → **SQL Editor** → paste the contents of
[`supabase/rls.sql`](./supabase/rls.sql) → **Run**. This blocks the anon key and
grants access only to logged-in users.

### 2. Turn off public sign-ups

Dashboard → **Authentication → Sign In / Providers → Email** (or
**Authentication → Settings**) → turn **off** "Allow new users to sign up".
This stops anyone else from creating an account.

### 3. Create your user

Dashboard → **Authentication → Users → Add user** → enter your email and a
password, and enable **Auto Confirm User** so no confirmation email is required.
That email/password is what you'll log in with.

> Verify: after step 1, reload the app while logged out — the collection should
> be empty/blocked. After logging in with your user, all albums appear.

## Deploy to Vercel

1. Push this repo to GitHub (the app lives in the `web/` subfolder).
2. Vercel → **New Project** → import the repo.
3. Set **Root Directory** to `web`.
4. Framework preset: **Vite** (auto-detected). Build: `npm run build`, output
   `dist`.
5. Add **Environment Variables** (same two as `.env.local`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.

`vercel.json` already rewrites all routes to `index.html` so client-side routes
like `/wishlist` work on refresh and direct navigation.

### Supabase redirect URLs

Dashboard → **Authentication → URL Configuration** → add your Vercel domain
(e.g. `https://your-app.vercel.app`) to **Site URL** / **Redirect URLs** so auth
works in production.

## Notes

- No serverless functions are used; everything runs client-side against Supabase
  and the public metadata APIs.
- The old Flask app remains in the repo root for reference and can be deleted
  once you're happy with this version.
