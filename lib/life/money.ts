/**
 * Student money, in Naira. Students get pocket money each school day, earn more from part-time
 * jobs, daily goals and good report cards, keep some in savings (which earns interest overnight)
 * and spend it on food, treats for friends and clothes. Every change is written to a short
 * history so the wallet can show where the money went.
 */
import type { LedgerEntry, LifeProfile } from "./types";

export const CURRENCY = "₦";
export const STARTING_MONEY = 1500;
export const POCKET_MONEY = 1000;
/** Parents reward a good report card. */
export const GRADE_BONUS: Record<string, number> = { A: 1000, B: 500, C: 200 };
export const SAVINGS_INTEREST_RATE = 0.05;
export const MAX_DAILY_INTEREST = 500;
export const MAX_SHIFTS_PER_DAY = 4;
const LEDGER_SIZE = 25;

/** Saves from before the money update used coins; one coin is worth ₦50. */
export const PROFILE_VERSION = 2;
export const LEGACY_COIN_VALUE = 50;

/** "₦1,500" (and "-₦200"). Formatted by hand so every device shows the same thing. */
export function formatMoney(amount: number): string {
  const n = Math.round(Math.abs(amount));
  const digits = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0 ? "-" : ""}${CURRENCY}${digits}`;
}

/** Adds a line to the wallet history (newest first). */
export function record(profile: LifeProfile, label: string, amount: number, now: number): void {
  const entry: LedgerEntry = { at: now, label, amount };
  profile.ledger = [entry, ...(profile.ledger ?? [])].slice(0, LEDGER_SIZE);
}

/** Adds money to the wallet. Counts towards what was earned today. */
export function earn(profile: LifeProfile, amount: number, label: string, now = Date.now()): void {
  const value = Math.max(0, Math.round(amount));
  if (value === 0) return;
  profile.coins += value;
  profile.day.coinsEarned += value;
  record(profile, label, value, now);
}

/** Takes money from the wallet, or returns false if there isn't enough. */
export function spend(profile: LifeProfile, amount: number, label: string, now = Date.now()): boolean {
  const value = Math.max(0, Math.round(amount));
  if (value > profile.coins) return false;
  if (value === 0) return true;
  profile.coins -= value;
  profile.day.moneySpent += value;
  record(profile, label, -value, now);
  return true;
}

/** Money a classmate sent me: goes into the wallet, but isn't "earned". */
export function receive(profile: LifeProfile, amount: number, label: string, now = Date.now()): void {
  const value = Math.max(0, Math.round(amount));
  if (value === 0) return;
  profile.coins += value;
  record(profile, label, value, now);
}

/** Gives back money for something that didn't happen (e.g. walking away from the counter). */
export function refund(profile: LifeProfile, amount: number, label: string, now = Date.now()): void {
  const value = Math.max(0, Math.round(amount));
  if (value === 0) return;
  profile.coins += value;
  profile.day.moneySpent = Math.max(0, profile.day.moneySpent - value);
  record(profile, label, value, now);
}

export type MoneyResult = { ok: true } | { ok: false; reason: string };

export function deposit(profile: LifeProfile, amount: number, now = Date.now()): MoneyResult {
  const value = Math.floor(amount);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, reason: "Choose an amount to save." };
  if (value > profile.coins) return { ok: false, reason: `You only have ${formatMoney(profile.coins)} in your wallet.` };
  profile.coins -= value;
  profile.savings += value;
  record(profile, "Moved to savings", -value, now);
  return { ok: true };
}

export function withdraw(profile: LifeProfile, amount: number, now = Date.now()): MoneyResult {
  const value = Math.floor(amount);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, reason: "Choose an amount to take out." };
  if (value > profile.savings) return { ok: false, reason: `You only have ${formatMoney(profile.savings)} saved.` };
  profile.savings -= value;
  profile.coins += value;
  record(profile, "Taken from savings", value, now);
  return { ok: true };
}

/** Overnight interest on savings. */
export function interestFor(savings: number): number {
  return Math.min(MAX_DAILY_INTEREST, Math.floor(savings * SAVINGS_INTEREST_RATE));
}

/** Job pay grows with experience: +10% per level above 1, up to +50%. */
export function jobPay(basePay: number, playerLevel: number): number {
  const boost = Math.min(0.5, Math.max(0, playerLevel - 1) * 0.1);
  return Math.round((basePay * (1 + boost)) / 10) * 10;
}
