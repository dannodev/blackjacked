# BlackJacked

<img src="public/blackjacked-logo.png" alt="BlackJacked" width="180" />

**Fitness without the guesswork.** BlackJacked brings nutrition, training, progress, and accountability into one focused experience that works across devices.

## Build consistency that lasts

BlackJacked is designed around the habits that actually move fitness forward. Instead of juggling a calorie tracker, workout log, progress gallery, and group chat, users get one private home for their entire journey.

- **Know what to eat** — Track meals and macros, plan around personal calorie goals, and use AI-assisted nutrition tools when speed matters.
- **Train with purpose** — Log workouts and see daily activity alongside nutrition instead of treating them as separate goals.
- **See real progress** — Follow weight trends, measurements, check-in photos, streaks, and goal milestones over time.
- **Stay accountable** — Create a squad, compare shared activity, celebrate streaks, and keep motivation alive through squad chat.
- **Keep personal data personal** — Squads show only intentionally shared activity; sensitive body information remains private.
- **Use it anywhere** — Cloud-backed profiles, logs, and photos keep the experience consistent across phone and desktop.

## One daily loop

BlackJacked turns a complicated fitness routine into a simple rhythm: set a goal, follow the day’s nutrition, record training, complete a check-in, and build momentum with a squad. The dashboard brings those signals together so users can understand what needs attention without digging through reports.

## Product highlights

- Personalized calorie and macro targets
- Meal logging and menu planning
- Workout and calorie-burn tracking
- Weight, measurement, and photo check-ins
- Goal progress and habit streaks
- Private squad challenges, presence, leaderboards, and chat
- English and Spanish experiences
- Installable, mobile-first progressive web app

## Technology

BlackJacked is built with Next.js, React, TypeScript, Tailwind CSS, Supabase, and Cloudinary. Supabase powers authentication and synchronized app data, while Cloudinary securely manages optimized profile and progress imagery.

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
