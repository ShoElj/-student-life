"use client";

import { useEffect } from "react";
import { getLifeClient } from "@/lib/life/client";
import { sports, type SportKind } from "@/lib/life/sports";
import { cn } from "@/lib/utils";
import { useLifeStore, type SportMatch } from "@/store/lifeStore";
import { LookAvatar } from "./LookPreview";
import { FreeThrows } from "./sports/FreeThrows";
import { Penalty } from "./sports/Penalty";
import { Race } from "./sports/Race";
import type { SportGameProps } from "./sports/shared";
import { TableTennis } from "./sports/TableTennis";
import { TenTen } from "./sports/TenTen";

const GAMES: Record<SportKind, (props: SportGameProps) => React.ReactNode> = {
  football: Penalty,
  basketball: FreeThrows,
  race: Race,
  tabletennis: TableTennis,
  tenten: TenTen,
};

/** Score a player gets for walking away mid-match. */
const forfeitScore = (kind: SportKind) => (sports[kind].lowerWins ? 99_999 : 0);

function Lobby({ kind }: { kind: SportKind }) {
  const roster = useLifeStore((s) => s.roster);
  const online = roster.filter((r) => r.online);
  const client = getLifeClient();
  const sport = sports[kind];
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-sky p-3">
        <p className="text-xl font-black text-brand">
          {sport.emoji} {sport.name}
        </p>
        <p className="mt-1 text-sm text-ink/75">{sport.howTo}</p>
      </div>
      <p className="text-sm font-bold text-ink/60">Play against</p>
      <button
        type="button"
        onClick={() => client?.playSportComputer(kind)}
        className="flex min-h-14 items-center gap-3 rounded-2xl bg-brand px-4 text-left text-lg font-black text-white shadow-[0_4px_0_0_var(--color-brand-dark)] active:translate-y-0.5"
      >
        <span aria-hidden>🤖</span> The computer
      </button>
      {online.length === 0 ? (
        <p className="text-sm text-ink/60">No classmates at school right now. Invite friends with your school code to play against them.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {online.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-ink/5 p-2">
              <LookAvatar look={r.look} size={40} />
              <span className="min-w-0 flex-1 truncate text-base font-extrabold text-ink">{r.name}</span>
              <button
                type="button"
                onClick={() => client?.inviteToSport(kind, r.id)}
                className="min-h-11 rounded-xl bg-leaf px-4 text-sm font-black text-white active:scale-95"
              >
                Challenge
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Results({ match }: { match: SportMatch }) {
  const client = getLifeClient();
  const sport = sports[match.kind];
  const them = match.opponent.kind === "computer" ? "Computer" : match.opponent.name;
  const again = () => {
    if (!client) return;
    if (match.opponent.kind === "computer") client.playSportComputer(match.kind);
    else client.inviteToSport(match.kind, match.opponent.id);
  };
  return (
    <div className="flex flex-col gap-3 text-center">
      <p className="text-5xl" aria-hidden>
        {match.result === "win" ? "🏆" : match.result === "draw" ? "🤝" : sport.emoji}
      </p>
      <p className="text-2xl font-black text-brand">{match.result === "win" ? "You won!" : match.result === "draw" ? "It's a draw!" : `${them} won this time`}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-2xl p-3", match.result === "win" ? "bg-sun" : "bg-ink/5")}>
          <p className="text-xs font-bold text-ink/60">You</p>
          <p className="text-xl font-black text-ink">{sport.unit(match.myScore ?? 0)}</p>
        </div>
        <div className={cn("rounded-2xl p-3", match.result === "lose" ? "bg-sun" : "bg-ink/5")}>
          <p className="text-xs font-bold text-ink/60">{them}</p>
          <p className="text-xl font-black text-ink">{sport.unit(match.theirScore ?? 0)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={again} className="min-h-12 rounded-2xl bg-leaf text-base font-black text-white active:scale-95">
          {match.opponent.kind === "computer" ? "Play again" : "Rematch"}
        </button>
        <button type="button" onClick={() => client?.leaveSport()} className="min-h-12 rounded-2xl bg-ink/5 text-base font-bold text-ink active:scale-95">
          Done
        </button>
      </div>
    </div>
  );
}

function MatchView({ match }: { match: SportMatch }) {
  const client = getLifeClient();
  const sport = sports[match.kind];
  const them = match.opponent.kind === "computer" ? "the computer" : match.opponent.name;
  const Game = GAMES[match.kind];

  if (match.status === "over") return <Results match={match} />;

  if (match.status === "cancelled" || match.status === "waiting") {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-4xl" aria-hidden>
          {sport.emoji}
        </p>
        <p role="status" className="text-lg font-black text-ink">
          {match.status === "waiting" ? `Waiting for ${them} to accept…` : (match.note ?? "Match over.")}
        </p>
        <button type="button" onClick={() => client?.leaveSport()} className="min-h-12 rounded-2xl bg-ink/5 text-base font-bold text-ink">
          {match.status === "waiting" ? "Cancel" : "Back"}
        </button>
      </div>
    );
  }

  if (match.status === "ready") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xl font-black text-brand">
          {sport.emoji} {sport.name} <span className="text-base font-bold text-ink/60">vs {them}</span>
        </p>
        <p className="rounded-2xl bg-sky p-3 text-sm text-ink/80">{sport.howTo}</p>
        {match.opponent.kind === "classmate" && <p className="text-sm text-ink/60">You both get the same challenge. Best score wins!</p>}
        <button
          type="button"
          onClick={() => client?.startSport()}
          className="min-h-14 rounded-2xl bg-leaf text-xl font-black text-white shadow-[0_4px_0_0_#15803d] active:translate-y-0.5"
        >
          Start!
        </button>
      </div>
    );
  }

  if (match.status === "finished") {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-4xl" aria-hidden>
          ⏳
        </p>
        <p role="status" className="text-lg font-black text-ink">
          You scored {sport.unit(match.myScore ?? 0)}. Waiting for {them} to finish…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="mb-2 text-sm font-bold text-ink/60">
        {sport.emoji} {sport.name} vs {them}
      </p>
      <Game key={match.id} seed={match.seed} ghostMs={match.opponent.kind === "computer" ? match.theirScore : undefined} onDone={(score) => client?.submitSportScore(score)} />
    </div>
  );
}

/** Sports venue: choose an opponent, play the mini-game, see who won. */
export function SportsSheet() {
  const match = useLifeStore((s) => s.match);
  const venue = useLifeStore((s) => s.sportVenue);

  // Closing the sheet in the middle of a match counts as giving up.
  useEffect(
    () => () => {
      const current = useLifeStore.getState().match;
      if (current?.status === "playing") getLifeClient()?.submitSportScore(forfeitScore(current.kind));
    },
    [],
  );

  if (match) return <MatchView match={match} />;
  if (!venue) return <p className="text-base text-ink/70">Walk to a sports venue to play.</p>;
  return <Lobby kind={venue} />;
}
