import { pickRandom, type GameRules, type Outcome, type Player } from "./rules";

/**
 * Ayọ (the Yoruba seed-sowing game, played here with the common "abapa" rules).
 *
 * 12 pits with 4 seeds each. Player 0 owns pits 0–5, player 1 owns pits 6–11; seeds are sown
 * one per pit in increasing order (wrapping round), skipping the starting pit. If the last seed
 * lands on the opponent's side and makes 2 or 3, those seeds are captured, along with the pits
 * just before it on that side that also hold 2 or 3. A move that would capture every one of the
 * opponent's seeds captures nothing. If the opponent's side is empty you must give them seeds
 * when you can. The game ends when someone has more than 24 seeds or a player cannot move; then
 * each player keeps the seeds on their own side.
 */
export type AyoState = { pits: number[]; stores: [number, number]; turn: Player; moves: number; over: boolean };

export const AYO_PITS = 12;
const SEEDS_PER_PIT = 4;
const TOTAL = AYO_PITS * SEEDS_PER_PIT;
/** Stops endless back-and-forth near the end of a game. */
const MAX_MOVES = 200;

export const ownsPit = (player: Player, pit: number) => (player === 0 ? pit < 6 : pit >= 6);
const sideTotal = (pits: number[], player: Player) => pits.reduce((sum, n, i) => (ownsPit(player, i) ? sum + n : sum), 0);
const other = (p: Player): Player => (p === 0 ? 1 : 0);

/** Sows from `pit` and captures. Does not check whose turn it is or the feeding rule. */
function sow(state: AyoState, pit: number): { pits: number[]; captured: number } {
  const pits = [...state.pits];
  let seeds = pits[pit];
  pits[pit] = 0;
  let i = pit;
  while (seeds > 0) {
    i = (i + 1) % AYO_PITS;
    if (i === pit) continue;
    pits[i] += 1;
    seeds -= 1;
  }
  const opponent = other(state.turn);
  let captured = 0;
  const after = [...pits];
  let j = i;
  while (ownsPit(opponent, j) && (after[j] === 2 || after[j] === 3)) {
    captured += after[j];
    after[j] = 0;
    j = (j - 1 + AYO_PITS) % AYO_PITS;
  }
  // Grand slam: taking everything the opponent has captures nothing.
  if (captured > 0 && sideTotal(after, opponent) === 0) return { pits, captured: 0 };
  return captured > 0 ? { pits: after, captured } : { pits, captured: 0 };
}

function legalMoves(state: AyoState): number[] {
  if (state.over) return [];
  const mine = state.pits.flatMap((n, i) => (n > 0 && ownsPit(state.turn, i) ? [i] : []));
  const opponent = other(state.turn);
  if (sideTotal(state.pits, opponent) > 0) return mine;
  // The opponent has nothing: you must give them seeds if you can.
  return mine.filter((m) => sideTotal(sow(state, m).pits, opponent) > 0);
}

function finish(state: AyoState): AyoState {
  const stores: [number, number] = [state.stores[0] + sideTotal(state.pits, 0), state.stores[1] + sideTotal(state.pits, 1)];
  return { ...state, pits: state.pits.map(() => 0), stores, over: true };
}

function apply(state: AyoState, move: number): AyoState | null {
  if (!legalMoves(state).includes(move)) return null;
  const { pits, captured } = sow(state, move);
  const stores: [number, number] = [...state.stores];
  stores[state.turn] += captured;
  let next: AyoState = { pits, stores, turn: other(state.turn), moves: state.moves + 1, over: false };
  if (stores[0] > TOTAL / 2 || stores[1] > TOTAL / 2 || next.moves >= MAX_MOVES || legalMoves(next).length === 0) {
    next = finish(next);
  }
  return next;
}

function outcome(state: AyoState): Outcome {
  if (!state.over) return null;
  if (state.stores[0] === state.stores[1]) return "draw";
  return state.stores[0] > state.stores[1] ? 0 : 1;
}

export const ayo: GameRules<AyoState> = {
  key: "ayo",
  name: "Ayọ",
  emoji: "🌰",
  blurb: "Sow seeds, capture twos and threes.",
  howTo:
    "Tap one of your pits to pick up its seeds and sow them one by one to the right, round the board. If your last seed lands in your opponent's row and makes 2 or 3, you capture them — plus any 2s and 3s just before it. Capture more than 24 seeds to win!",
  init: () => ({ pits: Array<number>(AYO_PITS).fill(SEEDS_PER_PIT), stores: [0, 0], turn: 0, moves: 0, over: false }),
  turn: (s) => s.turn,
  legalMoves,
  apply,
  outcome,
  computerMove(state, random) {
    const moves = legalMoves(state);
    if (random() < 0.15) return pickRandom(moves, random);
    const me = state.turn;
    // Look one reply ahead: what I capture now minus the most the opponent can take back.
    const scored = moves.map((m) => {
      const next = apply(state, m)!;
      const gain = next.stores[me] - state.stores[me];
      if (next.over) return { m, score: outcome(next) === me ? 1000 : gain };
      const replies = legalMoves(next).map((r) => {
        const after = apply(next, r)!;
        return after.stores[other(me)] - next.stores[other(me)];
      });
      return { m, score: gain - Math.max(0, ...replies) };
    });
    const best = Math.max(...scored.map((s) => s.score));
    return pickRandom(
      scored.filter((s) => s.score === best).map((s) => s.m),
      random,
    );
  },
};
