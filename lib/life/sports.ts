/**
 * Sports mini-games. Each match is a short skill challenge played on the student's own device;
 * two players get the same random seed (so the same keeper dives and the same ten-ten calls) and
 * compare scores at the end. Against the computer, its score is drawn from a fair range.
 */

export type SportKind = "football" | "basketball" | "race" | "tabletennis" | "tenten";

export type SportDef = {
  key: SportKind;
  name: string;
  emoji: string;
  /** Activity key used for the map spot and the badge other students see. */
  activity: string;
  where: string;
  blurb: string;
  howTo: string;
  /** How a score is shown. */
  unit: (score: number) => string;
  /** True when a lower score wins (race times). */
  lowerWins: boolean;
  /** What a match does to your needs. */
  effects: { fun: number; energy: number; social: number };
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const sports: Record<SportKind, SportDef> = {
  football: {
    key: "football",
    name: "Penalty shootout",
    emoji: "⚽",
    activity: "play_football",
    where: "Sports Field",
    blurb: "5 penalties. Beat the keeper!",
    howTo: "Pick a spot in the goal, then tap Shoot when the power bar is in the green. Too much power goes over the bar; too little is easy to save. Top corners are hard for the keeper to reach.",
    unit: (n) => plural(n, "goal"),
    lowerWins: false,
    effects: { fun: 20, energy: -12, social: 4 },
  },
  basketball: {
    key: "basketball",
    name: "Free throws",
    emoji: "🏀",
    activity: "play_basketball",
    where: "Basketball Court",
    blurb: "10 shots. Time your throw.",
    howTo: "Tap Throw when the marker is in the green zone. Each basket in a row makes the green zone a little smaller — keep your streak going!",
    unit: (n) => plural(n, "basket"),
    lowerWins: false,
    effects: { fun: 18, energy: -12, social: 4 },
  },
  race: {
    key: "race",
    name: "100 m sprint",
    emoji: "🏃",
    activity: "run_race",
    where: "Front Yard running track",
    blurb: "Left, right, left, right — fast!",
    howTo: "Tap LEFT and RIGHT one after the other (or press ← and →) to run. Tapping the same foot twice makes you stumble. Fastest time wins.",
    unit: (ms) => `${(ms / 1000).toFixed(2)} s`,
    lowerWins: true,
    effects: { fun: 14, energy: -14, social: 3 },
  },
  tabletennis: {
    key: "tabletennis",
    name: "Table tennis",
    emoji: "🏓",
    activity: "play_tabletennis",
    where: "Common Room",
    blurb: "Keep the rally going.",
    howTo: "Tap Hit when the ball reaches the yellow zone on your side. The ball gets faster with every hit. You have 3 balls — score is your total hits.",
    unit: (n) => plural(n, "hit"),
    lowerWins: false,
    effects: { fun: 16, energy: -6, social: 4 },
  },
  tenten: {
    key: "tenten",
    name: "Ten-ten",
    emoji: "👣",
    activity: "play_tenten",
    where: "Front Yard, near the gate",
    blurb: "Clap, jump, match the foot!",
    howTo: "On every clap your partner shows a foot. Tap the SAME foot before the next clap. The claps get faster — one wrong foot and you're out!",
    unit: (n) => plural(n, "point"),
    lowerWins: false,
    effects: { fun: 16, energy: -8, social: 6 },
  },
};

export const SPORT_KINDS = Object.keys(sports) as SportKind[];

export function isSportKind(v: unknown): v is SportKind {
  return typeof v === "string" && v in sports;
}

export function sportForActivity(activity: string | null | undefined): SportKind | null {
  return SPORT_KINDS.find((k) => sports[k].activity === activity) ?? null;
}

/** Energy needed to start a match. */
export const SPORT_MIN_ENERGY = 15;

/** Small seeded random generator (mulberry32), so both players get the same challenge. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Win, lose or draw for my score against theirs. */
export function compareScores(kind: SportKind, mine: number, theirs: number): "win" | "lose" | "draw" {
  if (mine === theirs) return "draw";
  const better = sports[kind].lowerWins ? mine < theirs : mine > theirs;
  return better ? "win" : "lose";
}

/** A fair computer score for a match. */
export function computerScore(kind: SportKind, random: () => number): number {
  const count = (tries: number, chance: number) => Array.from({ length: tries }, () => (random() < chance ? 1 : 0) as number).reduce((a, b) => a + b, 0);
  switch (kind) {
    case "football":
      return count(PENALTIES, 0.55);
    case "basketball":
      return count(FREE_THROWS, 0.55);
    case "race":
      return Math.round(8200 + random() * 3800);
    case "tabletennis":
      return 6 + Math.floor(random() * 14);
    case "tenten":
      return 8 + Math.floor(random() * 18);
  }
}

// ---------------------------------------------------------------------------
// Football: penalty shootout
// ---------------------------------------------------------------------------

export const PENALTIES = 5;
/** Goal targets: 3 columns × 2 rows (0–2 top row, 3–5 bottom row). */
export type PenaltyTarget = 0 | 1 | 2 | 3 | 4 | 5;
export const POWER_GOOD = { min: 0.35, max: 0.8 } as const;

export type ShotResult = "goal" | "saved" | "over" | "weak";

/** The keeper's dive for each penalty (column 0–2), the same for both players in a match. */
export function keeperDives(seed: number): number[] {
  const random = seededRandom(seed ^ 0x51ed);
  return Array.from({ length: PENALTIES }, () => Math.floor(random() * 3));
}

export function penaltyResult(target: PenaltyTarget, power: number, keeperColumn: number): ShotResult {
  if (power > POWER_GOOD.max) return "over";
  if (power < POWER_GOOD.min) return "weak";
  const column = target % 3;
  const top = target < 3;
  // A well-struck shot into a top corner beats a keeper diving the right way.
  const unstoppable = top && column !== 1 && power >= 0.6;
  return column === keeperColumn && !unstoppable ? "saved" : "goal";
}

// ---------------------------------------------------------------------------
// Basketball: free throws
// ---------------------------------------------------------------------------

export const FREE_THROWS = 10;

/** The green zone for a shot, centred on 0.5; it shrinks as the streak grows. */
export function throwZone(streak: number): { min: number; max: number } {
  const half = Math.max(0.06, 0.16 - streak * 0.02);
  return { min: 0.5 - half, max: 0.5 + half };
}

export function throwScores(marker: number, streak: number): boolean {
  const zone = throwZone(streak);
  return marker >= zone.min && marker <= zone.max;
}

/** Marker position (0–1, bouncing) for a time in ms. Faster as the shot number rises. */
export function bouncing(elapsedMs: number, periodMs: number): number {
  const t = (elapsedMs % periodMs) / periodMs;
  return t < 0.5 ? t * 2 : 2 - t * 2;
}

// ---------------------------------------------------------------------------
// Race: 100 m
// ---------------------------------------------------------------------------

export const RACE_METRES = 100;
export const METRES_PER_STRIDE = 2;

export type RaceState = { metres: number; lastFoot: "left" | "right" | null; stumbles: number };

export function raceStep(state: RaceState, foot: "left" | "right"): RaceState {
  if (state.metres >= RACE_METRES) return state;
  if (state.lastFoot === foot) return { ...state, stumbles: state.stumbles + 1, lastFoot: null };
  return { ...state, metres: Math.min(RACE_METRES, state.metres + METRES_PER_STRIDE), lastFoot: foot };
}

// ---------------------------------------------------------------------------
// Table tennis
// ---------------------------------------------------------------------------

export const TT_BALLS = 3;

/** How long the ball takes to cross the table for a given rally length (ms). */
export function crossingMs(hits: number): number {
  return Math.max(420, 1100 - hits * 60);
}

/** The hit zone near my end of the table (as a fraction of the crossing, 1 = my bat). */
export function hitZone(hits: number): { min: number; max: number } {
  const width = Math.max(0.1, 0.24 - hits * 0.012);
  return { min: 1 - width, max: 1.04 };
}

// ---------------------------------------------------------------------------
// Ten-ten
// ---------------------------------------------------------------------------

/** The feet called on each clap for a match: the same sequence for both players. */
export function tenTenCalls(seed: number, count = 80): ("left" | "right")[] {
  const random = seededRandom(seed ^ 0x7e7e);
  return Array.from({ length: count }, () => (random() < 0.5 ? "left" : "right"));
}

/** Time between claps (ms) for the n-th clap: starts slow, speeds up. */
export function clapInterval(n: number): number {
  return Math.max(430, 1100 - n * 22);
}
