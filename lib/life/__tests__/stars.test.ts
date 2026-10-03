import { describe, expect, it } from "vitest";
import { createSim, finishSport, newProfile } from "../sim";
import { addStars, starsForEvent, starsThisWeek, weekKey } from "../stars";
import { randomStarterLook } from "../wardrobe";

const MON = Date.UTC(2026, 8, 28, 10); // Monday 28 Sep 2026
const SUN = Date.UTC(2026, 9, 4, 20);
const NEXT_MON = Date.UTC(2026, 9, 5, 8);

describe("star points", () => {
  it("groups a week from Monday", () => {
    expect(weekKey(MON)).toBe("2026-09-28");
    expect(weekKey(SUN)).toBe("2026-09-28");
    expect(weekKey(NEXT_MON)).toBe("2026-10-05");
  });

  it("adds up during the week, never goes negative and resets next week", () => {
    const p = newProfile("s1", randomStarterLook(), MON);
    addStars(p, -2, MON);
    expect(starsThisWeek(p.stats, MON)).toBe(0);
    addStars(p, 5, MON);
    addStars(p, 3, SUN);
    expect(starsThisWeek(p.stats, SUN)).toBe(8);
    expect(starsThisWeek(p.stats, NEXT_MON)).toBe(0);
    addStars(p, 2, NEXT_MON);
    expect(starsThisWeek(p.stats, NEXT_MON)).toBe(2);
  });

  it("scores events", () => {
    const lesson = (k: string) => k === "maths";
    expect(starsForEvent({ kind: "activity_done", key: "maths", summary: "" }, lesson)).toBe(2);
    expect(starsForEvent({ kind: "activity_done", key: "snack", summary: "" }, lesson)).toBe(0);
    expect(starsForEvent({ kind: "goal_done", goalId: "g", text: "", reward: 1 }, lesson)).toBe(5);
    expect(starsForEvent({ kind: "caught", key: "x", text: "", detentionSec: 0 }, lesson)).toBe(-2);
  });

  it("gives stars for a sports win", () => {
    const sim = createSim("s1", newProfile("s1", randomStarterLook(), MON), MON);
    const before = starsThisWeek(sim.profile.stats, MON);
    finishSport(sim, "football", true, "win", MON);
    expect(starsThisWeek(sim.profile.stats, MON)).toBe(before + 3);
  });
});
