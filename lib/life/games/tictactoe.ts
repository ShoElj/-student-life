import { pickRandom, type GameRules, type Outcome, type Player } from "./rules";

/** Cells 0–8, left to right, top to bottom. Player 0 is X and always starts. */
export type TicTacToeState = { cells: (Player | null)[]; turn: Player };

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function winningLine(state: TicTacToeState): number[] | null {
  return LINES.find(([a, b, c]) => state.cells[a] !== null && state.cells[a] === state.cells[b] && state.cells[a] === state.cells[c]) ?? null;
}

function outcome(state: TicTacToeState): Outcome {
  const line = winningLine(state);
  if (line) return state.cells[line[0]];
  return state.cells.every((c) => c !== null) ? "draw" : null;
}

function legalMoves(state: TicTacToeState): number[] {
  if (outcome(state) !== null) return [];
  return state.cells.flatMap((c, i) => (c === null ? [i] : []));
}

function apply(state: TicTacToeState, move: number): TicTacToeState | null {
  if (!legalMoves(state).includes(move)) return null;
  const cells = [...state.cells];
  cells[move] = state.turn;
  return { cells, turn: state.turn === 0 ? 1 : 0 };
}

/** Score from `me`'s point of view: +10 win, −10 loss, 0 draw (faster wins score higher). */
function minimax(state: TicTacToeState, me: Player, depth: number): number {
  const o = outcome(state);
  if (o === me) return 10 - depth;
  if (o === "draw") return 0;
  if (o !== null) return depth - 10;
  const scores = legalMoves(state).map((m) => minimax(apply(state, m)!, me, depth + 1));
  return state.turn === me ? Math.max(...scores) : Math.min(...scores);
}

export const ticTacToe: GameRules<TicTacToeState> = {
  key: "ttt",
  name: "Tic-tac-toe",
  emoji: "❌",
  blurb: "Get three in a row.",
  howTo: "Take turns putting your mark in an empty square. The first to get three in a row — across, down or diagonally — wins.",
  init: () => ({ cells: Array<Player | null>(9).fill(null), turn: 0 }),
  turn: (s) => s.turn,
  legalMoves,
  apply,
  outcome,
  computerMove(state, random) {
    const moves = legalMoves(state);
    // The computer plays well, but now and then makes a friendly mistake.
    if (random() < 0.2) return pickRandom(moves, random);
    const me = state.turn;
    const scored = moves.map((m) => ({ m, score: minimax(apply(state, m)!, me, 1) }));
    const best = Math.max(...scored.map((s) => s.score));
    return pickRandom(
      scored.filter((s) => s.score === best).map((s) => s.m),
      random,
    );
  },
};
