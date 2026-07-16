# Project Audit & Improvements Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Systematically audit and improve code quality, test coverage, error handling, and production readiness

**Architecture:** Incremental fixes grouped by category — lint warnings, test coverage, error handling, security, performance, and accessibility

**Tech Stack:** Next.js 15.5, React 19, Vitest, ESLint, TypeScript, Supabase, Gemini AI

---

## Current State Summary

**Build:** ✓ Passes  
**Lint:** ✓ Passes (0 errors, 92 warnings)  
**Tests:** ✓ 23 tests pass (1 file: `src/lib/types.test.ts`)  
**Git:** 21 modified files (uncommitted)

**Key Issues Found:**
- 4 real lint warnings in `src/` (rest are generated PWA files in `public/`)
- Extremely low test coverage (only types tested)
- No error boundaries
- Silent error swallowing in AI calls
- `<img>` tags instead of `next/image`
- Missing useEffect dependencies
- No visible loading states for async operations

---

## Phase 1: Fix Lint Warnings (Quick Wins)

### Task 1: Replace `<img>` with `next/image` in checkin page

**Objective:** Fix performance warning and improve LCP

**Files:**
- Modify: `src/app/(app)/checkin/page.tsx:147`

**Step 1: Add next/image import**

```tsx
import Image from "next/image";
```

**Step 2: Replace img tag**

Find the `<img>` tag around line 147 and replace with:

```tsx
<Image
  src={/* current src */}
  alt={/* current alt */}
  width={/* appropriate width */}
  height={/* appropriate height */}
  className={/* current className */}
/>
```

**Step 3: Verify build**

Run: `npm run build`  
Expected: Warning gone for checkin page

**Step 4: Commit**

```bash
git add src/app/(app)/checkin/page.tsx
git commit -m "perf: use next/image in checkin page for better LCP"
```

---

### Task 2: Replace `<img>` with `next/image` in stats page

**Objective:** Fix performance warning and improve LCP

**Files:**
- Modify: `src/app/(app)/stats/page.tsx:219`

**Step 1: Add next/image import**

```tsx
import Image from "next/image";
```

**Step 2: Replace img tag**

Find the `<img>` tag around line 219 and replace with:

```tsx
<Image
  src={/* current src */}
  alt={/* current alt */}
  width={/* appropriate width */}
  height={/* appropriate height */}
  className={/* current className */}
/>
```

**Step 3: Verify build**

Run: `npm run build`  
Expected: Warning gone for stats page

**Step 4: Commit**

```bash
git add src/app/(app)/stats/page.tsx
git commit -m "perf: use next/image in stats page for better LCP"
```

---

### Task 3: Fix useEffect dependency warning in onboarding

**Objective:** Fix React hooks exhaustive-deps warning

**Files:**
- Modify: `src/app/onboarding/page.tsx:102`

**Step 1: Read the useEffect**

Examine the useEffect around line 102 to understand what `goalForm` is and whether it should be in deps.

**Step 2: Add dependency or restructure**

If `goalForm` is stable (memoized or from context), add it to deps:

```tsx
useEffect(() => {
  // existing logic
}, [/* existing deps */, goalForm]);
```

If `goalForm` changes frequently and would cause unwanted re-runs, restructure:

```tsx
const goalFormRef = useRef(goalForm);
useEffect(() => {
  goalFormRef.current = goalForm;
}, [goalForm]);

useEffect(() => {
  // use goalFormRef.current instead of goalForm
}, [/* other deps */]);
```

**Step 3: Verify build**

Run: `npm run build`  
Expected: Warning gone for onboarding page

