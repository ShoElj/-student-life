import { ayo } from "./ayo";
import type { GameKind, GameRules } from "./rules";
import { ticTacToe } from "./tictactoe";

export * from "./rules";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const games: Record<GameKind, GameRules<any>> = { ttt: ticTacToe, ayo };
