/**
 * Student Life rules for one student: needs that drop over time, timed activities, part-time
 * jobs, daily goals, money, and the report card at home time. Pure and deterministic for a given
 * `now`.
 */
import { moveWithCollision } from "@/lib/game/collision";
import type { Direction, MovementInput } from "@/lib/game/types";
import { getActivity, type ActivityDef } from "./activities";
import { getSchoolTime, type Period } from "./clock";
import { SOCIAL_RULES } from "./friendship";
import { getGoal, pickGoals } from "./goals";
import { LIFE_SPAWN, lifeGeometry, lifeSpots, type Spot } from "./map";
import {
  earn,
  formatMoney,
  GRADE_BONUS,
  interestFor,
  jobPay,
  MAX_SHIFTS_PER_DAY,
  POCKET_MONEY,
  record,
  refund,
  spend,
  STARTING_MONEY,
  deposit,
  withdraw,
} from "./money";
import type {
  ActivityState,
  Classmate,
  CounterKey,
  Counters,
  DayState,
  LifeProfile,
  NeedKey,
  Needs,
  ReportCard,
  SocialKind,
} from "./types";
import { isOwned, type WardrobeItem } from "./wardrobe";

export const NEED_KEYS: NeedKey[] = ["energy", "hunger", "fun", "social"];
/** Points lost per real second. A 10-minute day costs roughly a third to a half of each need. */
export const NEED_DECAY_PER_SEC: Needs = { energy: 0.06, hunger: 0.1, fun: 0.08, social: 0.06 };
export const LIFE_SPEED = 150;
export const BODY_HALF = 12;
const LOW_NEED = 20;

export type LifeEvent =
  | { kind: "period_changed"; period: Period }
  | { kind: "activity_started"; key: string }
  | { kind: "activity_done"; key: string; summary: string }
  | { kind: "activity_cancelled"; key: string; reason: string }
  | { kind: "goal_done"; goalId: string; text: string; reward: number }
  | { kind: "need_low"; need: NeedKey }
  | { kind: "played_with"; classmateIds: string[] }
  | { kind: "report_card"; report: ReportCard }
  | { kind: "money_in"; label: string; amount: number }
  | { kind: "new_day"; dayIndex: number };

