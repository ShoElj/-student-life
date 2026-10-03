"use client";

import { useState } from "react";
import { getLifeClient } from "@/lib/life/client";
import { formatMoney, interestFor, MAX_SHIFTS_PER_DAY, POCKET_MONEY, SAVINGS_INTEREST_RATE } from "@/lib/life/money";
import { cn } from "@/lib/utils";
import type { LifeHud } from "@/store/lifeStore";
import { SendMoney } from "./SendMoney";

const AMOUNTS = [200, 500, 1000];

function timeAgo(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

/** Wallet, savings, ways to earn and where the money went. */
export type WalletTab = "wallet" | "send" | "earn" | "history";

export function WalletSheet({ hud, initialTab = "wallet", sendTo }: { hud: LifeHud; initialTab?: WalletTab; sendTo?: string }) {
  const [tab, setTab] = useState<WalletTab>(initialTab);
  const [now] = useState(() => Date.now());
  const client = getLifeClient();
  const atBank = hud.nearSpot?.opens === "bank";

  const moveButton = (direction: "in" | "out", amount: number, label: string, available: number) => (
    <button
      key={`${direction}-${label}`}
      type="button"
      disabled={!atBank || amount <= 0 || amount > available}
      onClick={() => client?.savings(direction, amount)}
      className={cn(
        "min-h-11 rounded-xl px-2 text-sm font-bold active:scale-95 disabled:opacity-40",
        direction === "in" ? "bg-leaf/15 text-leaf-dark" : "bg-sun/40 text-ink",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-brand p-3 text-white">
          <p className="text-xs font-bold text-white/70">👛 Wallet</p>
          <p className="text-2xl font-black tabular-nums">{formatMoney(hud.coins)}</p>
        </div>
        <div className="rounded-2xl bg-leaf p-3 text-white">
          <p className="text-xs font-bold text-white/80">🏦 Savings</p>
          <p className="text-2xl font-black tabular-nums">{formatMoney(hud.savings)}</p>
        </div>
      </div>
      <p className="-mt-1 text-center text-sm font-bold text-ink/60">
        Today: <span className="text-leaf-dark">+{formatMoney(hud.moneyEarned)} earned</span> ·{" "}
        <span className="text-danger">{formatMoney(hud.moneySpent)} spent</span>
      </p>

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-ink/5 p-1" role="tablist" aria-label="Wallet sections">
        {(
          [
            ["wallet", "🏦 Save"],
            ["send", "💸 Send"],
            ["earn", "💼 Earn"],
            ["history", "🧾 History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("min-h-10 rounded-xl text-sm font-bold", tab === key ? "bg-white text-brand shadow" : "text-ink/60")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "wallet" && (
        <div className="flex flex-col gap-3">
          {!atBank && (
            <p className="rounded-2xl bg-sun/30 px-3 py-2 text-sm font-bold text-ink/80">
              🏦 Walk to the School Bank (south corridor) to put money in or take it out.
            </p>
          )}
          <p className="text-sm text-ink/70">
            Money in savings is safe and grows by <b>{Math.round(SAVINGS_INTEREST_RATE * 100)}% every night</b>
            {hud.savings > 0 && <> (tomorrow: +{formatMoney(interestFor(hud.savings))})</>}. You can take it out any time.
          </p>
          <div>
            <p className="mb-1 text-xs font-bold text-ink/60">Put in savings</p>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((a) => moveButton("in", a, formatMoney(a), hud.coins))}
              {moveButton("in", hud.coins, "All", hud.coins)}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-ink/60">Take out</p>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((a) => moveButton("out", a, formatMoney(a), hud.savings))}
              {moveButton("out", hud.savings, "All", hud.savings)}
            </div>
          </div>
        </div>
      )}

      {tab === "send" && <SendMoney initialTo={sendTo} />}

      {tab === "earn" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink/70">
            Walk to a job and press the button to work a shift. You can work <b>{MAX_SHIFTS_PER_DAY} shifts a day</b>{" "}
            ({hud.shiftsLeft} left today). Pay goes up as your level rises.
          </p>
          <ul className="flex flex-col gap-2">
            {hud.jobs.map((j) => (
              <li key={j.key} className="flex items-center gap-3 rounded-2xl bg-ink/5 p-2.5">
                <span className="text-2xl" aria-hidden>
                  {j.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-ink">{j.label}</p>
                  <p className="text-xs text-ink/60">
                    📍 {j.where} · {j.open ? <span className="font-bold text-leaf-dark">open now</span> : j.hours}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-leaf/15 px-2 py-1 text-sm font-black text-leaf-dark">{formatMoney(j.pay)}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-sky p-3 text-sm text-ink/80">
            <p className="mb-1 font-bold text-ink">Other ways to get money</p>
            <ul className="list-inside list-disc">
              <li>Pocket money every morning: {formatMoney(POCKET_MONEY)}</li>
              <li>Finish your daily goals</li>
              <li>Good report card: reward from home (A {formatMoney(1000)}, B {formatMoney(500)}, C {formatMoney(200)})</li>
              <li>Interest on your savings every night</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "history" &&
        (hud.ledger.length === 0 ? (
          <p className="text-base text-ink/70">Nothing yet. Your spending and earnings will show here.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink/10 rounded-2xl bg-ink/5 px-3">
            {hud.ledger.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{e.label}</p>
                  <p className="text-xs text-ink/50">{timeAgo(e.at, now)}</p>
                </div>
                <span className={cn("shrink-0 text-base font-black tabular-nums", e.amount >= 0 ? "text-leaf-dark" : "text-danger")}>
                  {e.amount >= 0 ? "+" : ""}
                  {formatMoney(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
