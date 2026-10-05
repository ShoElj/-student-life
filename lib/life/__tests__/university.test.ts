import { describe, expect, it } from "vitest";
import { DAY_MS } from "../clock";
import { createSim, newProfile, startActivity, stepLife, travel, type LifeEvent, type LifeSim } from "../sim";
import {
  chooseCourse,
  courses,
  DAYS_PER_LEVEL,
  degreeClass,
  GRADUATION_GIFT,
  jobFor,
  lectureFor,
  newUni,
  recordResult,
  recordShift,
  sanitizeUni,
  uniSummary,
} from "../university";
import { randomStarterLook } from "../wardrobe";
import { findSpot } from "../worlds";

const DAY = 2000;
/** `sec` seconds into school day DAY + d. */
const at = (d: number, sec: number) => (DAY + d) * DAY_MS + sec * 1000;
const still = { dx: 0, dy: 0 };

function student(): LifeSim {
  const s = createSim("me", newProfile("me", randomStarterLook(() => 0.3), at(0, 10)), at(0, 10));
  s.pending = [];
  return s;
}

/** Plays to the end of day d with the given grade points, returning that evening's events. */
function finishDay(s: LifeSim, d: number, gradePoints: number): LifeEvent[] {
  stepLife(s, 100, at(d, 300), still);
  s.profile.day.gradePoints = gradePoints;
  return [...stepLife(s, 100, at(d, 556), still), ...stepLife(s, 100, at(d, 557), still)];
}

describe("results and degrees", () => {
  it("uses the Nigerian 5-point scale and degree classes", () => {
    expect(degreeClass(4.6)).toBe("First Class");
    expect(degreeClass(3.5)).toBe("Second Class Upper");
    expect(degreeClass(2.4)).toBe("Second Class Lower");
    expect(degreeClass(1.5)).toBe("Third Class");
    expect(degreeClass(1.2)).toBe("Pass");
  });

  it("passed days move a student up a level; failed days only count towards the CGPA", () => {
    const uni = newUni("csc");
    expect(recordResult(uni, "F", 1, 0)).toEqual([]);
    expect(uni.passedDays).toBe(0);
    expect(uni.daysCounted).toBe(1);
    for (let i = 0; i < DAYS_PER_LEVEL - 1; i++) expect(recordResult(uni, "A", 2 + i, 0)).toEqual([]);
    expect(recordResult(uni, "B", 9, 0)).toEqual([{ kind: "level_up", level: 200, course: "csc" }]);
    expect(uni.level).toBe(200);
    expect(uni.passedDays).toBe(0);
  });

  it("graduates after 400 level with the right class", () => {
    const uni = { ...newUni("acc"), level: 400 as const };
    let events: ReturnType<typeof recordResult> = [];
    for (let i = 0; i < DAYS_PER_LEVEL; i++) events = recordResult(uni, "A", i, 123);
    expect(events).toEqual([{ kind: "graduated", course: "acc", cgpa: 5, degree: "First Class", gift: GRADUATION_GIFT }]);
    expect(uni.graduated?.degree).toBe("First Class");
    expect(recordResult(uni, "A", 99, 0)).toEqual([]);
  });

  it("names today's lectures by course code", () => {
    expect(lectureFor({ course: "csc", level: 200 }, "lesson1")).toBe("CSC 201 · Data Structures");
    expect(lectureFor({ course: "csc", level: 200 }, "lesson2")).toBe("CSC 202 · Computer Architecture");
    expect(lectureFor({ course: "mcm", level: 400 }, "lesson2")).toBe("MCM 499 · Final Year Project");
    expect(lectureFor(undefined, "lesson1")).toBeNull();
  });

  it("repairs saved records and refuses nonsense", () => {
    expect(sanitizeUni({ course: "law" })).toBeUndefined();
    const fixed = sanitizeUni({ course: "eco", level: 250, passedDays: 99, totalPoints: -4, results: [{ grade: "A", level: 100, dayIndex: 1 }] });
    expect(fixed).toMatchObject({ course: "eco", level: 100, passedDays: DAYS_PER_LEVEL - 1, totalPoints: 0, results: [{ grade: "A", gp: 5 }] });
  });
});

