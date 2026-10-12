import { describe, expect, it } from "vitest";
import { parseDeadline, parseGoal } from "./parseGoal";
import { toDay } from "../domain/time";

// Wednesday 7 October 2026, 10:00 local.
const NOW = new Date(2026, 9, 7, 10, 0, 0).getTime();

describe("parseDeadline", () => {
  it("understands holidays", () => {
    const r = parseDeadline("I want to launch my website by Christmas", NOW);
    expect(r?.phrase).toBe("Christmas");
    expect(toDay(r!.deadline)).toBe("2026-12-25");
    expect(r?.rest).toBe("I want to launch my website");
  });

  it("understands weekdays", () => {
    const r = parseDeadline("I need to prepare a presentation for Friday", NOW);
    expect(toDay(r!.deadline)).toBe("2026-10-09");
    expect(r?.phrase).toBe("Friday");
    expect(r?.timeframe).toBe("week");
  });

  it("treats 'next monday' as the monday of next week", () => {
    const r = parseDeadline("finish the report by next monday", NOW);
    expect(toDay(r!.deadline)).toBe("2026-10-12");
  });

  it("understands relative durations with number words", () => {
    const r = parseDeadline("I've got an exam in three weeks", NOW);
    expect(toDay(r!.deadline)).toBe("2026-10-28");
    expect(r?.phrase).toBe("3 weeks");
  });

  it("understands 'in the next month'", () => {
    const r = parseDeadline("I want to build an app in the next month", NOW);
    expect(toDay(r!.deadline)).toBe("2026-11-07");
    expect(r?.rest).toBe("I want to build an app");
  });

  it("understands end of month", () => {
    const r = parseDeadline("launch by the end of the month", NOW);
    expect(toDay(r!.deadline)).toBe("2026-10-31");
  });

  it("understands explicit dates", () => {
    expect(toDay(parseDeadline("by 15 december", NOW)!.deadline)).toBe("2026-12-15");
    expect(toDay(parseDeadline("by December 15th", NOW)!.deadline)).toBe("2026-12-15");
    expect(toDay(parseDeadline("on jan 3", NOW)!.deadline)).toBe("2027-01-03");
  });

  it("understands month names", () => {
    expect(toDay(parseDeadline("by december", NOW)!.deadline)).toBe("2026-12-01");
    expect(toDay(parseDeadline("in december", NOW)!.deadline)).toBe("2026-12-31");
    expect(toDay(parseDeadline("before march", NOW)!.deadline)).toBe("2027-03-01");
  });

  it("understands today and tomorrow", () => {
    expect(toDay(parseDeadline("sort the garage today", NOW)!.deadline)).toBe("2026-10-07");
    expect(toDay(parseDeadline("write the email by tomorrow", NOW)!.deadline)).toBe("2026-10-08");
    expect(parseDeadline("sort the garage today", NOW)?.timeframe).toBe("today");
  });

  it("understands this week and next month", () => {
    expect(toDay(parseDeadline("tidy the flat this week", NOW)!.deadline)).toBe("2026-10-11");
    expect(toDay(parseDeadline("sort finances next month", NOW)!.deadline)).toBe("2026-11-30");
  });

  it("returns undefined without a time phrase", () => {
    expect(parseDeadline("I want to get fit", NOW)).toBeUndefined();
  });
});

describe("parseGoal", () => {
  it("extracts objective, archetype, and deadline", () => {
    const g = parseGoal("I want to launch my website by Christmas", NOW);
    expect(g.objective).toBe("Launch my website");
    expect(g.archetype).toBe("website");
    expect(g.category).toBe("work");
    expect(g.deadlinePhrase).toBe("Christmas");
    expect(g.confidence).toBeGreaterThan(0.7);
  });

  it("maps common goals to archetypes", () => {
    expect(parseGoal("Write my book", NOW).archetype).toBe("book");
    expect(parseGoal("Run a 10K", NOW).archetype).toBe("running");
    expect(parseGoal("Learn Spanish", NOW).archetype).toBe("language");
    expect(parseGoal("Organise my house", NOW).archetype).toBe("home");
    expect(parseGoal("Build my business", NOW).archetype).toBe("business");
    expect(parseGoal("Finish my dissertation", NOW).archetype).toBe("dissertation");
    expect(parseGoal("Get my finances organised", NOW).archetype).toBe("finance");
    expect(parseGoal("I want to get fit", NOW).archetype).toBe("fitness");
    expect(parseGoal("I need to prepare a presentation for Friday", NOW).archetype).toBe("presentation");
    expect(parseGoal("I've got an exam in three weeks", NOW).archetype).toBe("exam");
  });

  it("cleans leading phrases", () => {
    expect(parseGoal("I'd really like to learn the piano", NOW).objective).toBe("Learn the piano");
    expect(parseGoal("help me get back into running", NOW).objective).toBe("Get back into running");
    expect(parseGoal("I've got an exam in three weeks", NOW).objective).toBe("Prepare for my exam");
  });

  it("falls back to generic with lower confidence", () => {
    const g = parseGoal("Sort out the thing", NOW);
    expect(g.archetype).toBe("generic");
    expect(g.confidence).toBeLessThan(0.7);
  });
});
