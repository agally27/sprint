import { test, expect } from "@playwright/test";
import { loadDemo, mockNotifications, mockSpeech } from "./helpers";

test.describe("Journey 1: goal → plan → sprint → complete → reward → next", () => {
  test("runs the core loop from a blank slate", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByText("What do you want to achieve?")).toBeVisible();

    await page.getByTestId("goal-input").fill("I want to launch my website by Christmas");
    await expect(page.getByText(/By Christmas/)).toBeVisible();
    await page.getByTestId("goal-continue").click();

    // A deadline in the sentence skips the timeframe question.
    await expect(page.getByTestId("planning")).toBeVisible();
    await expect(page.getByTestId("plan-review")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Launch My Website")).toBeVisible();
    await expect(page.getByText(/I've broken this into/)).toBeVisible();
    await page.getByTestId("milestone-1").click();
    await page.getByTestId("plan-create").click();

    await expect(page.getByTestId("home")).toBeVisible();
    await expect(page.getByTestId("next-title")).toHaveText("Define the purpose of the site");
    await page.getByTestId("start-sprint").click();

    await expect(page.getByTestId("countdown")).toBeVisible();
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("focus-dial-time")).toHaveText(/1[45]:[0-5]\d/);
    await page.getByTestId("focus-toggle").click();
    await expect(page.getByTestId("focus-dial")).toContainText("Paused");
    await page.getByTestId("focus-toggle").click();
    await page.getByTestId("focus-complete").click();

    await expect(page.getByTestId("complete")).toBeVisible();
    await expect(page.getByTestId("complete-headline")).toContainText("Sprint complete");
    await expect(page.getByTestId("mission-progress")).toContainText("1 of");
    await expect(page.getByTestId("achievements-unlocked")).toContainText("First sprint");
    await expect(page.getByTestId("complete-next")).toContainText("Describe who it's for");

    await page.getByTestId("complete-next").getByTestId("start-sprint").click();
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("focus-title")).toHaveText("Describe who it's for");
    expect(errors).toEqual([]);
  });

  test("persists across reloads and resumes an active sprint", async ({ page }) => {
    await loadDemo(page);
    await page.getByTestId("start-sprint").click();
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8_000 });
    await page.reload();
    // The root redirect lands back in focus mode while a sprint runs.
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("focus-close").click();
    await page.getByTestId("confirm-ok").click();
    await expect(page.getByTestId("home")).toBeVisible();
  });
});

test.describe("Journey 2: long-term goal, missed sprints, reschedule", () => {
  test("moves missed sprints forward without blame", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("goal-input").fill("Write my book");
    await page.getByTestId("goal-continue").click();
    await page.getByTestId("timeframe-week").click();
    await page.getByTestId("goal-plan").click();
    await expect(page.getByTestId("plan-review")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("plan-create").click();
    await expect(page.getByTestId("home")).toBeVisible();

    // Travel three days into the future and come back to the app.
    const raw = await page.evaluate(() => localStorage.getItem("sprint.state.v1"));
    expect(raw).toBeTruthy();
    await page.clock.install({ time: Date.now() + 3 * 86_400_000 });
    await page.reload();
    await expect(page.getByTestId("home")).toBeVisible();
    await expect(page.getByTestId("adjustment-notice")).toContainText("Life got in the way");
    await expect(page.getByTestId("adjustment-notice")).not.toContainText(/fail|behind/i);
    await page.getByTestId("adjustment-notice").getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByTestId("adjustment-notice")).toHaveCount(0);
    await expect(page.getByTestId("start-sprint")).toBeVisible();
  });

  test("splits, skips and reschedules sprints from the mission screen", async ({ page }) => {
    await loadDemo(page);
    await page.getByTestId("tab-missions").click();
    await page.locator('[data-testid^="mission-row-"]').first().click();
    await expect(page.getByTestId("mission")).toBeVisible();
    const rows = page.locator('[data-testid^="sprint-row-"]');
    const before = await rows.count();
    // Open a planned sprint long enough to split (20 minutes or more).
    await page.getByRole("button", { name: /, [2-9]\d minutes, planned$/ }).first().click();
    await expect(page.getByTestId("sprint-sheet")).toBeVisible();
    await page.getByTestId("sprint-split").click();
    await expect(rows).toHaveCount(before + 1);
    await expect(rows.filter({ hasText: "(part 1)" })).toHaveCount(1);
    // Skip the first part.
    await rows.filter({ hasText: "(part 1)" }).click();
    await page.getByTestId("sprint-skip").click();
    await expect(rows.filter({ hasText: "(part 2)" })).toHaveCount(1);
    // Add a sprint.
    await page.getByTestId("mission-add-sprint").click();
    await page.getByTestId("add-sprint-title").fill("Write the FAQ");
    await page.getByTestId("add-sprint-save").click();
    await page.getByText("Show all").click();
    await expect(page.getByText("Write the FAQ")).toBeVisible();
  });
});

