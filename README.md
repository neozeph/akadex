# Acadex

Acadex is a cozy, student-focused productivity app built with Next.js, Supabase, and Tailwind CSS. It helps students manage semesters, subjects, study tasks, and focus sessions in one calm workspace.

## What it does

- Manage academic semesters and subjects
- Track grades and compute GPA-style summaries
- Organize tasks with priorities and tags
- Run Pomodoro-style focus sessions
- Sign in and manage personal data securely with Supabase Auth

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres
- shadcn-style UI primitives

## Current deployment status

The app builds successfully locally and is in a good state for deployment, provided the required environment variables and Supabase database setup are configured.

Verified locally:

- `npm run lint` ✅
- `npm run build` ✅

## Prerequisites

- Node.js 20+
- npm
- A Supabase project

## Getting started

1. Install dependencies

```bash
npm install
```

2. Create your environment file

```bash
cp .env.example .env.local
```

3. Add your Supabase values to `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

4. Apply the database schema

Open the SQL file at [supabase/schema.sql](supabase/schema.sql) in your Supabase SQL editor and run it once.

5. Start the app

```bash
npm run dev
```

Open http://localhost:3000 to view it.

## Deployment checklist

### Vercel

1. Import the repository into Vercel.
2. Set the same environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy the project.

### Supabase auth

Make sure your Supabase project has the correct redirect URLs for your production domain, including:

- `https://your-domain.com/login`
- `https://your-domain.com/auth/callback`

If you use email auth, confirm your site URL and redirect settings in Supabase.

## Project structure

- [src/app](src/app) — app routes and pages
- [src/components](src/components) — reusable UI and layout components
- [src/lib](src/lib) — Supabase, utilities, and shared logic
- [supabase/schema.sql](supabase/schema.sql) — database schema for Supabase

## Notes

- The app currently uses Supabase as its primary backend and persistence layer.
- The build is healthy, but runtime behavior depends on your Supabase project being configured correctly.
- Some minor lint warnings remain in a few landing-page icon imports, but they do not block build or deployment.
