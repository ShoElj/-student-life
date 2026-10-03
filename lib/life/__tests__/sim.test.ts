import { describe, expect, it } from "vitest";
import { DAY_MS, getSchoolTime } from "../clock";
import { isWalkable } from "@/lib/game/collision";
import { getActivity } from "../activities";
import { LIFE_SPAWN, LIFE_WORLD, lifeGeometry, lifeSpots } from "../map";
import { formatMoney, interestFor, jobPay, MAX_SHIFTS_PER_DAY, POCKET_MONEY } from "../money";
import {
  buyOrWear,
  createSim,
  gradeLetter,
  moveSavings,
  newProfile,
  payFor,
  receiveSocial,
  sendSocial,
  startActivity,
  stepLife,
  type LifeEvent,
  type LifeSim,
} from "../sim";
import { randomStarterLook, sanitizeLook, wardrobe } from "../wardrobe";

const DAY = 1000;
/** A moment `sec` seconds into school day DAY. */
const at = (sec: number) => DAY * DAY_MS + sec * 1000;
const still = { dx: 0, dy: 0 };

function sim(now: number): LifeSim {
  return createSim("me", newProfile("me", randomStarterLook(() => 0.3), now), now);
}

function runFor(s: LifeSim, ms: number, start: number, step = 100): LifeEvent[] {
  const events: LifeEvent[] = [];
  for (let t = 0; t < ms; t += step) events.push(...stepLife(s, step, start + t, still));
  return events;
}

describe("school clock", () => {
  it("follows the schedule", () => {
    expect(getSchoolTime(at(10)).period.kind).toBe("assembly");
    expect(getSchoolTime(at(100)).period.kind).toBe("lesson");
    expect(getSchoolTime(at(200)).period.kind).toBe("break");
    expect(getSchoolTime(at(560)).period.kind).toBe("home");
    expect(getSchoolTime(at(0)).clockLabel).toBe("7:30 AM");
    expect(getSchoolTime(at(100)).subject).toBeTruthy();
  });
});

describe("map", () => {
  const free = (x: number, y: number) => isWalkable(x, y, 12, lifeGeometry.zones, lifeGeometry.solids, lifeGeometry.world) === true;

  it("every activity spot and the spawn point stand on open floor", () => {
    expect(free(LIFE_SPAWN.x, LIFE_SPAWN.y)).toBe(true);
    for (const s of lifeSpots) expect(free(s.x, s.y), s.id).toBe(true);
  });

  it("every place in the school can be walked to from the gate", () => {
    // Flood-fill a 10px grid from the spawn point, the way a student would walk.
    const STEP = 10;
    const cols = Math.ceil(LIFE_WORLD.width / STEP);
    const rows = Math.ceil(LIFE_WORLD.height / STEP);
    const seen = new Uint8Array(cols * rows);
    const start = [Math.round(LIFE_SPAWN.x / STEP), Math.round(LIFE_SPAWN.y / STEP)];
    const queue = [start];
    seen[start[1] * cols + start[0]] = 1;
    while (queue.length) {
      const [cx, cy] = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx]) continue;
        if (!free(nx * STEP, ny * STEP)) continue;
        seen[ny * cols + nx] = 1;
        queue.push([nx, ny]);
      }
    }
    const reached = (x: number, y: number) => seen[Math.round(y / STEP) * cols + Math.round(x / STEP)] === 1;
    for (const s of lifeSpots) expect(reached(s.x, s.y), s.id).toBe(true);
    for (const z of lifeGeometry.zones.filter((z) => z.label)) {
      expect(reached(z.x + z.width / 2, z.y + z.height / 2) || lifeSpots.some((s) => s.x > z.x && s.x < z.x + z.width && s.y > z.y && s.y < z.y + z.height && reached(s.x, s.y)), z.key).toBe(true);
    }
  });

  it("no furniture blocks a doorway", () => {
    for (const d of lifeGeometry.zones.filter((z) => z.isLink)) {
      // Doors to the Front Yard are walked through sideways; the rest up and down.
      const sideways = d.key.endsWith("Yard");
      const cx = d.x + d.width / 2;
      const cy = d.y + d.height / 2;
      const reach = (sideways ? d.width : d.height) / 2 + 30;
      for (let k = -reach; k <= reach; k += 5) {
        expect(sideways ? free(cx + k, cy) : free(cx, cy + k), `${d.key} at ${k}`).toBe(true);
      }
    }
  });

  it("every activity on the map exists", () => {
    for (const s of lifeSpots) expect(getActivity(s.activity), s.id).not.toBeNull();
  });
});

