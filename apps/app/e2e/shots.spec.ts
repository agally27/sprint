import { test, expect } from "@playwright/test";

const OUT = process.env.SHOTS_DIR ?? "test-results/shots";

test("onboarding and home", async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${tag}-01-onboarding.png`, fullPage: true });
  await page.getByTestId("goal-input").fill("I want to launch my website by Christmas");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-02-onboarding-typed.png`, fullPage: true });
  await page.getByTestId("goal-continue").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${tag}-03-planning.png`, fullPage: true });
  await expect(page.getByTestId("plan-review")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-04-review.png`, fullPage: true });
  await page.getByTestId("plan-create").click();
  await expect(page.getByTestId("home")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}-05-home.png`, fullPage: true });
  // Reload to check persistence.
  await page.reload();
  await expect(page.getByTestId("home")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}-06-home-reloaded.png`, fullPage: true });
  console.log("ERRORS:", JSON.stringify(errors.slice(0, 10)));
});

test("demo home", async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto("/");
  await page.getByTestId("load-demo").click();
  await expect(page.getByTestId("home")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${tag}-07-demo-home.png`, fullPage: true });
});
