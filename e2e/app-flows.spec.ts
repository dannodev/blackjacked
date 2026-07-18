import { expect, test } from "@playwright/test";

test("sign-in form validates email and toggles password visibility", async ({ page }) => {
  await page.goto("/login?__e2eAuth=1&__e2eNoAuth=1");
  await expect(page.getByText("Wilis chaparro me la pelas.")).toBeVisible();

  await page.getByLabel("Email").fill("not-an-email");
  await page.locator("#password").fill("weak");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Use a valid email address.")).toBeVisible();
  await expect(page.getByText(/at least 8 characters/i)).toBeVisible();

  await expect(page.locator("#password")).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
});

test("AI macros analyzes a meal and logs it", async ({ page }) => {
  await page.route("**/api/ai", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model: "e2e-gemini",
        tokens: 42,
        data: {
          ingredients: [
            {
              name: "Chicken tacos",
              quantity: 1,
              unit: "plate",
              kcal: 420,
              protein_g: 35,
              fat_g: 12,
              carb_g: 42,
            },
          ],
          total_kcal: 420,
          total_protein_g: 35,
          total_fat_g: 12,
          total_carb_g: 42,
          summary: "Chicken taco estimate",
        },
      }),
    });
  });

  await page.goto("/log?type=ai&__e2eAuth=1");
  await expect(page.getByRole("tab", { name: "AI Macros" })).toBeVisible();
  await page.getByPlaceholder(/2 eggs/i).fill("3 chicken tacos");
  await page.getByRole("button", { name: /Analyze macros/i }).click();

  await expect(page.getByText("Confirm before saving")).toBeVisible();
  await expect(page.getByText(/Gemini estimate/)).toBeVisible();
  await page.getByRole("button", { name: /Confirm & log/i }).click();
  await expect(page.getByText(/Lunch logged/i)).toBeVisible();
});

test("menu import reviews and saves extracted meals", async ({ page }) => {
  await page.route("**/api/menu-import", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        model: "e2e-gemini",
        data: {
          meals: [
            {
              name: "Turkey bowl",
              description: "Turkey, rice, beans, salsa",
              type: "lunch",
              kcal: 510,
              protein_g: 42,
              carb_g: 58,
              fat_g: 12,
              meal_slot: "Lunch",
              emoji: "🍚",
            },
          ],
        },
      }),
    });
  });

  await page.goto("/menu?__e2eAuth=1");
  await page.setInputFiles("#menu-import-file", {
    name: "menu.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Turkey bowl with rice and beans"),
  });
  await expect(page.getByText("menu.txt")).toBeVisible();
  await page.getByRole("button", { name: /Extract meals/i }).click();

  await expect(page.getByText("Review imported meals")).toBeVisible();
  await expect(page.getByText("Turkey bowl")).toBeVisible();
  await page.getByRole("button", { name: "Save all" }).click();
  await expect(page.getByText("Imported meals saved to Your Menu")).toBeVisible();
});

test("Spanish toggle changes the target label and localizes the default menu", async ({ page }) => {
  await page.goto("/menu?__e2eAuth=1");

  const languageToggle = page.locator("button[data-no-translate]");
  await expect(languageToggle).toHaveText("ES");
  await languageToggle.click();

  await expect(languageToggle).toHaveText("EN");
  await expect(page.getByRole("heading", { name: "Tu menú" })).toBeVisible();
  await expect(page.getByText("Avena con manzana y canela")).toBeVisible();
  await expect(page.getByText("Pollo al ajo y limón")).toBeVisible();
});

test("profile avatar uploads through the cloud route and can be removed", async ({ page }) => {
  await page.route("**/api/profile-avatar", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ avatar_url: null, avatar_public_id: null }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        avatar_url: "https://res.cloudinary.com/demo/image/upload/avatar.jpg",
        avatar_public_id: "blackjacked/avatars/e2e/avatar",
      }),
    });
  });

  await page.goto("/profile?__e2eAuth=1");
  await page.setInputFiles("#profile-picture", {
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l0YQWQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });

  await expect(page.getByText("Profile picture updated")).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove profile picture/i })).toBeVisible();
  await page.getByRole("button", { name: /Remove profile picture/i }).click();
  await expect(page.getByText("Profile picture removed")).toBeVisible();
});

test("squad join flow accepts an invite code and shows squad activity", async ({ page }) => {
  await page.goto("/squad?__e2eAuth=1");
  await page.getByLabel("Squad code").fill("BLACK1");
  await page.getByRole("button", { name: "Join squad" }).click();

  await expect(page.getByText("Joined squad")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Test Squad" })).toBeVisible();
  await expect(page.getByText("BLACK1")).toBeVisible();
  await expect(page.getByText("No height or weight is shared.")).toBeVisible();
});
