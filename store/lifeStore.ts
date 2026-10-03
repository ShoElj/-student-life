import { create } from "zustand";
import type { Look } from "@/lib/game/art/students";
import type { PeriodKind } from "@/lib/life/clock";
import type { ChatMessage } from "@/lib/life/api";
import type { GameKind, Player } from "@/lib/life/games";
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
  nearSpot: { id: string; label: string; emoji: string; durationSec: number; cost: number; pay: number; opensGames: boolean; blocker: string | null } | null;
  nearClassmate: { id: string; name: string } | null;
  onlineCount: number;
};

export type RosterEntry = { id: string; name: string; look: Look | null; online: boolean; friendship: number; nearby: boolean };

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

export type GameInvite = { id: string; kind: GameKind; fromId: string; fromName: string; at: number };

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
  /** School chat and my private conversations, oldest first. */
  messages: ChatMessage[];
  /** Last message id read in each conversation ("school" or a classmate's id). */
  chatRead: Record<string, number>;
  /** Classmates whose messages I have hidden. */
  muted: string[];
  /** The conversation open on screen, if any (no pop-ups for it). */
  openThread: string | null;
  game: GameSession | null;
  invite: GameInvite | null;
  /** Asks the game screen to open a sheet (e.g. the games table was used). */
  sheetRequest: "games" | null;
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
  messages: [] as ChatMessage[],
  chatRead: {} as Record<string, number>,
  muted: [] as string[],
  openThread: null as string | null,
  game: null as GameSession | null,
  invite: null as GameInvite | null,
  sheetRequest: null as "games" | null,
};

export const useLifeStore = create<LifeStore>((set) => ({
  ...initial,
  patch: (partial) => set(partial),
  toast: (text, tone = "info") =>
    set((s) => ({ toasts: [...s.toasts, { id: ++toastId, text, tone, at: Date.now() }].slice(-4) })),
  reset: () => set({ ...initial }),
}));
