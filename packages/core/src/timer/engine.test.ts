import { describe, expect, it } from "vitest";
import * as timer from "./engine";

const T0 = 1_700_000_000_000;
const MIN = 60_000;

describe("timer engine", () => {
  it("counts down from timestamps, not ticks", () => {
    const s = timer.start(25 * MIN, T0);
    expect(timer.derive(s, T0).remainingMs).toBe(25 * MIN);
    expect(timer.derive(s, T0 + 10 * MIN).remainingMs).toBe(15 * MIN);
    expect(timer.derive(s, T0 + 10 * MIN).progress).toBeCloseTo(0.4);
    expect(timer.derive(s, T0 + 10 * MIN).endsAt).toBe(T0 + 25 * MIN);
  });

  it("pauses and resumes without losing time", () => {
    let s = timer.start(25 * MIN, T0);
    s = timer.pause(s, T0 + 5 * MIN);
    expect(timer.derive(s, T0 + 5 * MIN).status).toBe("paused");
    // Ten minutes pass while paused.
    expect(timer.derive(s, T0 + 15 * MIN).remainingMs).toBe(20 * MIN);
    s = timer.resume(s, T0 + 15 * MIN);
    expect(timer.derive(s, T0 + 20 * MIN).remainingMs).toBe(15 * MIN);
    expect(timer.derive(s, T0 + 20 * MIN).status).toBe("running");
    expect(timer.derive(s, T0 + 20 * MIN).endsAt).toBe(T0 + 35 * MIN);
  });

  it("ignores double pause and resume", () => {
    let s = timer.start(10 * MIN, T0);
    s = timer.pause(s, T0 + MIN);
    const again = timer.pause(s, T0 + 2 * MIN);
    expect(again).toBe(s);
    s = timer.resume(s, T0 + 3 * MIN);
    expect(timer.resume(s, T0 + 4 * MIN)).toBe(s);
    expect(s.pauses).toHaveLength(1);
  });

  it("reports expiry after the app was backgrounded", () => {
    const s = timer.start(5 * MIN, T0);
    const r = timer.derive(s, T0 + 60 * MIN);
    expect(r.status).toBe("complete");
    expect(r.expired).toBe(true);
    expect(r.remainingMs).toBe(0);
    expect(r.progress).toBe(1);
  });

  it("completes explicitly and freezes elapsed time", () => {
    let s = timer.start(25 * MIN, T0);
    s = timer.complete(s, T0 + 12 * MIN);
    const r = timer.derive(s, T0 + 60 * MIN);
    expect(r.status).toBe("complete");
    expect(r.expired).toBe(false);
    expect(r.elapsedMs).toBe(12 * MIN);
    expect(timer.focusedMinutes(s, T0 + 60 * MIN)).toBe(12);
  });

  it("completing while paused closes the pause", () => {
    let s = timer.start(25 * MIN, T0);
    s = timer.pause(s, T0 + 5 * MIN);
    s = timer.complete(s, T0 + 9 * MIN);
    expect(timer.isPaused(s)).toBe(false);
    expect(timer.derive(s, T0 + 9 * MIN).elapsedMs).toBe(5 * MIN);
  });

  it("does not rewind when the device clock jumps backwards", () => {
    let s = timer.start(25 * MIN, T0);
    s = timer.observe(s, T0 + 10 * MIN);
    const r = timer.derive(s, T0 - 60 * MIN);
    expect(r.remainingMs).toBe(15 * MIN);
    s = timer.pause(s, T0 - 60 * MIN);
    expect(s.pauses[0]?.at).toBe(T0 + 10 * MIN);
  });

  it("pausing after expiry completes instead", () => {
    let s = timer.start(5 * MIN, T0);
    s = timer.pause(s, T0 + 10 * MIN);
    expect(s.completedAt).toBe(T0 + 10 * MIN);
    expect(timer.derive(s, T0 + 10 * MIN).status).toBe("complete");
  });

  it("extends with a floor of one minute remaining", () => {
    let s = timer.start(10 * MIN, T0);
    s = timer.extend(s, 5 * MIN, T0 + 2 * MIN);
    expect(s.durationMs).toBe(15 * MIN);
    s = timer.extend(s, -20 * MIN, T0 + 2 * MIN);
    expect(timer.derive(s, T0 + 2 * MIN).remainingMs).toBe(MIN);
  });
});
