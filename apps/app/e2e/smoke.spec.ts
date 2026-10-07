import { test, expect } from "@playwright/test";

test("app boots", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sprint")).toBeVisible();
  await page.screenshot({ path: "test-results/smoke.png" });
});
