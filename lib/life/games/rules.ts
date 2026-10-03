/**
 * Table games for the Common Room. Each game is a pure set of rules over a small state, with
 * moves as numbers, so both players' devices can apply the same moves and agree on the board
 * without a server.
 */
export type Player = 0 | 1;
export type Outcome = Player | "draw" | null;

export type GameRules<S> = {
  key: GameKind;
  name: string;
  emoji: string;
  blurb: string;
  howTo: string;
  init(): S;
  turn(state: S): Player;
  legalMoves(state: S): number[];
  /** Returns the next state, or null if the move is not allowed. */
  apply(state: S, move: number): S | null;
  outcome(state: S): Outcome;
  /** The computer's move. `random` returns a number in [0, 1). */
  computerMove(state: S, random: () => number): number;
};

export type GameKind = "ttt" | "ayo";

export function isGameKind(v: unknown): v is GameKind {
  return v === "ttt" || v === "ayo";
}

/** Replays a list of moves from the start; null if any move is not allowed. */
export function replay<S>(rules: GameRules<S>, moves: number[]): S | null {
  let state: S | null = rules.init();
  for (const m of moves) {
    state = rules.apply(state, m);
    if (!state) return null;
  }
  return state;
}

export function pickRandom<T>(items: T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}
