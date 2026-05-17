// frontend/e2e/demo-flow.spec.js
import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

const mainPages = [
  {
    name: "dashboard",
    url: "/app/overview",
    expectedText: /dashboard|overview|total|revenue|sales|الصفحة|لوحة/i,
  },
  {
    name: "products",
    url: "/app/products",
    expectedText: /products|product|category|stock|المنتجات|منتج/i,
  },
  {
    name: "forecasting",
    url: "/app/forecasting",
    expectedText: /forecast|forecasting|demand|prediction|التنبؤ|توقع/i,
  },
  {
    name: "campaigns",
    url: "/app/campaigns",
    expectedText: /campaign|campaigns|marketing|حملة|الحملات/i,
  },
  {
    name: "reports",
    url: "/app/reports",
    expectedText: /reports|report|summary|analytics|التقارير|تقرير/i,
  },
];

async function openPageAndCheck(page, pageInfo) {
  await page.goto(pageInfo.url);

  await expect(page).toHaveURL(new RegExp(pageInfo.url, "i"));

  await page.waitForLoadState("domcontentloaded");

  await expect(page.locator("body")).toBeVisible();

  await expect(page.locator("body")).not.toContainText(
    /something went wrong|cannot read properties|undefined is not a function/i
  );

  await expect(page.locator("body")).toContainText(pageInfo.expectedText, {
    timeout: 10000,
  });

  // Only for headed mode, so you can see the page before moving on.
  await page.waitForTimeout(1200);
}

test("admin can login and open the main demo pages", async ({ page }) => {
  await login(page);

  for (const pageInfo of mainPages) {
    await openPageAndCheck(page, pageInfo);
  }
});