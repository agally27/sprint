import { describe, expect, it } from "vitest";
import { nextPermissionState, parseVoiceCommand } from "./commands";

describe("parseVoiceCommand", () => {
  it("maps control commands", () => {
    expect(parseVoiceCommand("Pause").type).toBe("pause");
    expect(parseVoiceCommand("resume").type).toBe("resume");
    expect(parseVoiceCommand("Start my next sprint").type).toBe("start_next");
    expect(parseVoiceCommand("What's next?").type).toBe("whats_next");
    expect(parseVoiceCommand("what should I do next").type).toBe("whats_next");
    expect(parseVoiceCommand("Move this to tomorrow").type).toBe("move_to_tomorrow");
    expect(parseVoiceCommand("How am I doing?").type).toBe("how_am_i_doing");
    expect(parseVoiceCommand("What's my biggest priority?").type).toBe("priority");
    expect(parseVoiceCommand("I'm done").type).toBe("complete");
  });

  it("extracts durations", () => {
    expect(parseVoiceCommand("Give me a 15-minute sprint")).toEqual({ type: "sprint_for", minutes: 15 });
    expect(parseVoiceCommand("give me a twenty five minute sprint")).toEqual({ type: "sprint_for", minutes: 25 });
    expect(parseVoiceCommand("I have 30 minutes")).toEqual({ type: "available_time", minutes: 30 });
    expect(parseVoiceCommand("I've got an hour")).toEqual({ type: "available_time", minutes: 60 });
  });

  it("treats goal-shaped sentences as goals", () => {
    const r = parseVoiceCommand("I want to launch my website by the end of the month");
    expect(r.type).toBe("create_goal");
    expect(parseVoiceCommand("New goal: run a 10K")).toEqual({ type: "create_goal", text: "run a 10k" });
  });

  it("returns unknown for noise", () => {
    expect(parseVoiceCommand("banana").type).toBe("unknown");
  });
});

describe("permission state machine", () => {
  it("never flips to blocked while it can still ask", () => {
    expect(nextPermissionState("undetermined", { granted: false, canAskAgain: true })).toBe("denied");
    expect(nextPermissionState("denied", { granted: false, canAskAgain: false })).toBe("blocked");
    expect(nextPermissionState("denied", { granted: true, canAskAgain: true })).toBe("granted");
    expect(nextPermissionState("unknown", { granted: false, canAskAgain: true, available: false })).toBe("unavailable");
  });
});