describe("working life", () => {
  it("pays by degree class and promotes with experience", () => {
    const first = { ...newUni("csc"), graduated: { cgpa: 4.8, degree: "First Class" as const, at: 0 }, shifts: 0 };
    const pass = { ...newUni("csc"), graduated: { cgpa: 1.2, degree: "Pass" as const, at: 0 }, shifts: 0 };
    expect(jobFor(first)?.title).toBe("Graduate Trainee Developer");
    expect(jobFor(first)!.pay).toBeGreaterThan(jobFor(pass)!.pay);
    const events = [];
    for (let i = 0; i < 5; i++) events.push(...recordShift(first));
    expect(events).toEqual([{ kind: "job_promotion", title: "Software Developer", pay: jobFor(first)!.pay }]);
    expect(jobFor(newUni("csc"))).toBeNull();
  });

  it("classmates see a short summary", () => {
    const uni = { ...newUni("bus"), level: 300 as const, totalPoints: 8, daysCounted: 2 };
    expect(uniSummary(uni)).toEqual({ course: "bus", level: 300, cgpa: 4, degree: undefined, job: undefined });
  });
});

describe("university in the game", () => {
  it("a student picks a course once and starts in 100 level", () => {
    const s = student();
    expect(s.profile.uni).toBeUndefined();
    expect(chooseCourse(s.profile, "mcb")).toEqual({ ok: true });
    expect(s.profile.uni?.level).toBe(100);
    expect(chooseCourse(s.profile, "csc")).toMatchObject({ ok: false });
  });

  it("each day's report card counts, and good days move the student up", () => {
    const s = student();
    chooseCourse(s.profile, "csc");
    let d = 0;
    const first = finishDay(s, d++, 80);
    const report = first.find((e) => e.kind === "report_card");
    expect(report && report.kind === "report_card" && report.report.uni).toMatchObject({ level: 100, gp: 5, cgpa: 5, passedDays: 1 });
    finishDay(s, d++, 80);
    const third = finishDay(s, d++, 55);
    expect(third.some((e) => e.kind === "level_up" && e.level === 200)).toBe(true);
    // The report card still shows the level the result was for.
    const last = third.find((e) => e.kind === "report_card");
    expect(last && last.kind === "report_card" && last.report.uni).toMatchObject({ level: 100, passedDays: 0 });
    expect(s.profile.uni?.level).toBe(200);
  });

  it("graduates get a gift, no more pocket money or report cards, and can work in town", () => {
    const s = student();
    chooseCourse(s.profile, "eco");
    s.profile.uni!.level = 400;
    let d = 0;
    let events: LifeEvent[] = [];
    for (let i = 0; i < DAYS_PER_LEVEL; i++) events = finishDay(s, d++, 80);
    expect(events.find((e) => e.kind === "graduated")).toMatchObject({ degree: "First Class" });
    expect(s.profile.ledger.some((l) => l.label === "Graduation gift from family" && l.amount === GRADUATION_GIFT)).toBe(true);

    // Next day: no pocket money, no report card, no lectures.
    const nextDay = stepLife(s, 100, at(d, 60), still);
    expect(nextDay.some((e) => e.kind === "money_in" && e.label === "Pocket money")).toBe(false);
    const classroom = findSpot("school", "lesson")!;
    Object.assign(s, { x: classroom.x, y: classroom.y });
    expect(startActivity(s, classroom.id, at(d, 61))).toMatchObject({ ok: false, reason: expect.stringContaining("graduated") });
    expect(finishDay(s, d, 80).some((e) => e.kind === "report_card")).toBe(false);

    // Work at the Office Complex pays a salary.
    d++;
    travel(s, "town");
    const desk = findSpot("town", "office")!;
    Object.assign(s, { x: desk.x, y: desk.y });
    stepLife(s, 100, at(d, 100), still);
    const before = s.profile.coins;
    expect(startActivity(s, "office", at(d, 101))).toEqual({ ok: true });
    for (let t = 0; t < 22; t++) stepLife(s, 1000, at(d, 102 + t), still);
    expect(s.profile.coins - before).toBe(jobFor(s.profile.uni)!.pay);
    expect(s.profile.uni?.shifts).toBe(1);
  });

  it("students can't take graduate jobs yet", () => {
    const s = student();
    chooseCourse(s.profile, "acc");
    travel(s, "town");
    const desk = findSpot("town", "office")!;
    Object.assign(s, { x: desk.x, y: desk.y });
    expect(startActivity(s, "office", at(0, 100))).toMatchObject({ ok: false, reason: expect.stringContaining("graduates") });
  });

  it("every course has a lecture for every level and a career", () => {
    for (const c of Object.values(courses)) {
      for (const level of [100, 200, 300, 400] as const) expect(c.lectures[level]).toHaveLength(2);
      expect(c.career.titles).toHaveLength(4);
    }
  });
});
