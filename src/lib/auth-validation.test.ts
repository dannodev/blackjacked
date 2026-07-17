import { describe, expect, it } from "vitest";
import { authErrorMessage, emailSchema } from "./auth-validation";

describe("emailSchema", () => {
  it("normalizes valid emails before auth calls", () => {
    expect(emailSchema.parse("  LookingShaarp@GMAIL.COM  ")).toBe(
      "lookingshaarp@gmail.com",
    );
  });
});

describe("authErrorMessage", () => {
  it("does not collapse every email error into a fake-email message", () => {
    expect(
      authErrorMessage(
        new Error("Error sending confirmation email"),
        "Sign up failed.",
      ),
    ).toBe(
      "We could not send the verification email right now. Try again in a few minutes.",
    );
  });

  it("shows a clearer provider rejection message for invalid email errors", () => {
    expect(
      authErrorMessage(
        new Error("Email address is invalid"),
        "Sign up failed.",
      ),
    ).toBe(
      "This email looks valid, but the auth provider rejected it. Check for typos or try another email.",
    );
  });
});
