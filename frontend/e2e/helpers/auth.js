// frontend/e2e/helpers/auth.js
import { expect } from "@playwright/test";

export const TEST_USER = {
  username: "admin",
  password: "NewAdmin@123",
};

export async function login(page) {
  await page.goto("/login");

  const usernameInput = page.locator('input[name="username"]').first();
  const passwordInput = page.locator('input[name="password"]').first();
  const loginButton = page.locator('button[type="submit"]').first();

  await expect(usernameInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(loginButton).toBeVisible();

  await usernameInput.fill(TEST_USER.username);
  await passwordInput.fill(TEST_USER.password);

  await loginButton.click();

  try {
    await page.waitForURL(/\/app\/overview|\/app/i, {
      timeout: 15000,
    });
  } catch {
    const possibleError = await page
      .locator('[role="alert"], .alert, .alert-error, .field-error')
      .first()
      .textContent()
      .catch(() => "");

    throw new Error(
      `Login failed. Still on ${page.url()}. ${
        possibleError ? `Page error: ${possibleError}` : "Check backend/login API."
      }`
    );
  }
}