export type LifeSim = {
  studentId: string;
  x: number;
  y: number;
  facing: Direction;
  profile: LifeProfile;
  activity: ActivityState | null;
  lastPeriodKey: string | null;
  lowWarned: NeedKey[];
  helpCooldowns: Record<string, number>;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function emptyCounters(): Counters {
  return {
    lessons: 0,
    study: 0,
    meals: 0,
    snacks: 0,
    football: 0,
    greetings: 0,
    helped: 0,
    assembly: 0,
    rest: 0,
    friendActs: 0,
    shifts: 0,
    saved: 0,
  };
}

/** Fills in fields that older saved days don't have. */
export function repairDay(day: DayState): DayState {
  day.counters = { ...emptyCounters(), ...day.counters };
  day.moneySpent = Number.isFinite(day.moneySpent) ? day.moneySpent : 0;
  day.coinsEarned = Number.isFinite(day.coinsEarned) ? day.coinsEarned : 0;
  return day;
}

export function newDay(dayIndex: number, studentId: string, previous?: DayState): DayState {
  // Overnight everyone sleeps and eats breakfast; fun and friendships carry over a little.
  const needs: Needs = previous
    ? { energy: 85, hunger: 70, fun: Math.max(50, previous.needs.fun), social: Math.max(50, previous.needs.social) }
    : { energy: 80, hunger: 70, fun: 70, social: 60 };
  return {
    dayIndex,
    needs,
    gradePoints: 0,
    counters: emptyCounters(),
    greeted: [],
    goals: pickGoals(dayIndex, studentId).map((g) => ({ id: g.id, done: false })),
    coinsEarned: 0,
    moneySpent: 0,
    reportShown: false,
  };
}

export function newProfile(studentId: string, look: LifeProfile["look"], now = Date.now()): LifeProfile {
  return {
    v: 2,
    look,
    coins: STARTING_MONEY,
    savings: 0,
    ledger: [{ at: now, label: "Money from home to start school", amount: STARTING_MONEY }],
    xp: 0,
    owned: [],
    day: newDay(getSchoolTime(now).dayIndex, studentId),
  };
}

export function mood(needs: Needs): number {
  return Math.round(NEED_KEYS.reduce((sum, k) => sum + needs[k], 0) / NEED_KEYS.length);
}

/** Nigerian-style letter grades for the day's grade points. */
export function gradeLetter(points: number): string {
  if (points >= 70) return "A";
  if (points >= 50) return "B";
  if (points >= 40) return "C";
  if (points >= 30) return "D";
  if (points >= 15) return "E";
  return "F";
}

export function level(xp: number): number {
  return 1 + Math.floor(Math.sqrt(xp / 40));
}

/** Ends the day: parents pay a reward for a good grade, then the report card is shown. */
function closeDay(profile: LifeProfile, now: number): ReportCard {
  const day = profile.day;
  day.reportShown = true;
  const grade = gradeLetter(day.gradePoints);
  const bonus = day.gradePoints > 0 ? (GRADE_BONUS[grade] ?? 0) : 0;
  if (bonus > 0) earn(profile, bonus, `Reward from home for grade ${grade}`, now);
  return {
    dayIndex: day.dayIndex,
    grade,
    gradePoints: day.gradePoints,
    coinsEarned: day.coinsEarned,
    moneySpent: day.moneySpent,
    bonus,
    goalsDone: day.goals.filter((g) => g.done).length,
    goalsTotal: day.goals.length,
    mood: mood(day.needs),
  };
}

export function createSim(studentId: string, profile: LifeProfile, now = Date.now()): LifeSim {
  const sim: LifeSim = {
    studentId,
    // Spread arrivals along the corridor so names don't pile up.
    x: LIFE_SPAWN.x + Math.round((Math.random() - 0.5) * 360),
    y: LIFE_SPAWN.y + Math.round((Math.random() - 0.5) * 36),
    facing: "down",
    profile,
    activity: null,
    lastPeriodKey: null,
    lowWarned: [],
    helpCooldowns: {},
  };
  // A student returning on a later day starts that day fresh (no report for days they missed).
  const today = getSchoolTime(now).dayIndex;
  if (profile.day?.dayIndex !== today) startDay(sim, today, now);
  else repairDay(profile.day);
  return sim;
}

/** A new school day: fresh needs and goals, overnight interest on savings and pocket money. */
function startDay(sim: LifeSim, dayIndex: number, now: number): LifeEvent[] {
  const profile = sim.profile;
  const events: LifeEvent[] = [];
  const interest = interestFor(profile.savings);
  profile.day = newDay(dayIndex, sim.studentId, profile.day);
  if (interest > 0) {
    // Interest goes straight into savings.
    profile.savings += interest;
    record(profile, "Interest on savings", interest, now);
    events.push({ kind: "money_in", label: "Interest on your savings", amount: interest });
  }
  earn(profile, POCKET_MONEY, "Pocket money", now);
  events.push({ kind: "money_in", label: "Pocket money", amount: POCKET_MONEY });
  return events;
}

/** How many shifts are left today. */
export function shiftsLeft(day: DayState): number {
  return Math.max(0, MAX_SHIFTS_PER_DAY - (day.counters.shifts ?? 0));
}

/** What a job pays right now (more experience and more customers pay more). */
export function payFor(def: ActivityDef, sim: Pick<LifeSim, "profile">, classmatesAtSchool: number): number {
  if (!def.job) return 0;
  const extra = Math.min(def.job.maxExtra ?? 0, (def.job.perClassmate ?? 0) * classmatesAtSchool);
  return jobPay(def.job.basePay + extra, level(sim.profile.xp));
}

function bump(sim: LifeSim, counter: CounterKey, by = 1): void {
  sim.profile.day.counters[counter] += by;
}

/** Marks finished goals and pays their rewards. */
function checkGoals(sim: LifeSim): LifeEvent[] {
  const events: LifeEvent[] = [];
  const day = sim.profile.day;
  for (const g of day.goals) {
    if (g.done) continue;
    const def = getGoal(g.id);
    if (!def) continue;
    const progress = def.counter === "gradePoints" ? day.gradePoints : day.counters[def.counter];
    if (progress >= def.target) {
      g.done = true;
      earn(sim.profile, def.reward, `Goal: ${def.text}`);
      events.push({ kind: "goal_done", goalId: def.id, text: def.text, reward: def.reward });
    }
  }
  return events;
}

export function goalProgress(day: DayState, goalId: string): { value: number; target: number } {
  const def = getGoal(goalId);
  if (!def) return { value: 0, target: 1 };
  const value = def.counter === "gradePoints" ? day.gradePoints : day.counters[def.counter];
  return { value: Math.min(value, def.target), target: def.target };
}

function applyActivity(sim: LifeSim, def: ActivityDef, classmatesAtSchool: number, now: number): string {
  const day = sim.profile.day;
  // Happy students learn and grow faster.
  const boost = 0.6 + (0.4 * mood(day.needs)) / 100;
  const parts: string[] = [];
  for (const need of NEED_KEYS) {
    const delta = def.effects[need];
    if (!delta) continue;
    day.needs[need] = clamp(day.needs[need] + delta);
  }
  if (def.effects.grades) {
    const g = Math.round(def.effects.grades * boost);
    day.gradePoints = clamp(day.gradePoints + g);
    parts.push(`+${g} grades`);
  }
  if (def.effects.xp) {
    const xp = Math.round(def.effects.xp * boost);
    sim.profile.xp += xp;
    parts.push(`+${xp} XP`);
  }
  if (def.job) {
    const pay = payFor(def, sim, classmatesAtSchool);
    earn(sim.profile, pay, `Job: ${def.label}`, now);
    parts.unshift(`+${formatMoney(pay)}`);
  }
  if (def.counter) bump(sim, def.counter);
  return parts.join(" · ");
}

function periodAllows(def: ActivityDef, period: Period): boolean {
  return !def.periods || def.periods.includes(period.kind);
}

/** The activity spot the student is standing at, if any (closest first). */
export function nearestSpot(sim: Pick<LifeSim, "x" | "y">): Spot | null {
  let best: Spot | null = null;
  let bestScore = Infinity;
  for (const spot of lifeSpots) {
    const d = Math.hypot(sim.x - spot.x, sim.y - spot.y);
    if (d > spot.radius) continue;
    const score = d / spot.radius;
    if (score < bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  return best;
}

export type StartResult = { ok: true } | { ok: false; reason: string };

/** Why an activity can't start right now, or null if it can. */
export function activityBlocker(sim: LifeSim, def: ActivityDef, now = Date.now()): string | null {
  const period = getSchoolTime(now).period;
  if (period.kind === "home") return "School is over for today. See you tomorrow!";
  if (!periodAllows(def, period)) return def.closedMessage ?? "Not available right now.";
  if (def.cost > sim.profile.coins) return `You need ${formatMoney(def.cost)}`;
  if (def.job && shiftsLeft(sim.profile.day) === 0) return `You've worked ${MAX_SHIFTS_PER_DAY} shifts today. Time to rest and have fun!`;
  return null;
}

export function startActivity(sim: LifeSim, spotId: string, now = Date.now()): StartResult {
  const spot = lifeSpots.find((s) => s.id === spotId);
  const def = getActivity(spot?.activity);
  if (!spot || !def) return { ok: false, reason: "Nothing to do here." };
  if (Math.hypot(sim.x - spot.x, sim.y - spot.y) > spot.radius) return { ok: false, reason: "Walk closer first." };
  if (sim.activity) return { ok: false, reason: "You're already busy." };
  const blocker = activityBlocker(sim, def, now);
  if (blocker) return { ok: false, reason: blocker };
  spend(sim.profile, def.cost, def.label, now);
  sim.activity = { key: def.key, spotId, elapsedMs: 0, durationMs: def.durationSec * 1000 };
  return { ok: true };
}

export function cancelActivity(sim: LifeSim, reason: string, now = Date.now()): LifeEvent | null {
  const a = sim.activity;
  if (!a) return null;
  const def = getActivity(a.key);
  if (def) refund(sim.profile, def.cost, `Refund: ${def.label}`, now);
  sim.activity = null;
  return { kind: "activity_cancelled", key: a.key, reason };
}

/** Advances the student's life by dtMs. */
export function stepLife(
  sim: LifeSim,
  dtMs: number,
  now: number,
  input: MovementInput,
  classmates: Classmate[] = [],
): LifeEvent[] {
  const events: LifeEvent[] = [];
  const time = getSchoolTime(now);
  const profile = sim.profile;

  // New school day.
  if (profile.day.dayIndex !== time.dayIndex) {
    if (!profile.day.reportShown) events.push({ kind: "report_card", report: closeDay(profile, now) });
    if (sim.activity) cancelActivity(sim, "A new day has started.", now);
    events.push({ kind: "new_day", dayIndex: time.dayIndex });
    events.push(...startDay(sim, time.dayIndex, now));
  }
  const day = profile.day;

  if (sim.lastPeriodKey !== time.period.key) {
    if (sim.lastPeriodKey !== null) events.push({ kind: "period_changed", period: time.period });
    sim.lastPeriodKey = time.period.key;
  }

  // Needs drop slowly while at school.
  const seconds = dtMs / 1000;
  for (const need of NEED_KEYS) {
    day.needs[need] = clamp(day.needs[need] - NEED_DECAY_PER_SEC[need] * seconds);
    const warned = sim.lowWarned.includes(need);
    if (day.needs[need] < LOW_NEED && !warned) {
      sim.lowWarned.push(need);
      events.push({ kind: "need_low", need });
    } else if (day.needs[need] > LOW_NEED + 10 && warned) {
      sim.lowWarned = sim.lowWarned.filter((n) => n !== need);
    }
  }

  // Moving stops whatever you were doing.
  const len = Math.hypot(input.dx, input.dy);
  if (len > 0.05) {
    const cancelled = cancelActivity(sim, "You walked away.", now);
    if (cancelled) events.push(cancelled);
    const dx = input.dx / Math.max(1, len);
    const dy = input.dy / Math.max(1, len);
    const tired = day.needs.energy < LOW_NEED ? 0.7 : 1;
    const step = LIFE_SPEED * tired * seconds;
    const r = moveWithCollision(sim.x, sim.y, dx * step, dy * step, BODY_HALF, lifeGeometry);
    sim.x = r.x;
    sim.y = r.y;
    if (Math.abs(dx) >= Math.abs(dy)) sim.facing = dx > 0 ? "right" : "left";
    else sim.facing = dy > 0 ? "down" : "up";
  }

  // Activity progress.
  const a = sim.activity;
  if (a) {
    const def = getActivity(a.key);
    if (!def || !periodAllows(def, time.period) || time.period.kind === "home") {
      const cancelled = cancelActivity(sim, def?.closedMessage ?? "Time's up.", now);
      if (cancelled) events.push(cancelled);
    } else {
      a.elapsedMs += dtMs;
      if (a.elapsedMs >= a.durationMs) {
        sim.activity = null;
        const summary = applyActivity(sim, def, classmates.length, now);
        events.push({ kind: "activity_done", key: def.key, summary });
        if (def.key === "play_football") {
          const mates = classmates.filter(
            (c) => c.activity === "play_football" && Math.hypot(c.x - sim.x, c.y - sim.y) <= SOCIAL_RULES.footballTogether.range,
          );
          if (mates.length > 0) {
            day.needs.social = clamp(day.needs.social + Math.min(3, mates.length) * SOCIAL_RULES.footballTogether.social);
            bump(sim, "friendActs");
            events.push({ kind: "played_with", classmateIds: mates.map((m) => m.id) });
          }
        }
      }
    }
  }

  events.push(...checkGoals(sim));

  if (time.period.kind === "home" && !day.reportShown) {
    events.push({ kind: "report_card", report: closeDay(profile, now) });
  }
  return events;
}

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

export type SocialResult =
  | { ok: true; friendshipPoints: number; events: LifeEvent[] }
  | { ok: false; reason: string };

export function canHelp(sim: LifeSim, targetId: string, now = Date.now()): string | null {
  const zoneOk = nearestSpot(sim)?.activity === "study" || nearestSpot(sim)?.activity === "attend_lesson";
  if (!zoneOk) return "Go to the library or classroom to help with homework.";
  const until = sim.helpCooldowns[targetId] ?? 0;
  if (until > now) return `You helped recently. Try again in ${Math.ceil((until - now) / 1000)}s.`;
  return null;
}

/** Applies my side of a social action. The caller sends it to the classmate. */
export function sendSocial(sim: LifeSim, kind: SocialKind, targetId: string, now = Date.now()): SocialResult {
  const day = sim.profile.day;
  if (kind === "hi") {
    day.needs.social = clamp(day.needs.social + SOCIAL_RULES.hi.social);
    const first = !day.greeted.includes(targetId);
    if (first) {
      day.greeted.push(targetId);
      bump(sim, "greetings");
    }
    return { ok: true, friendshipPoints: first ? SOCIAL_RULES.hi.friendship : 0, events: checkGoals(sim) };
  }
  if (kind === "help") {
    const blocker = canHelp(sim, targetId, now);
    if (blocker) return { ok: false, reason: blocker };
    sim.helpCooldowns[targetId] = now + SOCIAL_RULES.help.cooldownMs;
    sim.profile.xp += SOCIAL_RULES.help.xp;
    bump(sim, "helped");
    bump(sim, "friendActs");
    return { ok: true, friendshipPoints: SOCIAL_RULES.help.friendship, events: checkGoals(sim) };
  }
  if (!spend(sim.profile, SOCIAL_RULES.share.cost, "Shared a snack", now)) {
    return { ok: false, reason: `Sharing costs ${formatMoney(SOCIAL_RULES.share.cost)}` };
  }
  bump(sim, "friendActs");
  return { ok: true, friendshipPoints: SOCIAL_RULES.share.friendship, events: checkGoals(sim) };
}

/** Applies what a classmate's action does to me. */
export function receiveSocial(sim: LifeSim, kind: SocialKind): LifeEvent[] {
  const day = sim.profile.day;
  if (kind === "hi") day.needs.social = clamp(day.needs.social + SOCIAL_RULES.hi.social);
  if (kind === "help") day.gradePoints = clamp(day.gradePoints + SOCIAL_RULES.help.theirGrades);
  if (kind === "share") day.needs.hunger = clamp(day.needs.hunger + SOCIAL_RULES.share.theirHunger);
  return checkGoals(sim);
}

// ---------------------------------------------------------------------------
// Wardrobe
// ---------------------------------------------------------------------------

export function buyOrWear(profile: LifeProfile, item: WardrobeItem, now = Date.now()): StartResult {
  if (!isOwned(item, profile.owned)) {
    if (!spend(profile, item.price, `Bought ${item.label.toLowerCase()} (${item.category === "extras" ? "extra" : item.category})`, now)) {
      return { ok: false, reason: `You need ${formatMoney(item.price)}` };
    }
    profile.owned.push(item.id);
  }
  profile.look = item.apply(profile.look);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Savings
// ---------------------------------------------------------------------------

/** Moves money between wallet and savings, counting towards the "save money" goal. */
export function moveSavings(sim: LifeSim, direction: "in" | "out", amount: number, now = Date.now()): StartResult & { events?: LifeEvent[] } {
  const result = direction === "in" ? deposit(sim.profile, amount, now) : withdraw(sim.profile, amount, now);
  if (!result.ok) return result;
  if (direction === "in") bump(sim, "saved");
  return { ok: true, events: checkGoals(sim) };
}
