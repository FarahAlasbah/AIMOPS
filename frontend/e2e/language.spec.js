// frontend/e2e/language.spec.js
import { test, expect } from "@playwright/test";

test("language switch changes page direction", async ({ page }) => {
  await page.goto("/login");

  const html = page.locator("html");
  const beforeDir = await html.getAttribute("dir");

  const languageButton = page
    .locator(
      'button:has-text("AR"), button:has-text("EN"), button:has-text("عربي"), button:has-text("English"), button:has-text("العربية")'
    )
    .first();

  await expect(languageButton).toBeVisible();

  await languageButton.click();

  if (beforeDir === "rtl") {
    await expect(html).toHaveAttribute("dir", "ltr");
  } else {
    await expect(html).toHaveAttribute("dir", "rtl");
  }
});