import { describe, expect, it } from "vitest";
import { hasEventRole } from "@/domain/event-access";

const EVENT_ID = "event-a";
const OTHER_EVENT_ID = "event-b";

describe("hasEventRole (AC4)", () => {
  it("allows an organizer of this event", () => {
    expect(
      hasEventRole([{ eventId: EVENT_ID, role: "ORGANIZER" }], EVENT_ID, [
        "ORGANIZER",
      ]),
    ).toBe(true);
  });

  it.each(["JUDGE", "TEAM"] as const)(
    "rejects a %s of this event for organizer-only access",
    (role) => {
      expect(
        hasEventRole([{ eventId: EVENT_ID, role }], EVENT_ID, ["ORGANIZER"]),
      ).toBe(false);
    },
  );

  it("rejects a user with no membership", () => {
    expect(hasEventRole([], EVENT_ID, ["ORGANIZER"])).toBe(false);
  });

  it("rejects an organizer of a different event", () => {
    expect(
      hasEventRole([{ eventId: OTHER_EVENT_ID, role: "ORGANIZER" }], EVENT_ID, [
        "ORGANIZER",
      ]),
    ).toBe(false);
  });

  it("allows a judge when JUDGE is among the allowed roles", () => {
    expect(
      hasEventRole([{ eventId: EVENT_ID, role: "JUDGE" }], EVENT_ID, [
        "ORGANIZER",
        "JUDGE",
      ]),
    ).toBe(true);
  });
});