**Step 4: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "fix: resolve useEffect dependency warning in onboarding"
```

---

### Task 4: Fix unused variable in ai.ts

**Objective:** Remove unused catch parameter

**Files:**
- Modify: `src/lib/ai.ts:191`

**Step 1: Replace catch(e) with catch()**

```ts
} catch (e) {
```

becomes:

```ts
} catch {
```

**Step 2: Verify build**

Run: `npm run build`  
Expected: Warning gone for ai.ts

**Step 3: Commit**

```bash
git add src/lib/ai.ts
git commit -m "fix: remove unused catch parameter in ai.ts"
```

---

## Phase 2: Improve Error Handling

### Task 5: Add error boundaries for route segments

**Objective:** Prevent full-page crashes when components fail

**Files:**
- Create: `src/app/(app)/error.tsx`
- Create: `src/app/(auth)/error.tsx`
- Create: `src/app/onboarding/error.tsx`

**Step 1: Create app error boundary**

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

**Step 2: Copy to other route groups**

Duplicate for `(auth)` and `onboarding` with appropriate messaging.

**Step 3: Test**

Manually throw an error in a component to verify boundary catches it.

**Step 4: Commit**

```bash
git add src/app/*/error.tsx
git commit -m "feat: add error boundaries for route segments"
```

---

### Task 6: Improve error handling in AI functions

**Objective:** Surface errors instead of silently swallowing them

**Files:**
- Modify: `src/lib/ai.ts`

**Step 1: Read current error handling**

Examine all catch blocks (lines 90, 134, 164, 191) to understand current behavior.

**Step 2: Add toast notifications or error returns**

For user-facing functions, return errors or show toasts:

```ts
import { toast } from "sonner";

try {
  // AI call
} catch (error) {
  console.error("AI analysis failed:", error);
  toast.error("AI analysis failed. Please try again.");
  throw error; // or return null with error state
}
```

**Step 3: Add loading states**

Ensure callers show loading indicators during AI operations.

**Step 4: Test**

Simulate AI failures (invalid API key, network error) and verify user feedback.

**Step 5: Commit**

```bash
git add src/lib/ai.ts
git commit -m "fix: improve error handling in AI functions with user feedback"
```

---

## Phase 3: Add Test Coverage

### Task 7: Add tests for auth utilities

**Objective:** Test authentication logic (mock and Supabase paths)

**Files:**
- Create: `src/lib/auth.test.ts`

**Step 1: Test mock auth functions**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { fakeHash, readUsers } from "./auth";

describe("fakeHash", () => {
  it("encodes strings consistently", () => {
    expect(fakeHash("password")).toBe(fakeHash("password"));
    expect(fakeHash("password")).not.toBe(fakeHash("different"));
  });
});

describe("readUsers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no users stored", () => {
    expect(readUsers()).toEqual([]);
  });

  it("parses stored users", () => {
    const users = [{ id: "1", email: "test@test.com", name: "Test", createdAt: "", passwordHash: "" }];
    localStorage.setItem("blackjacked.mock-users", JSON.stringify(users));
    expect(readUsers()).toEqual(users);
  });

  it("returns empty array on invalid JSON", () => {
    localStorage.setItem("blackjacked.mock-users", "invalid");
    expect(readUsers()).toEqual([]);
  });
});
```

**Step 2: Run tests**

Run: `npm run test`  
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/auth.test.ts
git commit -m "test: add auth utility tests"
```

---

### Task 8: Add tests for store actions

**Objective:** Test Zustand store mutations

**Files:**
- Create: `src/lib/store.test.ts`

**Step 1: Test key store actions**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";

describe("useStore", () => {
  beforeEach(() => {
    useStore.setState({ /* reset state */ });
  });

  it("bumps AI tokens", () => {
    const initial = useStore.getState().aiTokensUsed;
    useStore.getState().bumpAiTokens(100);
    expect(useStore.getState().aiTokensUsed).toBe(initial + 100);
  });

  // Add more tests for other actions
});
```

**Step 2: Run tests**

Run: `npm run test`  
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/store.test.ts
git commit -m "test: add store action tests"
```

---

### Task 9: Add tests for utility functions

**Objective:** Test shared utilities like `cn`, formatters, etc.

**Files:**
- Create: `src/lib/utils.test.ts`

**Step 1: Test cn function**

```ts
import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("merges Tailwind classes correctly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });
});
```

**Step 2: Run tests**

Run: `npm run test`  
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/utils.test.ts
git commit -m "test: add utility function tests"
```

---

## Phase 4: Security & Data Validation

### Task 10: Add input validation to auth forms

**Objective:** Validate email/password before submission

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`

**Step 1: Add Zod schemas**

