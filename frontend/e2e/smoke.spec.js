// frontend/e2e/smoke.spec.js
import { test, expect } from "@playwright/test";

test("app opens the login page", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/login/i);

  const passwordInput = page.locator('input[type="password"]').first();
  await expect(passwordInput).toBeVisible();
});