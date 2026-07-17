import { z } from "zod";

export const passwordRules =
  "Password must be at least 8 characters and include 1 uppercase letter and 1 number.";

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[A-Z]/, "Add at least 1 uppercase letter.")
  .regex(/[0-9]/, "Add at least 1 number.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    "Use a valid email address.",
  );

export function authErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect. Check both and try again.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Check your email for the verification code before logging in.";
  }

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "That email already has an account. Try logging in instead.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("security purposes") ||
    normalized.includes("too many")
  ) {
    return "Too many attempts right now. Wait a few minutes and try again.";
  }

  if (
    normalized.includes("confirmation email") ||
    normalized.includes("verification email") ||
    normalized.includes("email provider") ||
    normalized.includes("smtp") ||
    normalized.includes("send")
  ) {
    return "We could not send the verification email right now. Try again in a few minutes.";
  }

  if (
    normalized.includes("invalid email") ||
    normalized.includes("email address is invalid") ||
    normalized.includes("invalid format")
  ) {
    return "This email looks valid, but the auth provider rejected it. Check for typos or try another email.";
  }

  if (normalized.includes("password")) {
    return passwordRules;
  }

  if (normalized.includes("email")) {
    return message || fallback;
  }

  return message || fallback;
}