```ts
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

**Step 2: Integrate with react-hook-form**

Use `@hookform/resolvers/zod` for validation.

**Step 3: Show validation errors**

Display error messages under each field.

**Step 4: Test**

Try invalid inputs and verify error messages appear.

**Step 5: Commit**

```bash
git add src/app/(auth)/*/page.tsx
git commit -m "feat: add input validation to auth forms with Zod"
```

---

### Task 11: Sanitize user-generated content

**Objective:** Prevent XSS when displaying user input

**Files:**
- Audit: All places where user input is displayed
- Potentially modify: Components rendering user data

**Step 1: Identify risk areas**

Search for places where user input (food logs, exercise notes, etc.) is rendered.

**Step 2: Use React's built-in escaping**

Ensure all user content is rendered via JSX text nodes (React auto-escapes).

**Step 3: Avoid dangerouslySetInnerHTML**

If any `dangerouslySetInnerHTML` exists, sanitize with DOMPurify or remove.

**Step 4: Commit**

```bash
git add -A
git commit -m "security: ensure user content is properly escaped"
```

---

## Phase 5: Performance & Accessibility

### Task 12: Add loading states for async operations

**Objective:** Improve UX during data fetching and mutations

**Files:**
- Modify: Components with async operations (AI food log, menu generation, etc.)

**Step 1: Identify async operations**

Find all `async` functions and API calls.

**Step 2: Add loading indicators**

```tsx
const [isLoading, setIsLoading] = useState(false);

async function handleSubmit() {
  setIsLoading(true);
  try {
    await asyncOperation();
  } finally {
    setIsLoading(false);
  }
}

return (
  <Button disabled={isLoading}>
    {isLoading ? "Loading..." : "Submit"}
  </Button>
);
```

**Step 3: Test**

Verify loading states appear during operations.

**Step 4: Commit**

```bash
git add -A
git commit -m "ux: add loading states for async operations"
```

---

### Task 13: Add ARIA labels and keyboard navigation

**Objective:** Improve accessibility for screen readers and keyboard users

**Files:**
- Audit: All interactive components
- Modify: Components missing ARIA attributes

**Step 1: Audit with axe or Lighthouse**

Run accessibility audit in browser DevTools.

**Step 2: Add missing ARIA labels**

```tsx
<button aria-label="Close dialog">
  <X />
</button>

<nav aria-label="Main navigation">
  {/* nav items */}
</nav>
```

**Step 3: Ensure keyboard navigation**

Test Tab/Shift+Tab navigation through all interactive elements.

**Step 4: Commit**

```bash
git add -A
git commit -m "a11y: add ARIA labels and improve keyboard navigation"
```

---

## Phase 6: Code Quality & Documentation

### Task 14: Extract magic numbers and strings to constants

**Objective:** Improve maintainability by centralizing configuration

**Files:**
- Create: `src/lib/constants.ts`
- Modify: Files with hardcoded values

**Step 1: Identify magic values**

Search for repeated numbers (calorie limits, token caps, etc.).

**Step 2: Create constants file**

```ts
export const APP_CONFIG = {
  AI: {
    FREE_TIER_DAILY_CAP: 1500,
    MODEL: "gemini-2.0-flash",
  },
  NUTRITION: {
    DEFAULT_CALORIE_GOAL: 2000,
    PROTEIN_PER_KG: 1.6,
  },
  UI: {
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 200,
  },
} as const;
```

**Step 3: Replace hardcoded values**

Update all references to use constants.

**Step 4: Commit**

```bash
git add src/lib/constants.ts
git add -u
git commit -m "refactor: extract magic values to constants"
```

---

### Task 15: Add JSDoc comments to public APIs

**Objective:** Document function signatures and behavior

**Files:**
- Modify: `src/lib/ai.ts`, `src/lib/auth.tsx`, `src/lib/store.ts`

**Step 1: Add JSDoc to exported functions**

```ts
/**
 * Analyzes food description using AI and returns nutritional breakdown
 * @param description - Natural language food description
 * @returns Nutritional analysis or null if AI is unavailable
 * @throws Error if AI request fails
 */
export async function analyzeFood(description: string): Promise<AIFoodResult | null> {
  // implementation
}
```

**Step 2: Commit**

```bash
git add -u
git commit -m "docs: add JSDoc comments to public APIs"
```

---

## Phase 7: Final Verification

### Task 16: Run full test suite and lint

**Objective:** Ensure all changes pass CI checks

**Step 1: Run tests**

```bash
npm run test
```

Expected: All tests pass

**Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors, minimal warnings (only PWA files in public/)

**Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit final state**

```bash
git add -A
git commit -m "chore: final verification after audit improvements"
```

---

## Summary

**Total Tasks:** 16  
**Estimated Time:** 3-4 hours  
**Priority Order:**
1. **High:** Error boundaries (Task 5), error handling (Task 6), auth validation (Task 10)
2. **Medium:** Test coverage (Tasks 7-9), lint fixes (Tasks 1-4)
3. **Low:** Performance (Tasks 12-13), documentation (Tasks 14-15)

**Success Criteria:**
- ✓ 0 lint errors in src/
- ✓ 50+ tests passing
- ✓ Error boundaries catch crashes
- ✓ All async operations show loading states
- ✓ Auth forms validate input
- ✓ Build succeeds cleanly

---

## Workflow

After this plan is saved, you can tell me:

**"Execute the plan"** — I'll work through tasks sequentially using subagent-driven-development with two-stage review (spec compliance + code quality).

**"Execute tasks 1-4"** — I'll do just the lint fixes.

**"Execute phase 2"** — I'll focus on error handling improvements.

You don't need to switch modes — just tell me to execute and I'll get to work.