"use client";

import { useState } from "react";
import { getLifeClient } from "@/lib/life/client";
import { streakReward, upcomingEvents } from "@/lib/life/events";
import { roomValue } from "@/lib/life/home";
import { formatMoney } from "@/lib/life/money";
import { level } from "@/lib/life/sim";
import { cn } from "@/lib/utils";
import { useLifeStore } from "@/store/lifeStore";
import { LookAvatar } from "./LookPreview";

type Board = "level" | "savings" | "sports" | "room";

const BOARDS: { key: Board; label: string; show: (v: number) => string }[] = [
  { key: "level", label: "⭐ Level", show: (v) => `Level ${v}` },
  { key: "savings", label: "🏦 Savings", show: (v) => formatMoney(v) },
  { key: "sports", label: "🏅 Sports wins", show: (v) => `${v} win${v === 1 ? "" : "s"}` },
  { key: "room", label: "🏠 Best room", show: (v) => formatMoney(v) },
];

/** Who's top of the school: level, savings, sports wins and the best room. */
export function LeaderboardSheet() {
  const [board, setBoard] = useState<Board>("level");
  const roster = useLifeStore((s) => s.roster);
  const hud = useLifeStore((s) => s.hud);
  const me = useLifeStore((s) => s.me);
  const client = getLifeClient();
  if (!hud || !me) return null;

  const mine = {
    level: level(hud.xp),
    savings: hud.savings,
    sports: client?.sim.profile.stats?.sportsWins ?? 0,
    room: roomValue(hud.home ?? undefined),
  };
  const rows = [
    { id: me.id, name: `${me.name} (you)`, look: useLifeStore.getState().look, value: mine[board], isMe: true },
    ...roster.map((r) => ({
      id: r.id,
      name: r.name,
      look: r.look,
      isMe: false,
      value: r.stats ? { level: r.stats.level, savings: r.stats.savings, sports: r.stats.sportsWins, room: r.stats.roomValue }[board] : 0,
    })),
  ].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const show = BOARDS.find((b) => b.key === board)!.show;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-ink/5 p-1 sm:grid-cols-4" role="tablist" aria-label="Leaderboards">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            type="button"
            role="tab"
            aria-selected={board === b.key}
            onClick={() => setBoard(b.key)}
            className={cn("min-h-10 rounded-xl text-sm font-bold", board === b.key ? "bg-white text-brand shadow" : "text-ink/60")}
          >
            {b.label}
          </button>
        ))}
      </div>
      <ol className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <li key={r.id} className={cn("flex items-center gap-3 rounded-2xl p-2", r.isMe ? "bg-sun/40" : "bg-ink/5")}>
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black", i === 0 ? "bg-sun text-ink" : i === 1 ? "bg-slate-300 text-ink" : i === 2 ? "bg-amber-600 text-white" : "bg-white text-ink/60")}>
              {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
            </span>
            <LookAvatar look={r.look} size={36} />
            <span className="min-w-0 flex-1 truncate text-base font-extrabold text-ink">{r.name}</span>
            <span className="shrink-0 text-sm font-black text-brand">{show(r.value)}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink/50">Classmates&apos; scores update when they save (every few seconds while they play).</p>
    </div>
  );
}

/** "Come back tomorrow" reward card, shown once a day on arrival. */
export function StreakCard() {
  const card = useLifeStore((s) => s.streakCard);
  if (!card) return null;
  const close = () => useLifeStore.getState().patch({ streakCard: null });
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="streak-title">
      <div className="animate-pop w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl">
        <p className="text-6xl" aria-hidden>
          {card.count > 1 ? "🔥" : "👋"}
        </p>
        <h2 id="streak-title" className="mt-1 text-2xl font-black text-brand">
          {card.count > 1 ? `${card.count}-day streak!` : "Daily bonus!"}
        </h2>
        <p className="text-base text-ink/70">
          {card.count > 1 ? "You've come back every day. Keep it going!" : "Come back tomorrow to start a streak — it pays more every day."}
        </p>
        <div className="my-4 flex justify-center gap-1" aria-label={`Day ${card.count} of 7`}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={cn("grid h-9 w-9 place-items-center rounded-full text-xs font-black", i < ((card.count - 1) % 7) + 1 ? "bg-sun text-ink" : "bg-ink/10 text-ink/40")}>
              {i === 6 ? "🎁" : i + 1}
            </span>
          ))}
        </div>
        <p className="mb-4 rounded-2xl bg-leaf/15 px-3 py-2 text-lg font-black text-leaf-dark">+{formatMoney(card.reward)}</p>
        <p className="mb-4 text-sm text-ink/60">Tomorrow: +{formatMoney(streakReward(card.count + 1))}</p>
        <button
          type="button"
          onClick={close}
          className="min-h-12 w-full rounded-2xl bg-brand text-lg font-bold text-white shadow-[0_4px_0_0_var(--color-brand-dark)]"
        >
          Let&apos;s go!
        </button>
      </div>
    </div>
  );
}

/** This week's special days. */
export function EventsList() {
  const [now] = useState(() => Date.now());
  const list = upcomingEvents(now);
  return (
    <ul className="flex flex-col gap-1.5">
      {list.map(({ day, event }) => (
        <li key={event.key} className={cn("flex items-center gap-3 rounded-2xl p-2.5", day === "Today" ? "bg-sun/40" : "bg-ink/5")}>
          <span className="text-2xl" aria-hidden>
            {event.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-ink">
              {event.name} <span className="font-bold text-ink/50">· {day}</span>
            </span>
            <span className="text-xs text-ink/70">{event.description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
