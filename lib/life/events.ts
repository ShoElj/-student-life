/**
 * Things that bring students back: a different treat on most days of the week, and a reward
 * for coming back every day (a streak). Both follow the student's real calendar.
 */
import type { LifeProfile } from "./types";

export type WeeklyEvent = {
  key: string;
  name: string;
  emoji: string;
  description: string;
  /** Activities with this tag cost half price. */
  halfPrice?: "market" | "bukka";
  /** Activities with this tag are free. */
  free?: "viewing";
  sportsXp?: number;
  jobPay?: number;
  pocketMoney?: number;
};

/** Indexed by `Date#getDay()` (0 = Sunday). */
const WEEK: (WeeklyEvent | null)[] = [
  { key: "family_sunday", name: "Family Sunday", emoji: "👨‍👩‍👧", description: "Double pocket money today.", pocketMoney: 2 },
  { key: "market_monday", name: "Market Monday", emoji: "🧺", description: "Half price at the market and Mama Put.", halfPrice: "market" },
  null,
  { key: "sports_wednesday", name: "Sports Wednesday", emoji: "🏅", description: "Double XP from every sports match.", sportsXp: 2 },
  { key: "treat_thursday", name: "Treat Thursday", emoji: "🍛", description: "Half price at Mama's Bukka.", halfPrice: "bukka" },
  { key: "movie_friday", name: "Movie Friday", emoji: "🎬", description: "Free entry at the Viewing Centre.", free: "viewing" },
  { key: "super_saturday", name: "Super Saturday", emoji: "💼", description: "Part-time jobs pay 50% more.", jobPay: 1.5 },
];

export function eventFor(now: number): WeeklyEvent | null {
  return WEEK[new Date(now).getDay()];
}

export function upcomingEvents(now: number, days = 7): { day: string; event: WeeklyEvent }[] {
  const out: { day: string; event: WeeklyEvent }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now + i * 86_400_000);
    const event = WEEK[d.getDay()];
    if (event) out.push({ day: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString([], { weekday: "long" }), event });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Daily streak
// ---------------------------------------------------------------------------

export type Streak = { count: number; lastDate: string; best: number };

/** The student's own calendar date, e.g. "2026-10-03". */
export function dateKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Reward for the n-th day in a row: grows to ₦1,400 a day, with a bonus every 7th day. */
export function streakReward(count: number): number {
  return 200 * Math.min(count, 7) + (count % 7 === 0 ? 1000 : 0);
}

/**
 * Updates the streak when a student comes back on a new calendar day. Returns the new count and
 * reward, or null if they already visited today.
 */
export function visit(profile: Pick<LifeProfile, "streak">, now: number): { count: number; reward: number } | null {
  const today = dateKey(now);
  const prev = profile.streak;
  if (prev?.lastDate === today) return null;
  const yesterday = dateKey(now - 86_400_000);
  const count = prev && prev.lastDate === yesterday ? prev.count + 1 : 1;
  profile.streak = { count, lastDate: today, best: Math.max(count, prev?.best ?? 0) };
  return { count, reward: streakReward(count) };
}
