import { beforeEach, describe, expect, it } from "vitest";
import { getLifeApi } from "../api";
import { receive, spend } from "../money";
import { newProfile } from "../sim";
import { randomStarterLook } from "../wardrobe";

// Demo mode keeps everything in localStorage; give the test a simple in-memory one.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
});

describe("sending money (demo mode, same rules as the database)", () => {
  it("delivers each transfer once and enforces the limits", async () => {
    const api = getLifeApi("local");
    const code = await api.createClass("Test School");
    const ada = await api.enter(code, "Ada", "1234");
    const bayo = await api.enter(code, "Bayo", "4321");

    await expect(api.sendMoney(ada.token, bayo.studentId, 20, "")).rejects.toThrow(/₦50/);
    await expect(api.sendMoney(ada.token, ada.studentId, 100, "")).rejects.toThrow();
    await api.sendMoney(ada.token, bayo.studentId, 500, "for lunch");
    await api.sendMoney(ada.token, bayo.studentId, 5000, "");
    await expect(api.sendMoney(ada.token, bayo.studentId, 5000, "")).rejects.toThrow(/₦10,000 a day/);

    const first = await api.claimMoney(bayo.token);
    expect(first.map((t) => t.amount)).toEqual([500, 5000]);
    expect(first[0]).toMatchObject({ fromName: "Ada", note: "for lunch" });
    expect(await api.claimMoney(bayo.token)).toEqual([]);
    expect(await api.claimMoney(ada.token)).toEqual([]);
  });

  it("moves money between wallets without counting it as earned", () => {
    const sender = newProfile("a", randomStarterLook());
    const receiver = newProfile("b", randomStarterLook());
    expect(spend(sender, 500, "Sent to Bayo")).toBe(true);
    receive(receiver, 500, "From Ada");
    expect(sender.coins).toBe(1000);
    expect(receiver.coins).toBe(2000);
    expect(receiver.day.coinsEarned).toBe(0);
    expect(receiver.ledger[0]).toMatchObject({ label: "From Ada", amount: 500 });
  });
});
