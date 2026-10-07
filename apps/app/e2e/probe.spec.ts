import { test, expect } from "@playwright/test";

test("probe navigation stack", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("load-demo").click();
  await expect(page.getByTestId("home")).toBeVisible();
  await page.getByTestId("start-sprint").click();
  await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8000 });
  await page.getByTestId("focus-complete").click();
  await expect(page.getByTestId("complete")).toBeVisible();
  await page.getByTestId("take-break").click();
  await page.waitForTimeout(800);
  console.log("HOME NODES:", await page.getByTestId("home").count(), "URL:", page.url());
  // Mission archive route
  await page.getByTestId("tab-missions").click();
  await page.locator('[data-testid^="mission-row-"]').first().click();
  await expect(page.getByTestId("mission")).toBeVisible();
  await page.getByTestId("mission-back").click();
  await page.waitForTimeout(500);
  console.log("MISSIONS NODES:", await page.getByTestId("missions").count(), "URL:", page.url());
  // New goal modal exit
  await page.getByTestId("missions-add").click();
  await page.getByTestId("goal-input").fill("Learn Spanish");
  await page.getByTestId("goal-continue").click();
  await page.getByTestId("timeframe-month").click();
  await page.getByTestId("goal-plan").click();
  await expect(page.getByTestId("plan-review")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("plan-create").click();
  await page.waitForTimeout(800);
  console.log("AFTER NEW → HOME NODES:", await page.getByTestId("home").count(), "MISSIONS NODES:", await page.getByTestId("missions").count(), "URL:", page.url());
});
