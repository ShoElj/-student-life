import { create } from "zustand";
import type { Look } from "@/lib/game/art/students";
import type { PeriodKind } from "@/lib/life/clock";
import type { ChatMessage } from "@/lib/life/api";
import type { GameKind, Player } from "@/lib/life/games";
import type { SportKind } from "@/lib/life/sports";
import type { Streak, WeeklyEvent } from "@/lib/life/events";
import type { Home } from "@/lib/life/home";
import type { WorldKey } from "@/lib/life/worlds";
import type { Needs, ReportCard } from "@/lib/life/types";

export type LifeHud = {
  needs: Needs;
  mood: number;
  coins: number;
  savings: number;
  moneyEarned: number;
  moneySpent: number;
  shiftsLeft: number;
  ledger: { at: number; label: string; amount: number }[];
  jobs: { key: string; label: string; emoji: string; where: string; pay: number; open: boolean; hours: string }[];
  xp: number;
  level: number;
  gradePoints: number;
  grade: string;
  clockLabel: string;
  periodName: string;
  periodKind: PeriodKind;
  subject: string | null;
  secondsLeftInPeriod: number;
  goals: { id: string; text: string; value: number; target: number; done: boolean; reward: number }[];
  activity: { key: string; label: string; emoji: string; progress: number } | null;
  nearSpot: { id: string; label: string; emoji: string; durationSec: number; cost: number; pay: number; opens: SheetRequest | null; risky: boolean; blocker: string | null } | null;
  nearClassmate: { id: string; name: string } | null;
  onlineCount: number;
  world: WorldKey;
  event: WeeklyEvent | null;
  streak: Streak | null;
  home: Home | null;
  /** Seconds of detention left (0 when free). */
  detentionLeft: number;
  caughtToday: number;
};

export type RosterStats = { level: number; savings: number; sportsWins: number; roomValue: number };

export type RosterEntry = {
  id: string;
  name: string;
  look: Look | null;
  online: boolean;
  friendship: number;
  nearby: boolean;
  /** Where they are right now, if online. */
  world: WorldKey | null;
  home: Home | null;
  stats: RosterStats | null;
};

export type GameSession = {
  id: string;
  kind: GameKind;
  opponent: { kind: "computer" } | { kind: "classmate"; id: string; name: string };
  /** Which side I play: 0 moves first. */
  me: Player;
  moves: number[];
  status: "waiting" | "playing" | "over" | "cancelled";
  result?: "win" | "lose" | "draw";
  note?: string;
};

/** A screen the client asks the game UI to open. */
export type SheetRequest = "games" | "sports" | "shop" | "bank" | "home" | "furniture";

/** A sports match: both players play the same seeded challenge and compare scores. */
export type SportMatch = {
  id: string;
  kind: SportKind;
  seed: number;
  opponent: { kind: "computer" } | { kind: "classmate"; id: string; name: string };
  status: "waiting" | "ready" | "playing" | "finished" | "over" | "cancelled";
  myScore?: number;
  theirScore?: number;
  result?: "win" | "lose" | "draw";
  note?: string;
};

export type GameInvite = { id: string; kind: GameKind | SportKind; seed?: number; fromId: string; fromName: string; at: number };

export type LifeToast = { id: number; text: string; tone: "good" | "bad" | "info"; at: number };

type LifeStore = {
  status: "idle" | "loading" | "playing" | "signed_out";
  me: { id: string; name: string; classCode: string; className: string } | null;
  look: Look | null;
  owned: string[];
  hud: LifeHud | null;
  roster: RosterEntry[];
  toasts: LifeToast[];
  report: ReportCard | null;
  /** The daily streak card shown on arrival. */
  streakCard: { count: number; reward: number } | null;
  /** School chat and my private conversations, oldest first. */
  messages: ChatMessage[];
  /** Last message id read in each conversation ("school" or a classmate's id). */
  chatRead: Record<string, number>;
  /** Classmates whose messages I have hidden. */
  muted: string[];
  /** The conversation open on screen, if any (no pop-ups for it). */
  openThread: string | null;
  game: GameSession | null;
  match: SportMatch | null;
  /** Where the student is walking to by themselves (from the map), if anywhere. */
  walkingTo: string | null;
  /** The sport whose venue the student is at (for the sports sheet). */
  sportVenue: SportKind | null;
  invite: GameInvite | null;
  /** Asks the game screen to open a sheet (e.g. the games table was used). */
  sheetRequest: SheetRequest | null;
  patch: (partial: Partial<Omit<LifeStore, "patch" | "toast" | "reset">>) => void;
  toast: (text: string, tone?: LifeToast["tone"]) => void;
  reset: () => void;
};

let toastId = 0;

const initial = {
  status: "idle" as const,
  me: null,
  look: null,
  owned: [] as string[],
  hud: null,
  roster: [] as RosterEntry[],
  toasts: [] as LifeToast[],
  report: null,
  streakCard: null as { count: number; reward: number } | null,
  messages: [] as ChatMessage[],
  chatRead: {} as Record<string, number>,
  muted: [] as string[],
  openThread: null as string | null,
  game: null as GameSession | null,
  match: null as SportMatch | null,
  walkingTo: null as string | null,
  sportVenue: null as SportKind | null,
  invite: null as GameInvite | null,
  sheetRequest: null as SheetRequest | null,
};

export const useLifeStore = create<LifeStore>((set) => ({
  ...initial,
  patch: (partial) => set(partial),
  toast: (text, tone = "info") =>
    set((s) => ({ toasts: [...s.toasts, { id: ++toastId, text, tone, at: Date.now() }].slice(-4) })),
  reset: () => set({ ...initial }),
}));