describe("activities", () => {
  it("attending a lesson takes time, then raises grades", () => {
    const now = at(60);
    const s = sim(now);
    const lesson = lifeSpots.find((p) => p.id === "lesson")!;
    Object.assign(s, { x: lesson.x, y: lesson.y });
    const coins = s.profile.coins;
    expect(startActivity(s, "lesson", now)).toEqual({ ok: true });
    const events = runFor(s, 21_000, now);
    expect(events.some((e) => e.kind === "activity_done" && e.key === "attend_lesson")).toBe(true);
    expect(s.profile.day.gradePoints).toBeGreaterThan(0);
    expect(s.profile.day.counters.lessons).toBe(1);
    expect(s.profile.coins).toBeGreaterThanOrEqual(coins);
  });

  it("respects opening hours and prices", () => {
    const s = sim(at(60));
    const meal = lifeSpots.find((p) => p.id === "meal")!;
    Object.assign(s, { x: meal.x, y: meal.y });
    expect(startActivity(s, "meal", at(60))).toMatchObject({ ok: false });
    s.profile.coins = 300;
    expect(startActivity(s, "meal", at(200))).toEqual({ ok: false, reason: "You need ₦500" });
    s.profile.coins = 700;
    expect(startActivity(s, "meal", at(200))).toEqual({ ok: true });
    expect(s.profile.coins).toBe(200);
    expect(s.profile.day.moneySpent).toBe(500);
    expect(s.profile.ledger[0]).toMatchObject({ label: "Buy jollof rice", amount: -500 });
  });

  it("walking away cancels and refunds", () => {
    const s = sim(at(200));
    const snack = lifeSpots.find((p) => p.id === "snack")!;
    Object.assign(s, { x: snack.x, y: snack.y + 20 });
    s.profile.coins = 1000;
    startActivity(s, "snack", at(200));
    expect(s.profile.coins).toBe(800);
    const events = stepLife(s, 100, at(200), { dx: 0, dy: 1 });
    expect(events.some((e) => e.kind === "activity_cancelled")).toBe(true);
    expect(s.profile.coins).toBe(1000);
    expect(s.profile.day.moneySpent).toBe(0);
  });

  it("needs drop over time", () => {
    const s = sim(at(50));
    const before = s.profile.day.needs.hunger;
    runFor(s, 60_000, at(50), 1000);
    expect(s.profile.day.needs.hunger).toBeLessThan(before - 5);
  });
});

describe("goals, report card and new days", () => {
  it("completes goals and pays rewards", () => {
    const s = sim(at(60));
    s.profile.day.goals = [{ id: "hi3", done: false }];
    const coins = s.profile.coins;
    for (const id of ["a", "b", "b", "c"]) sendSocial(s, "hi", id, at(60));
    const events = stepLife(s, 10, at(60), still);
    expect(s.profile.day.counters.greetings).toBe(3);
    expect(s.profile.day.goals[0].done || events.some((e) => e.kind === "goal_done")).toBe(true);
    expect(s.profile.coins).toBe(coins + 300);
  });

  it("shows the report card at home time once, then starts a fresh day", () => {
    const s = sim(at(550));
    s.profile.day.gradePoints = 72;
    const home = runFor(s, 6000, at(550), 500).filter((e) => e.kind === "report_card");
    expect(home).toHaveLength(1);
    expect(home[0].kind === "report_card" && home[0].report.grade).toBe("A");
    const next = stepLife(s, 100, (DAY + 1) * DAY_MS + 1000, still);
    expect(next.some((e) => e.kind === "new_day")).toBe(true);
    expect(next.some((e) => e.kind === "report_card")).toBe(false);
    expect(s.profile.day.gradePoints).toBe(0);
    expect(s.profile.day.goals).toHaveLength(3);
  });

  it("grades", () => {
    expect(gradeLetter(75)).toBe("A");
    expect(gradeLetter(55)).toBe("B");
    expect(gradeLetter(5)).toBe("F");
  });
});

