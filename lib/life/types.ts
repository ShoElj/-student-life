import type { Look } from "@/lib/game/art/students";
import type { Direction } from "@/lib/game/types";
import type { Streak } from "./events";
import type { Home } from "./home";
import type { WorldKey } from "./worlds";

export type NeedKey = "energy" | "hunger" | "fun" | "social";
export type Needs = Record<NeedKey, number>;

export type CounterKey =
  | "lessons"
  | "study"
  | "homeStudy"
  | "meals"
  | "snacks"
  | "football"
  | "greetings"
  | "helped"
  | "assembly"
  | "rest"
  | "friendActs"
  | "shifts"
  | "saved"
  | "games"
  | "sports"
  | "mischief"
  | "caught";

export type Counters = Record<CounterKey, number>;

export type GoalProgress = { id: string; done: boolean };

/** Everything about the current school day. Reset when a new day starts. */
export type DayState = {
  dayIndex: number;
  needs: Needs;
  gradePoints: number;
  counters: Counters;
  /** Classmates already greeted today (friendship from greetings counts once a day). */
  greeted: string[];
  goals: GoalProgress[];
  /** Money earned today (₦). */
  coinsEarned: number;
  moneySpent: number;
  reportShown: boolean;
};

/** One line of the wallet history: positive is money in, negative is money out. */
export type LedgerEntry = { at: number; label: string; amount: number };

/** What is saved for each student. */
export type LifeProfile = {
  /** Save format version (2 = money in Naira). */
  v?: number;
  look: Look;
  /** Money in the wallet, in Naira. */
  coins: number;
  savings: number;
  ledger: LedgerEntry[];
  xp: number;
  owned: string[];
  day: DayState;
  /** Where the student was when they last saved. */
  world?: WorldKey;
  home?: Home;
  streak?: Streak;
  stats?: { sportsWins: number; gamesWins: number; /** Star points this week (see stars.ts). */ stars?: number; starsWeek?: string };
};

export type ActivityState = { key: string; spotId: string; elapsedMs: number; durationMs: number; /** What was paid, refunded if cancelled. */ paid?: number };

/** A classmate seen through the realtime channel. */
export type Classmate = {
  id: string;
  name: string;
  look: Look;
  x: number;
  y: number;
  facing: Direction;
  activity: string | null;
  mood: number;
  lastSeen: number;
  world: WorldKey;
  /** Pet emoji following them around, if any. */
  pet: string | null;
};

export type ReportCard = {
  dayIndex: number;
  grade: string;
  gradePoints: number;
  coinsEarned: number;
  moneySpent: number;
  /** Reward from home for a good grade. */
  bonus: number;
  goalsDone: number;
  goalsTotal: number;
  mood: number;
  /** Behaviour grade from how often a prefect caught you breaking rules. */
  conduct: string;
  caught: number;
};

export type SocialKind = "hi" | "help" | "share";
