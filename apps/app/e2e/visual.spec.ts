import { test, expect, type Page } from "@playwright/test";

const OUT = process.env.SHOTS_DIR ?? "test-results/shots";

// Visual walkthrough: run with SHOTS=1 to capture screenshots for review.
test.skip(!process.env.SHOTS, "set SHOTS=1 to capture screenshots");

async function shot(page: Page, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

for (const scheme of ["light", "dark"] as const) {
  test(`walkthrough ${scheme}`, async ({ page }, testInfo) => {
    const tag = `${testInfo.project.name}-${scheme}`;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await page.getByTestId("load-demo").click();
    await expect(page.getByTestId("home")).toBeVisible();
    await shot(page, `${tag}-home`);

    // Start the recommended sprint → countdown → focus.
    await page.getByTestId("start-sprint").click();
    await expect(page.getByTestId("countdown")).toBeVisible();
    await shot(page, `${tag}-countdown`);
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(2500);
    await shot(page, `${tag}-focus`);
    await page.getByTestId("focus-toggle").click();
    await shot(page, `${tag}-focus-paused`);
    await page.getByTestId("focus-toggle").click();
    await page.getByTestId("focus-complete").click();
    await expect(page.getByTestId("complete")).toBeVisible();
    await page.waitForTimeout(1500);
    await shot(page, `${tag}-complete`);

    await page.getByTestId("take-break").click();
    await expect(page.getByTestId("home")).toBeVisible();

    await page.getByTestId("open-next").click();
    await expect(page.getByTestId("next")).toBeVisible();
    await page.getByTestId("time-15").click();
    await shot(page, `${tag}-next`);
    await page.getByTestId("next-close").click();

    await page.getByTestId("tab-missions").click();
    await expect(page.getByTestId("missions")).toBeVisible();
    await shot(page, `${tag}-missions`);
    await page.locator('[data-testid^="mission-row-"]').first().click();
    await expect(page.getByTestId("mission")).toBeVisible();
    await shot(page, `${tag}-mission`);
    await page.getByTestId("mission-back").click();

    await page.getByTestId("tab-progress").click();
    await expect(page.getByTestId("progress")).toBeVisible();
    await shot(page, `${tag}-progress`);
    await page.getByTestId("open-review").click();
    await expect(page.getByTestId("review")).toBeVisible();
    await shot(page, `${tag}-review`);
    await page.goBack();

    await page.goto("/settings");
    await expect(page.getByTestId("settings")).toBeVisible();
    await shot(page, `${tag}-settings`);
    console.log(`ERRORS(${tag}):`, JSON.stringify(errors.slice(0, 8)));
  });
}
