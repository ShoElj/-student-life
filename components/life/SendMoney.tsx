"use client";

import { useState, type FormEvent } from "react";
import { TRANSFER_LIMITS } from "@/lib/life/api";
import { getLifeClient } from "@/lib/life/client";
import { formatMoney } from "@/lib/life/money";
import { cn } from "@/lib/utils";
import { useLifeStore } from "@/store/lifeStore";
import { LookAvatar } from "./LookPreview";

const QUICK = [100, 200, 500, 1000];

/** Send money from my wallet to a classmate. */
export function SendMoney({ initialTo }: { initialTo?: string }) {
  const roster = useLifeStore((s) => s.roster);
  const coins = useLifeStore((s) => s.hud?.coins ?? 0);
  const [to, setTo] = useState<string | null>(initialTo ?? null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const person = roster.find((r) => r.id === to);
  const value = Number(amount);
  const valid = Number.isInteger(value) && value >= TRANSFER_LIMITS.min && value <= TRANSFER_LIMITS.max && value <= coins;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!to || !valid || sending) return;
    setSending(true);
    const ok = await getLifeClient()?.sendMoney(to, value, note);
    setSending(false);
    if (ok) {
      setAmount("");
      setNote("");
    }
  }

  if (!person) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink/70">Who do you want to send money to? It arrives straight away if they&apos;re at school, or next time they come in.</p>
        {roster.length === 0 ? (
          <p className="rounded-2xl bg-ink/5 p-3 text-sm text-ink/60">No classmates yet. Share your school code so friends can join!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roster.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setTo(r.id)} className="flex w-full items-center gap-3 rounded-2xl bg-ink/5 p-2 text-left active:bg-sun/30">
                  <LookAvatar look={r.look} size={40} />
                  <span className="min-w-0 flex-1 truncate text-base font-extrabold text-ink">
                    <span className={cn("mr-1.5 inline-block h-2.5 w-2.5 rounded-full", r.online ? "bg-leaf" : "bg-ink/25")} aria-hidden />
                    {r.name}
                  </span>
                  <span className="text-sm font-bold text-brand">Choose →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex items-center gap-3 rounded-2xl bg-sky p-2.5">
        <LookAvatar look={person.look} size={44} />
        <p className="min-w-0 flex-1 truncate text-lg font-black text-ink">To {person.name}</p>
        <button type="button" onClick={() => setTo(null)} className="min-h-10 rounded-xl bg-white px-3 text-sm font-bold text-brand">
          Change
        </button>
      </div>

      <div>
        <label htmlFor="send-amount" className="mb-1 block text-xs font-bold text-ink/60">
          How much? (you have {formatMoney(coins)})
        </label>
        <div className="mb-2 grid grid-cols-4 gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={q > coins}
              onClick={() => setAmount(String(q))}
              className={cn("min-h-11 rounded-xl text-sm font-bold disabled:opacity-40", amount === String(q) ? "bg-brand text-white" : "bg-leaf/15 text-leaf-dark")}
            >
              {formatMoney(q)}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-2xl border-2 border-ink/15 bg-white px-3 focus-within:border-brand">
          <span className="text-lg font-black text-ink/60">₦</span>
          <input
            id="send-amount"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Other amount"
            className="min-h-12 w-full bg-transparent px-2 text-lg font-bold text-ink outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-ink/50">
          {formatMoney(TRANSFER_LIMITS.min)}–{formatMoney(TRANSFER_LIMITS.max)} at a time, up to {formatMoney(TRANSFER_LIMITS.perDay)} a day.
        </p>
      </div>

      <div>
        <label htmlFor="send-note" className="mb-1 block text-xs font-bold text-ink/60">
          Note (optional)
        </label>
        <input
          id="send-note"
          maxLength={TRANSFER_LIMITS.noteLength}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. for lunch 🍛"
          className="min-h-12 w-full rounded-2xl border-2 border-ink/15 bg-white px-3 text-base text-ink outline-none focus:border-brand"
        />
      </div>

      <button
        type="submit"
        disabled={!valid || sending}
        className="min-h-14 rounded-2xl bg-leaf text-lg font-black text-white shadow-[0_4px_0_0_#15803d] active:translate-y-0.5 disabled:opacity-40"
      >
        {sending ? "Sending…" : valid ? `Send ${formatMoney(value)} 💸` : value > coins ? "Not enough in your wallet" : "Send money 💸"}
      </button>
    </form>
  );
}
