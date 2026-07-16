# RLS Audit — BlackJacked Schema

When migrating from mock auth (localStorage) to Supabase, apply these Row Level Security policies to every user-owned table. All policies enforce `user_id = auth.uid()`.

## Tables and Policies

### profiles
- **SELECT**: `id = auth.uid()`
- **INSERT**: `id = auth.uid()`
- **UPDATE**: `id = auth.uid()`
- **DELETE**: `id = auth.uid()`
- Note: `id` column references `auth.uid()` directly (no separate user_id).

### weight_logs
- **ALL**: `user_id = auth.uid()`

### meals
- **ALL**: `user_id = auth.uid()`
- Note: `meal_items` inherit RLS via FK on `meal_id` (cascade from meals).

### meal_items
- **ALL**: `EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_items.meal_id AND meals.user_id = auth.uid())`

### food_items
- **SELECT**: Public (read-only seed library) OR `source = 'seed'` OR `source = 'custom' AND user_id = auth.uid()`
- **INSERT**: `source = 'custom'` with `user_id = auth.uid()` check
- **UPDATE/DELETE**: `user_id = auth.uid()` (custom items only)

### recipes
- **ALL**: `user_id = auth.uid()`

### recipe_ingredients
- **ALL**: `EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_ingredients.recipe_id AND recipes.user_id = auth.uid())`

### weekly_menu
- **ALL**: `user_id = auth.uid()`

### exercises
- **SELECT**: Public (read-only seed library)
- No INSERT/UPDATE/DELETE (managed via admin only)

### exercise_logs
- **ALL**: `user_id = auth.uid()`

### daily_summary
- **ALL**: `user_id = auth.uid()`

### streaks
- **ALL**: `user_id = auth.uid()`

### notification_prefs
- **ALL**: `user_id = auth.uid()`

### ai_logs
- **ALL**: `user_id = auth.uid()`
- Note: Tracks tokens per user to warn before approaching the 1500/day free tier cap.

## Audit Checklist

- [ ] Every user-owned table has `user_id uuid references auth.users(id)` column
- [ ] `profiles` table uses `id` instead of `user_id` (direct FK to `auth.uid()`)
- [ ] `meal_items` has no direct `user_id` — uses FK through `meals`
- [ ] `recipe_ingredients` has no direct `user_id` — uses FK through `recipes`
- [ ] `food_items` is public for seed data, private for custom items
- [ ] `exercises` is public read-only
- [ ] No table has a policy allowing cross-user access
- [ ] Enable RLS on every table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Add `FORCE ROW LEVEL SECURITY` to prevent accidental bypass via table owner

## Migration Notes

Current state: mock auth using `localStorage` + `idb-keyval` for persistence.
When migrating to Supabase:
1. Create tables with the schema from the plan
2. Enable RLS on all tables
3. Apply policies listed above
4. Migrate localStorage data → Supabase rows (one-time import script)
5. Replace `src/lib/auth.tsx` with `@supabase/supabase-js` auth
6. Replace `src/lib/store.ts` Zustand store with Supabase queries + React Query
7. Keep the same type interfaces in `src/lib/types.ts` for consistency