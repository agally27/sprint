import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadDemo } from "./helpers";

const IGNORE = new Set<string>([]);

async function scan(page: import("@playwright/test").Page, name: string) {
  // Let entering animations finish so colours are measured at full opacity.
  await page.waitForTimeout(name.endsWith("complete") ? 1800 : 700);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => (v.impact === "serious" || v.impact === "critical") && !IGNORE.has(v.id));
  if (serious.length) {
    console.log(
      `A11Y ${name}:`,
      JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ html: n.html.replace(/class="[^"]*"/g, "").slice(0, 90), data: n.any[0]?.data })) }))),
    );
  }
  expect(serious, `${name} has serious accessibility violations`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test(`accessibility (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await scan(page, `${scheme}-onboarding`);
    await loadDemo(page);
    await scan(page, `${scheme}-home`);
    await page.getByTestId("start-sprint").click();
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8_000 });
    await scan(page, `${scheme}-focus`);
    await page.getByTestId("focus-complete").click();
    await expect(page.getByTestId("complete")).toBeVisible();
    await scan(page, `${scheme}-complete`);
    await page.getByTestId("take-break").click();
    await page.getByTestId("tab-missions").click();
    await scan(page, `${scheme}-missions`);
    await page.locator('[data-testid^="mission-row-"]').first().click();
    await expect(page.getByTestId("mission")).toBeVisible();
    await scan(page, `${scheme}-mission`);
    await page.goto("/progress");
    await scan(page, `${scheme}-progress`);
    await page.goto("/settings");
    await scan(page, `${scheme}-settings`);
  });
}
