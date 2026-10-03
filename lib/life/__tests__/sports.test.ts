import { describe, expect, it } from "vitest";
import { getActivity } from "../activities";
import { lifeSpots } from "../map";
import { createSim, finishSport, newProfile, sportBlocker } from "../sim";
import {
  bouncing,
  compareScores,
  computerScore,
  keeperDives,
  penaltyResult,
  raceStep,
  RACE_METRES,
  seededRandom,
  SPORT_KINDS,
  sportForActivity,
  sports,
  tenTenCalls,
  throwScores,
  throwZone,
  crossingMs,
} from "../sports";
import { randomStarterLook } from "../wardrobe";

describe("sports", () => {
  it("every sport has a venue on the map", () => {
    for (const kind of SPORT_KINDS) {
      const spot = lifeSpots.find((s) => s.activity === sports[kind].activity);
      expect(spot, kind).toBeDefined();
      expect(getActivity(spot!.activity)?.sport).toBe(kind);
      expect(sportForActivity(spot!.activity)).toBe(kind);
    }
  });

  it("both players get the same challenge from the same seed", () => {
    expect(keeperDives(42)).toEqual(keeperDives(42));
    expect(tenTenCalls(7)).toEqual(tenTenCalls(7));
    expect(tenTenCalls(7)).not.toEqual(tenTenCalls(8));
    const a = seededRandom(1);
    const b = seededRandom(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("penalties: power and placement decide the shot", () => {
    expect(penaltyResult(4, 0.9, 0)).toBe("over");
    expect(penaltyResult(4, 0.2, 0)).toBe("weak");
    expect(penaltyResult(3, 0.5, 0)).toBe("saved");
    expect(penaltyResult(3, 0.5, 2)).toBe("goal");
    // A strong shot into a top corner beats a keeper who guessed right.
    expect(penaltyResult(0, 0.7, 0)).toBe("goal");
    expect(penaltyResult(0, 0.5, 0)).toBe("saved");
  });

  it("free throws: the green zone shrinks with a streak", () => {
    expect(throwScores(0.5, 0)).toBe(true);
    expect(throwScores(0.1, 0)).toBe(false);
    const wide = throwZone(0);
    const narrow = throwZone(5);
    expect(narrow.max - narrow.min).toBeLessThan(wide.max - wide.min);
    expect(bouncing(0, 1000)).toBe(0);
    expect(bouncing(500, 1000)).toBe(1);
  });

  it("race: alternating feet runs, the same foot twice stumbles", () => {
    let s = { metres: 0, lastFoot: null as "left" | "right" | null, stumbles: 0 };
    s = raceStep(s, "left");
    s = raceStep(s, "right");
    expect(s.metres).toBe(4);
    s = raceStep(s, "right");
    expect(s.stumbles).toBe(1);
    expect(s.metres).toBe(4);
    for (let i = 0; i < 200; i++) s = raceStep(s, i % 2 ? "right" : "left");
    expect(s.metres).toBe(RACE_METRES);
  });

  it("table tennis speeds up with every hit", () => {
    expect(crossingMs(10)).toBeLessThan(crossingMs(0));
  });

  it("compares scores (lower race time wins)", () => {
    expect(compareScores("football", 4, 3)).toBe("win");
    expect(compareScores("race", 9000, 10_000)).toBe("win");
    expect(compareScores("race", 11_000, 10_000)).toBe("lose");
    expect(compareScores("tenten", 5, 5)).toBe("draw");
  });

  it("the computer's scores are fair", () => {
    const random = seededRandom(3);
    for (let i = 0; i < 50; i++) {
      expect(computerScore("football", random)).toBeLessThanOrEqual(5);
      expect(computerScore("basketball", random)).toBeLessThanOrEqual(10);
      const t = computerScore("race", random);
      expect(t).toBeGreaterThan(8000);
      expect(t).toBeLessThan(12_100);
    }
  });

  it("playing costs energy, pays fun and XP, and counts for goals", () => {
    const now = Date.now();
    const sim = createSim("me", newProfile("me", randomStarterLook(), now), now);
    const before = { ...sim.profile.day.needs };
    const { summary } = finishSport(sim, "football", true, "win");
    expect(sim.profile.day.needs.energy).toBeLessThan(before.energy);
    expect(sim.profile.day.counters.football).toBe(1);
    expect(sim.profile.day.counters.sports).toBe(1);
    expect(summary).toContain("XP");
    sim.profile.day.needs.energy = 5;
    expect(sportBlocker(sim)).toMatch(/tired/);
  });
});
