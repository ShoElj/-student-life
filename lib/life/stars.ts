/**
 * Star points: the main weekly leaderboard. Stars reward being a good all-round student (lessons,
 * goals, good grades, sport, games, kindness and coming back) rather than hoarding money, and
 * every Monday the board starts fresh so new players can still reach the top.
 */
import type { LifeEvent } from "./sim";
import type { LifeProfile } from "./types";

export const STAR_RULES = {
  lesson: 2,
  goal: 5,
  grade: { A: 10, B: 6, C: 3 } as Record<string, number>,
  sportWin: 3,
  gameWin: 2,
  friendAct: 2,
  streak: 3,
  caught: -2,
} as const;

/** The Monday (UTC) that starts this week, like "2026-09-28". */
export function weekKey(now: number): string {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

/** Stars earned this week (0 if the saved stars are from an earlier week). */
export function starsThisWeek(stats: { stars?: unknown; starsWeek?: unknown } | undefined | null, now: number): number {
  if (!stats || stats.starsWeek !== weekKey(now) || typeof stats.stars !== "number" || !Number.isFinite(stats.stars)) return 0;
  return Math.max(0, Math.floor(stats.stars));
}

/** Adds (or takes away) stars, starting a new count on a new week. Never goes below zero. */
export function addStars(profile: LifeProfile, amount: number, now: number): void {
  if (!amount) return;
  const stats = (profile.stats ??= { sportsWins: 0, gamesWins: 0 });
  const week = weekKey(now);
  const current = starsThisWeek(stats, now);
  stats.starsWeek = week;
  stats.stars = Math.max(0, current + amount);
}

/** Stars for things that happened in the sim (lessons, goals, report card, streak, getting caught). */
export function starsForEvent(e: LifeEvent, isLesson: (key: string) => boolean): number {
  switch (e.kind) {
    case "activity_done":
      return isLesson(e.key) ? STAR_RULES.lesson : 0;
    case "goal_done":
      return STAR_RULES.goal;
    case "report_card":
      return STAR_RULES.grade[e.report.grade] ?? 0;
    case "streak":
      return STAR_RULES.streak;
    case "caught":
      return STAR_RULES.caught;
    default:
      return 0;
  }
}
