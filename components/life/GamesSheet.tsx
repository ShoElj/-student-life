"use client";

import { useState } from "react";
import type { AyoState } from "@/lib/life/games/ayo";
import { games, replay, type GameKind } from "@/lib/life/games";
import { winningLine, type TicTacToeState } from "@/lib/life/games/tictactoe";
import { getLifeClient } from "@/lib/life/client";
import { isSportKind, sports } from "@/lib/life/sports";
import { cn } from "@/lib/utils";
import { useLifeStore, type GameSession } from "@/store/lifeStore";
import { LookAvatar } from "./LookPreview";

const KINDS: GameKind[] = ["ttt", "ayo"];

function Picker() {
  const [kind, setKind] = useState<GameKind>("ttt");
  const roster = useLifeStore((s) => s.roster);
  const online = roster.filter((r) => r.online);
  const client = getLifeClient();
  const rules = games[kind];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Choose a game">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-2xl border-[3px] p-3 text-left active:scale-95",
              kind === k ? "border-brand bg-sky" : "border-ink/10 bg-white",
            )}
          >
            <span className="text-3xl" aria-hidden>
              {games[k].emoji}
            </span>
            <span className="text-lg font-black text-ink">{games[k].name}</span>
            <span className="text-sm text-ink/60">{games[k].blurb}</span>
          </button>
        ))}
      </div>
      <p className="rounded-2xl bg-ink/5 p-3 text-sm text-ink/75">
        <b className="text-ink">How to play: </b>
        {rules.howTo}
      </p>

      <p className="text-sm font-bold text-ink/60">Play against</p>
      <button
        type="button"
        onClick={() => client?.playComputer(kind)}
        className="flex min-h-14 items-center gap-3 rounded-2xl bg-brand px-4 text-left text-lg font-black text-white shadow-[0_4px_0_0_var(--color-brand-dark)] active:translate-y-0.5"
      >
        <span aria-hidden>🤖</span> The computer
      </button>
      {online.length === 0 ? (
        <p className="text-sm text-ink/60">No classmates at school right now — invite friends with your school code to play together.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {online.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-ink/5 p-2">
              <LookAvatar look={r.look} size={40} />
              <span className="min-w-0 flex-1 truncate text-base font-extrabold text-ink">{r.name}</span>
              <button
                type="button"
                onClick={() => client?.inviteToGame(kind, r.id)}
                className="min-h-11 rounded-xl bg-leaf px-4 text-sm font-black text-white active:scale-95"
              >
                Invite
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TicTacToeBoard({ state, game, myTurn }: { state: TicTacToeState; game: GameSession; myTurn: boolean }) {
  const line = winningLine(state);
  const mark = (p: 0 | 1 | null) => (p === null ? "" : p === 0 ? "❌" : "⭕");
  return (
    <div className="mx-auto grid w-full max-w-[18rem] grid-cols-3 gap-2" role="grid" aria-label="Tic-tac-toe board">
      {state.cells.map((c, i) => (
        <button
          key={i}
          type="button"
          role="gridcell"
          aria-label={c === null ? `Empty square ${i + 1}` : `Square ${i + 1}: ${c === game.me ? "yours" : "theirs"}`}
          disabled={!myTurn || c !== null || game.status !== "playing"}
          onClick={() => getLifeClient()?.playMove(i)}
          className={cn(
            "grid aspect-square place-items-center rounded-2xl text-4xl transition-colors",
            line?.includes(i) ? "bg-sun" : "bg-sky",
            myTurn && c === null && game.status === "playing" && "hover:bg-sun/50 active:scale-95",
          )}
        >
          {mark(c)}
        </button>
      ))}
    </div>
  );
}

function Pit({ seeds, mine, playable, onPlay, label }: { seeds: number; mine: boolean; playable: boolean; onPlay: () => void; label: string }) {
  return (
    <button
      type="button"
      disabled={!playable}
      onClick={onPlay}
      aria-label={label}
      className={cn(
        "relative grid aspect-square place-items-center rounded-full border-[3px] text-lg font-black shadow-inner",
        mine ? "border-amber-700/40 bg-amber-200" : "border-amber-900/30 bg-amber-300/70",
        playable ? "ring-4 ring-leaf/60 active:scale-95" : "opacity-95",
      )}
    >
      <span className="pointer-events-none flex flex-wrap items-center justify-center gap-[2px] p-1" aria-hidden>
        {seeds <= 8 ? Array.from({ length: seeds }, (_, i) => <span key={i} className="h-2 w-2 rounded-full bg-amber-900" />) : null}
      </span>
      <span className={cn("absolute text-ink", seeds <= 8 ? "-bottom-1 right-0 rounded-full bg-white px-1 text-xs" : "text-lg")}>{seeds}</span>
    </button>
  );
}

function AyoBoard({ state, game, myTurn }: { state: AyoState; game: GameSession; myTurn: boolean }) {
  const legal = myTurn && game.status === "playing" ? games.ayo.legalMoves(state) : [];
  // My row is at the bottom, sown left to right; theirs is on top, sown right to left.
  const mine = game.me === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
  const theirs = (game.me === 0 ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5]).reverse();
  const opponentName = game.opponent.kind === "computer" ? "Computer" : game.opponent.name;
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
      <div className="flex justify-between text-sm font-bold text-ink/70">
        <span>
          {opponentName}: <b className="text-ink">{state.stores[game.me === 0 ? 1 : 0]}</b> seeds
        </span>
        <span>
          You: <b className="text-leaf-dark">{state.stores[game.me]}</b> seeds
        </span>
      </div>
      <div className="rounded-3xl bg-amber-700 p-2.5 shadow-lg" role="group" aria-label="Ayọ board">
        <div className="grid grid-cols-6 gap-1.5">
          {theirs.map((i) => (
            <Pit key={i} seeds={state.pits[i]} mine={false} playable={false} onPlay={() => undefined} label={`${opponentName}'s pit: ${state.pits[i]} seeds`} />
          ))}
        </div>
        <div className="my-1.5 h-0.5 rounded bg-amber-900/40" />
        <div className="grid grid-cols-6 gap-1.5">
          {mine.map((i, n) => (
            <Pit
              key={i}
              seeds={state.pits[i]}
              mine
              playable={legal.includes(i)}
              onPlay={() => getLifeClient()?.playMove(i)}
              label={`Your pit ${n + 1}: ${state.pits[i]} seeds${legal.includes(i) ? ", tap to sow" : ""}`}
            />
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-ink/60">Your row is at the bottom. Seeds travel to the right, then along the top. First to 25 wins.</p>
    </div>
  );
}

function Playing({ game }: { game: GameSession }) {
  const client = getLifeClient();
  const rules = games[game.kind];
  const state = replay(rules, game.moves) ?? rules.init();
  const myTurn = rules.turn(state) === game.me;
  const opponentName = game.opponent.kind === "computer" ? "the computer" : game.opponent.name;

  let status: string;
  if (game.status === "waiting") status = `Waiting for ${opponentName} to accept…`;
  else if (game.status === "cancelled") status = game.note ?? "Game over.";
  else if (game.status === "over") status = game.result === "win" ? "🏆 You won!" : game.result === "draw" ? "🤝 It's a draw!" : `${opponentName} won. Good game!`;
  else status = myTurn ? "Your turn" : `${opponentName}'s turn…`;

  const again = () => {
    if (!client) return;
    if (game.opponent.kind === "computer") client.playComputer(game.kind);
    else client.inviteToGame(game.kind, game.opponent.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-black text-ink">
          {rules.emoji} {rules.name} <span className="text-sm font-bold text-ink/60">vs {opponentName}</span>
        </p>
        {game.kind === "ttt" && game.status !== "waiting" && <span className="text-sm font-bold text-ink/60">You are {game.me === 0 ? "❌" : "⭕"}</span>}
      </div>
      <p
        role="status"
        className={cn(
          "rounded-2xl px-3 py-2 text-center text-base font-black",
          game.status === "playing" && myTurn ? "bg-leaf text-white" : game.status === "over" && game.result === "win" ? "bg-sun text-ink" : "bg-ink/5 text-ink",
        )}
      >
        {status}
      </p>

      {game.status !== "waiting" &&
        (game.kind === "ttt" ? (
          <TicTacToeBoard state={state as TicTacToeState} game={game} myTurn={myTurn} />
        ) : (
          <AyoBoard state={state as AyoState} game={game} myTurn={myTurn} />
        ))}

      <div className="grid grid-cols-2 gap-2">
        {(game.status === "over" || game.status === "cancelled") && (
          <button type="button" onClick={again} className="min-h-12 rounded-2xl bg-leaf text-base font-black text-white active:scale-95">
            {game.opponent.kind === "computer" ? "Play again" : "Rematch"}
          </button>
        )}
        <button
          type="button"
          onClick={() => client?.leaveGame()}
          className={cn(
            "min-h-12 rounded-2xl bg-ink/5 text-base font-bold text-ink active:scale-95",
            game.status !== "over" && game.status !== "cancelled" && "col-span-2",
          )}
        >
          {game.status === "playing" || game.status === "waiting" ? "Leave game" : "Choose another game"}
        </button>
      </div>
    </div>
  );
}

/** The Common Room games table. */
export function GamesSheet() {
  const game = useLifeStore((s) => s.game);
  return game ? <Playing game={game} /> : <Picker />;
}

/** "X wants to play" card shown over the game. */
export function GameInviteCard() {
  const invite = useLifeStore((s) => s.invite);
  if (!invite) return null;
  const client = getLifeClient();
  return (
    <div className="absolute inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))+9.5rem)] z-40 flex justify-center px-4" role="alertdialog" aria-labelledby="invite-title">
      <div className="animate-pop w-full max-w-sm rounded-3xl border-[3px] border-white bg-sun p-4 text-center shadow-2xl">
        <p id="invite-title" className="text-lg font-black text-ink">
          {isSportKind(invite.kind) ? sports[invite.kind].emoji : "🎲"} {invite.fromName} wants to play{" "}
          {isSportKind(invite.kind) ? sports[invite.kind].name : games[invite.kind].name}!
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => client?.declineInvite()} className="min-h-12 rounded-2xl bg-white/70 text-base font-bold text-ink">
            No thanks
          </button>
          <button type="button" onClick={() => client?.acceptInvite()} className="min-h-12 rounded-2xl bg-brand text-base font-black text-white">
            Let&apos;s play
          </button>
        </div>
      </div>
    </div>
  );
}