test.describe("Journey 3: voice", () => {
  test("creates a goal by speaking", async ({ page }) => {
    await mockSpeech(page, ["I want to learn Spanish in three weeks"]);
    await page.goto("/");
    await page.getByTestId("voice-button").click();
    await expect(page.getByTestId("goal-input")).toHaveValue("I want to learn Spanish in three weeks", { timeout: 5_000 });
    await expect(page.getByText(/By 3 weeks/)).toBeVisible();
    await page.getByTestId("goal-continue").click();
    await expect(page.getByTestId("plan-review")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Learn Spanish")).toBeVisible();
  });

  test("runs commands from the home screen", async ({ page }) => {
    await mockSpeech(page, ["I have 15 minutes", "start my next sprint"]);
    await loadDemo(page);
    await page.getByTestId("voice-button").click();
    await expect(page.getByTestId("next")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("next-best").getByTestId("next-minutes")).toContainText("15 min");
    await page.getByTestId("next-close").click();
    await page.getByTestId("voice-button").click();
    await expect(page.getByTestId("countdown")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Journey 4: AI unavailable", () => {
  test("plans locally and explains itself", async ({ page }) => {
    // This build has no API configured, so planning must never depend on a server.
    await page.route("**/api/**", (route) => route.abort());
    await page.goto("/");
    await page.getByTestId("goal-input").fill("I want to get fit");
    await page.getByTestId("goal-continue").click();
    await page.getByTestId("timeframe-month").click();
    await page.getByTestId("goal-plan").click();
    // Ambiguous goal: one question, not an interrogation.
    await expect(page.getByText("What does fit mean for you right now?")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("clarify-running").click();
    await expect(page.getByTestId("plan-review")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Get Running")).toBeVisible();
  });
});

test.describe("Journey 5: offline", () => {
  test("creates goals, runs and completes sprints with no network", async ({ page, context }) => {
    await loadDemo(page);
    await context.setOffline(true);
    await page.getByTestId("tab-missions").click();
    await page.getByTestId("missions-add").click();
    await page.getByTestId("goal-input").fill("Organise my house");
    await page.getByTestId("goal-continue").click();
    await page.getByTestId("timeframe-week").click();
    await page.getByTestId("goal-plan").click();
    await expect(page.getByTestId("plan-review")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("plan-create").click();
    await expect(page.getByTestId("home")).toBeVisible();
    await page.getByTestId("start-sprint").click();
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8_000 });
    await page.getByTestId("focus-complete").click();
    await expect(page.getByTestId("complete")).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe("Journey 6: notification permission denied", () => {
  test("stays calm and keeps working", async ({ page }) => {
    await mockNotifications(page, "default");
    await loadDemo(page);
    await page.getByTestId("start-sprint").click();
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8_000 });
    await page.getByTestId("focus-complete").click();
    await expect(page.getByTestId("notification-nudge")).toBeVisible();
    await page.getByTestId("nudge-allow").click();
    await expect(page.getByTestId("notification-nudge")).toHaveCount(0);
    await page.getByTestId("take-break").click();
    await page.goto("/settings");
    await expect(page.getByTestId("allow-notifications")).toBeVisible();
    await page.getByTestId("allow-notifications").click();
    await expect(page.getByText(/Blocked in system settings|Not allowed/)).toBeVisible();
  });
});

test.describe("Journey 7: microphone permission denied", () => {
  test("falls back to typing with a clear explanation", async ({ page }) => {
    await mockSpeech(page, [], { error: "not-allowed" });
    await page.goto("/");
    await page.getByTestId("voice-button").click();
    await expect(page.getByText(/Microphone is blocked/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("voice-button")).toBeDisabled();
    await page.getByTestId("goal-input").fill("Sort my finances");
    await page.getByTestId("goal-continue").click();
    await expect(page.getByTestId("timeframe-week")).toBeVisible();
  });
});

test.describe("Journey 8: app backgrounded during a sprint", () => {
  test("finishes the sprint from timestamps when the app returns", async ({ page }) => {
    await loadDemo(page);
    await page.clock.install();
    await page.getByTestId("quick-5").click();
    await expect(page.getByTestId("next")).toBeVisible();
    await page.getByTestId("next-best").getByTestId("start-sprint").click();
    await page.clock.runFor(4000);
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("focus-dial-time")).toHaveText(/0[45]:[0-5]\d/);
    // Device sleeps for ten minutes. No ticks arrive.
    await page.clock.fastForward("10:00");
    await page.clock.runFor(1500);
    await expect(page.getByTestId("complete")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("complete-headline")).toContainText("Time's up");
    await expect(page.getByTestId("follow-up-15")).toBeVisible();
    await page.getByTestId("follow-up-15").click();
    await expect(page.getByTestId("follow-up-added")).toContainText("15-minute follow-up");
  });

  test("keeps the right remaining time after a pause and a clock jump", async ({ page }) => {
    await loadDemo(page);
    await page.clock.install();
    await page.getByTestId("start-sprint").click();
    await page.clock.runFor(4000);
    await expect(page.getByTestId("focus-dial")).toBeVisible({ timeout: 8_000 });
    await page.getByTestId("focus-toggle").click();
    await page.clock.fastForward("03:00");
    await page.clock.runFor(1200);
    await page.getByTestId("focus-toggle").click();
    await page.clock.runFor(1200);
    // Three minutes passed while paused: nothing was lost.
    await expect(page.getByTestId("focus-dial-time")).toHaveText(/1[45]:[0-5]\d|19:[0-5]\d/);
  });
});

test.describe("Responsive and accessible", () => {
  test("every main screen has the expected landmarks and reachable controls", async ({ page }) => {
    await loadDemo(page);
    await expect(page.getByRole("button", { name: "Start sprint" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Missions" })).toBeVisible();
    await page.getByRole("tab", { name: "Progress" }).click();
    await expect(page.getByTestId("progress")).toBeVisible();
    await expect(page.getByTestId("momentum-score")).toHaveText(/\d+/);
    await page.goto("/settings");
    await page.getByTestId("theme-dark").click();
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(11, 12, 16)");
    await page.getByTestId("theme-light").click();
    const bg2 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg2).toBe("rgb(247, 246, 242)");
  });

  test("keyboard navigation reaches the primary action", async ({ page }) => {
    await loadDemo(page);
    let focusedStart = false;
    for (let i = 0; i < 25 && !focusedStart; i++) {
      await page.keyboard.press("Tab");
      focusedStart = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "start-sprint");
    }
    expect(focusedStart).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("countdown")).toBeVisible();
  });
});