describe("friends and wardrobe", () => {
  it("greeting the same classmate twice only builds friendship once a day", () => {
    const s = sim(at(60));
    expect(sendSocial(s, "hi", "ada", at(60))).toMatchObject({ ok: true, friendshipPoints: 2 });
    expect(sendSocial(s, "hi", "ada", at(61))).toMatchObject({ ok: true, friendshipPoints: 0 });
  });

  it("helping needs the library and has a cooldown; the helped student gains grades", () => {
    const s = sim(at(60));
    expect(sendSocial(s, "help", "ada", at(60))).toMatchObject({ ok: false });
    const study = lifeSpots.find((p) => p.id === "study")!;
    Object.assign(s, { x: study.x, y: study.y });
    expect(sendSocial(s, "help", "ada", at(60))).toMatchObject({ ok: true });
    expect(sendSocial(s, "help", "ada", at(70))).toMatchObject({ ok: false });
    const other = sim(at(60));
    receiveSocial(other, "help");
    expect(other.profile.day.gradePoints).toBe(5);
  });

  it("buys an item once, then wears it for free", () => {
    const profile = newProfile("me", randomStarterLook(), at(0));
    const gold = wardrobe.find((i) => i.id === "shirt:#eab308")!;
    profile.coins = 3000;
    expect(buyOrWear(profile, gold)).toEqual({ ok: true });
    expect(profile.coins).toBe(500);
    expect(profile.look.shirt).toBe("#eab308");
    expect(buyOrWear(profile, gold)).toEqual({ ok: true });
    expect(profile.coins).toBe(500);
  });

  it("rejects malformed looks from the network", () => {
    expect(sanitizeLook({ skin: "red" })).toBeNull();
    expect(sanitizeLook(randomStarterLook())).not.toBeNull();
  });
});

describe("money", () => {
  it("formats Naira", () => {
    expect(formatMoney(1500)).toBe("₦1,500");
    expect(formatMoney(-200)).toBe("-₦200");
    expect(formatMoney(1234567)).toBe("₦1,234,567");
  });

  it("part-time jobs pay after the shift, more with experience and customers", () => {
    const now = at(200);
    const s = sim(now);
    const spot = lifeSpots.find((p) => p.id === "canteen_job")!;
    Object.assign(s, { x: spot.x, y: spot.y });
    s.profile.day.goals = [];
    const before = s.profile.coins;
    expect(startActivity(s, "canteen_job", now)).toEqual({ ok: true });
    const events = runFor(s, 16_000, now);
    expect(events.some((e) => e.kind === "activity_done" && e.summary.includes("₦400"))).toBe(true);
    expect(s.profile.coins).toBe(before + 400);
    expect(s.profile.day.counters.shifts).toBe(1);
    expect(jobPay(400, 6)).toBe(600);
    const stall = { label: "x", job: { basePay: 200, perClassmate: 100, maxExtra: 500, where: "" } };
    expect(payFor(stall as never, { profile: { ...s.profile, xp: 0 } }, 2, now)).toBe(400);
    expect(payFor(stall as never, { profile: { ...s.profile, xp: 0 } }, 20, now)).toBe(700);
  });

  it("jobs keep their hours and a daily shift limit", () => {
    const s = sim(at(100));
    const spot = lifeSpots.find((p) => p.id === "sweep_job")!;
    Object.assign(s, { x: spot.x, y: spot.y });
    expect(startActivity(s, "sweep_job", at(100))).toMatchObject({ ok: false });
    s.profile.day.counters.shifts = MAX_SHIFTS_PER_DAY;
    expect(startActivity(s, "sweep_job", at(450))).toMatchObject({ ok: false, reason: expect.stringContaining("shifts") });
    s.profile.day.counters.shifts = 0;
    expect(startActivity(s, "sweep_job", at(450))).toEqual({ ok: true });
  });

  it("savings earn interest overnight and pocket money arrives each morning", () => {
    const s = sim(at(500));
    s.profile.day.goals = [];
    s.profile.coins = 2000;
    expect(moveSavings(s, "in", 5000, at(500))).toMatchObject({ ok: false });
    expect(moveSavings(s, "in", 2000, at(500))).toMatchObject({ ok: true });
    expect(s.profile.day.counters.saved).toBe(1);
    expect(s.profile.coins).toBe(0);
    expect(s.profile.savings).toBe(2000);
    s.profile.day.reportShown = true;
    const events = stepLife(s, 100, (DAY + 1) * DAY_MS + 1000, still);
    expect(events.filter((e) => e.kind === "money_in").map((e) => e.kind === "money_in" && e.amount)).toEqual([
      interestFor(2000),
      POCKET_MONEY,
    ]);
    expect(s.profile.savings).toBe(2100);
    expect(s.profile.coins).toBe(POCKET_MONEY);
    expect(moveSavings(s, "out", 100, at(0) + DAY_MS)).toMatchObject({ ok: true });
    expect(s.profile.coins).toBe(POCKET_MONEY + 100);
  });

  it("a good report card earns a reward from home", () => {
    const s = sim(at(550));
    s.profile.day.gradePoints = 72;
    s.profile.day.goals = [];
    const before = s.profile.coins;
    const report = runFor(s, 6000, at(550), 500).find((e) => e.kind === "report_card");
    expect(report?.kind === "report_card" && report.report.bonus).toBe(1000);
    expect(s.profile.coins).toBe(before + 1000);
  });
});
