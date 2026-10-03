import { describe, expect, it } from "vitest";
import { DAY_MS } from "../clock";
import { lifeSpots } from "../map";
import { conductGrade, createSim, newProfile, startActivity, stepLife, type LifeEvent, type LifeSim } from "../sim";
import { randomStarterLook } from "../wardrobe";

const DAY = 1000;
const at = (sec: number) => DAY * DAY_MS + sec * 1000;

function simAt(spotId: string, now: number, roll: number): LifeSim {
  const s = createSim("me", newProfile("me", randomStarterLook(), now), now);
  s.profile.day.goals = [];
  s.random = () => roll;
  const spot = lifeSpots.find((p) => p.id === spotId)!;
  Object.assign(s, { x: spot.x, y: spot.y });
  return s;
}

function run(s: LifeSim, ms: number, start: number, input = { dx: 0, dy: 0 }): LifeEvent[] {
  const out: LifeEvent[] = [];
  for (let t = 0; t < ms; t += 100) out.push(...stepLife(s, 100, start + t, input));
  return out;
}

describe("breaking the rules", () => {
  it("getting away with it gives the reward", () => {
    const now = at(60); // lesson time
    const s = simAt("phone_in_class", now, 0.99);
    const fun = s.profile.day.needs.fun;
    expect(startActivity(s, "phone_in_class", now)).toEqual({ ok: true });
    const events = run(s, 9000, now);
    expect(events.some((e) => e.kind === "activity_done" && e.summary.includes("Got away"))).toBe(true);
    expect(s.profile.day.needs.fun).toBeGreaterThan(fun);
    expect(s.profile.day.counters.mischief).toBe(1);
    expect(s.profile.day.counters.caught).toBe(0);
  });

  it("getting caught costs a fine and grades instead", () => {
    const now = at(60);
    const s = simAt("phone_in_class", now, 0.01);
    s.profile.day.gradePoints = 20;
    const coins = s.profile.coins;
    startActivity(s, "phone_in_class", now);
    const events = run(s, 9000, now);
    expect(events.some((e) => e.kind === "caught")).toBe(true);
    expect(s.profile.coins).toBe(coins - 300);
    expect(s.profile.day.gradePoints).toBe(15);
    expect(s.profile.day.counters.caught).toBe(1);
  });

  it("skipping class can land you in detention: no moving, no activities", () => {
    const now = at(60);
    const s = simAt("skip_class", now, 0.01);
    startActivity(s, "skip_class", now);
    run(s, 16_000, now);
    expect(s.detainedUntil).toBeGreaterThan(now);
    const pos = { x: s.x, y: s.y };
    run(s, 2000, now + 16_000, { dx: 1, dy: 0 });
    expect({ x: s.x, y: s.y }).toEqual(pos);
    expect(startActivity(s, "lesson", now + 18_000)).toMatchObject({ ok: false, reason: expect.stringContaining("detention") });
    run(s, 2000, s.detainedUntil, { dx: 1, dy: 0 });
    expect(s.x).toBeGreaterThan(pos.x);
  });

  it("only works in lesson time, and shows on the report card", () => {
    const s = simAt("eat_in_class", at(200), 0.01);
    expect(startActivity(s, "eat_in_class", at(200))).toMatchObject({ ok: false }); // break time
    expect(conductGrade(0)).toBe("Excellent");
    expect(conductGrade(3)).toBe("Poor");
    s.profile.day.counters.caught = 3;
    s.profile.day.gradePoints = 75;
    const coins = s.profile.coins;
    const report = run(s, 6000, at(550), ).find((e) => e.kind === "report_card");
    expect(report?.kind === "report_card" && report.report.conduct).toBe("Poor");
    // Misbehaving three times means no reward from home, even for an A.
    expect(s.profile.coins).toBe(coins);
  });
});
