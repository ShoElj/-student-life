import { describe, expect, it } from "vitest";
import { ayo, type AyoState } from "../ayo";
import { games, replay } from "../index";
import { ticTacToe, winningLine } from "../tictactoe";

/** Small deterministic random generator so the tests always play the same games. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("tic-tac-toe", () => {
  it("detects a win and rejects moves on taken squares", () => {
    const s = replay(ticTacToe, [0, 3, 1, 4, 2])!;
    expect(winningLine(s)).toEqual([0, 1, 2]);
    expect(ticTacToe.outcome(s)).toBe(0);
    expect(ticTacToe.legalMoves(s)).toEqual([]);
    expect(ticTacToe.apply(ticTacToe.init(), 9)).toBeNull();
    expect(replay(ticTacToe, [4, 4])).toBeNull();
  });

  it("the computer takes a win and blocks a loss when it plays its best", () => {
    const noMistakes = () => 0.99;
    // O (player 1) can win at 5.
    expect(ticTacToe.computerMove(replay(ticTacToe, [0, 3, 1, 4, 8])!, noMistakes)).toBe(5);
    // O must block X at 2.
    expect(ticTacToe.computerMove(replay(ticTacToe, [0, 4, 1])!, noMistakes)).toBe(2);
  });

  it("perfect play is a draw", () => {
    let s = ticTacToe.init();
    const best = () => 0.99;
    while (ticTacToe.outcome(s) === null) s = ticTacToe.apply(s, ticTacToe.computerMove(s, best))!;
    expect(ticTacToe.outcome(s)).toBe("draw");
  });
});

describe("ayọ", () => {
  const total = (s: AyoState) => s.pits.reduce((a, b) => a + b, 0) + s.stores[0] + s.stores[1];

  it("starts with 48 seeds and only lets you play your own pits", () => {
    const s = ayo.init();
    expect(total(s)).toBe(48);
    expect(ayo.legalMoves(s)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ayo.apply(s, 7)).toBeNull();
    const next = ayo.apply(s, 5)!;
    expect(next.pits.slice(5, 10)).toEqual([0, 5, 5, 5, 5]);
    expect(next.turn).toBe(1);
  });

  it("captures twos and threes on the opponent's side, chaining backwards", () => {
    const s: AyoState = { pits: [0, 0, 0, 0, 0, 2, 1, 2, 1, 0, 0, 3], stores: [0, 0], turn: 0, moves: 0, over: false };
    // Pit 5 has 2 seeds: they land in 6 (→2) and 7 (→3). Both are captured.
    const next = ayo.apply(s, 5)!;
    expect(next.stores[0]).toBe(5);
    expect(next.pits[6]).toBe(0);
    expect(next.pits[7]).toBe(0);
    expect(total(next)).toBe(total(s));
  });

  it("does not capture everything the opponent has (grand slam)", () => {
    const s: AyoState = { pits: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0], stores: [20, 26 - 1], turn: 0, moves: 0, over: false };
    const next = ayo.apply(s, 5)!;
    expect(next.stores[0]).toBe(20);
  });

  it("must feed an opponent with no seeds", () => {
    const s: AyoState = { pits: [3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0], stores: [20, 24], turn: 0, moves: 0, over: false };
    expect(ayo.legalMoves(s)).toEqual([5]);
  });

  it("computer games always finish and keep every seed", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const random = seeded(seed);
      let s = ayo.init();
      let moves = 0;
      while (ayo.outcome(s) === null) {
        s = ayo.apply(s, ayo.computerMove(s, random))!;
        expect(s).not.toBeNull();
        expect(total(s)).toBe(48);
        moves++;
        expect(moves).toBeLessThanOrEqual(200);
      }
      expect(s.stores[0] + s.stores[1]).toBe(48);
    }
  });

  it("is registered with the other games", () => {
    expect(Object.keys(games)).toEqual(["ttt", "ayo"]);
  });
});
