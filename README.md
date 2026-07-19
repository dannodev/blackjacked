# BlackJacked

<img src="public/blackjacked-logo.png" alt="BlackJacked" width="180" />

**Fitness without the guesswork.** BlackJacked brings nutrition, training, progress, and accountability into one focused experience that works across devices.

## Build consistency that lasts

BlackJacked is designed around the habits that actually move fitness forward. Instead of juggling a calorie tracker, workout log, progress gallery, and group chat, users get one private home for their entire journey.

- **Know what to eat** — Track meals and macros, plan around personal calorie goals, and use AI-assisted nutrition tools when speed matters.
- **Train with purpose** — Track loads, reps, effort, weekly volume, and progressive-overload guidance alongside nutrition.
- **See real progress** — Follow weight trends, measurements, check-in photos, streaks, and goal milestones over time.
- **Stay accountable** — Create a squad, compare shared activity, celebrate streaks, and keep motivation alive through squad chat.
- **Keep personal data personal** — Squads show only intentionally shared activity; sensitive body information remains private.
- **Use it anywhere** — Cloud-backed profiles, logs, and photos keep the experience consistent across phone and desktop.

## One daily loop

BlackJacked turns a complicated fitness routine into a simple rhythm: set a goal, follow the day’s nutrition, record training, complete a check-in, and build momentum with a squad. The dashboard brings those signals together so users can understand what needs attention without digging through reports.

## Product highlights

- Personalized calorie and macro targets
- Adaptive Weekly Coach with small, explainable plan adjustments and up to five realtime-synced personal priorities
- Recent meals, favorites, recipes, barcode lookup, menu planning, and optional AI photo logging
- Workout loads, effort, previous performance, weekly volume, and progressive-overload suggestions
- Private weight, measurement, and photo check-ins with expiring image links
- Goal progress and habit streaks
- Private squads, presence, supportive chat, activity leaderboards, reporting controls, and new-message push notifications
- Offline-safe meal and training changes with a durable retry queue
- Account data export and permanent deletion
- English and Spanish experiences
- Installable, mobile-first progressive web app

## Technology

BlackJacked is built with Next.js, React, TypeScript, Tailwind CSS, Supabase, Cloudinary, Google Gemini, and Open Food Facts. Supabase powers authentication, synchronized app data, and private progress-photo storage. Cloudinary manages public profile avatars.

## Development

Create `.env.local` from `.env.example`, provide the required service credentials, then run:

```bash
npm install
npm run dev
```

Before submitting changes, verify the project with:

```bash
npm run lint
npm test
npm run build
```

Server credentials must remain server-only and must never use the `NEXT_PUBLIC_` prefix.

Push reminders additionally require a VAPID key pair, `CRON_SECRET`, and the server-only Supabase service-role key. The committed Vercel cron calls the protected sender hourly; each subscription is sent at most once on its local calendar day.
