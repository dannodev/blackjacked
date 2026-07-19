"use client";

import { track } from "@vercel/analytics";

type ProductEvent =
  | "meal_logged"
  | "meal_deleted"
  | "workout_logged"
  | "workout_deleted"
  | "checkin_saved"
  | "coach_adjustment_accepted"
  | "account_exported";

export function trackProductEvent(event: ProductEvent) {
  // Deliberately never attach meal text, health measurements, photos, email,
  // user ids, or other sensitive properties to product analytics.
  track(event);
}
