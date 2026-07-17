# BlackJacked

Production fitness tracker for meals, workouts, progress check-ins, goals, and squads.

## Production Environment

Set these in Vercel Project Settings -> Environment Variables.

Public browser variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Server-only variables:

```bash
GEMINI_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Never add server-only values to `NEXT_PUBLIC_*`, and never commit `.env.local`.

## Supabase

Before deploying a new database change:

```bash
supabase migration list --linked
supabase db advisors --linked --fail-on none
```

Expected known warning on the free plan:

```text
auth_leaked_password_protection
```

All public app tables should have RLS enabled and forced. Browser roles should not have `TRUNCATE`, `TRIGGER`, or `REFERENCES` table privileges.

## Local Verification

Run this before pushing a production deployment:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
```

## Vercel Deploy

1. Import the GitHub repository into Vercel.
2. Add all production environment variables above.
3. Deploy from `main`.
4. After deploy, test sign-up, sign-in, AI macros, menu import, avatar upload, progress photo upload, and squad join.
