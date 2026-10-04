import { describe, expect, it } from "vitest";
import { activities } from "../activities";
import { buyFurniture, buyHouse, getHouse, houses, nextHouse, roomValue, sanitizeHome, slotUnlocked, studyBonus } from "../home";
import { mealKey, restaurants, searchRestaurants } from "../restaurants";
import { createSim, newProfile, orderMeal, startActivity, stepLife, travel } from "../sim";
import { randomStarterLook } from "../wardrobe";
import { findSpot } from "../worlds";

// A Wednesday (not Treat Thursday, so full prices). The town is open at any time.
const NOW = Date.UTC(2026, 9, 7, 9, 0, 30);
const still = { dx: 0, dy: 0 };

function townSim(coins = 50_000) {
  const sim = createSim("me", newProfile("me", randomStarterLook(() => 0.3), NOW), NOW);
  sim.pending = [];
  travel(sim, "town");
  sim.profile.coins = coins;
  return sim;
}

function standAt(sim: ReturnType<typeof townSim>, spotId: string) {
  const spot = findSpot("town", spotId)!;
  sim.x = spot.x;
  sim.y = spot.y;
}

describe("homes", () => {
  it("climbs the ladder in order, needing the level and the money", () => {
    const p = townSim(200_000).profile;
    expect(buyHouse(p, "miniflat", 10, NOW)).toMatchObject({ ok: false });
    expect(buyHouse(p, "selfcon", 1, NOW)).toMatchObject({ ok: false, reason: expect.stringContaining("level 2") });
    expect(buyHouse(p, "selfcon", 2, NOW)).toEqual({ ok: true });
    expect(getHouse(p.home?.house).key).toBe("selfcon");
    expect(p.coins).toBe(190_000);
    expect(nextHouse(p.home)?.key).toBe("miniflat");
    p.coins = 100;
    expect(buyHouse(p, "miniflat", 10, NOW)).toMatchObject({ ok: false, reason: expect.stringContaining("costs") });
  });

  it("bigger homes unlock new places to furnish", () => {
    const p = townSim().profile;
    expect(slotUnlocked(p.home, "kitchen")).toBe(false);
    expect(buyFurniture(p, "kitchen_stove", NOW)).toMatchObject({ ok: false });
    buyHouse(p, "selfcon", 2, NOW);
    expect(buyFurniture(p, "kitchen_stove", NOW)).toEqual({ ok: true });
    expect(slotUnlocked(p.home, "pool")).toBe(false);
  });

  it("home value includes the house, and saves keep the house", () => {
    const p = townSim().profile;
    const before = roomValue(p.home);
    buyHouse(p, "selfcon", 2, NOW);
    expect(roomValue(p.home)).toBe(before + houses[1].price);
    expect(sanitizeHome(JSON.parse(JSON.stringify(p.home)))?.house).toBe("selfcon");
    expect(sanitizeHome({ house: "palace", items: {}, owned: [] })?.house).toBeUndefined();
  });

  it("studying at home needs a desk, gets better with the home, and is limited per day", () => {
    const sim = townSim();
    standAt(sim, "study_home");
    expect(startActivity(sim, "study_home", NOW)).toMatchObject({ ok: false, reason: expect.stringContaining("desk") });
    buyFurniture(sim.profile, "desk_basic", NOW);
    const base = studyBonus(sim.profile.home);
    buyFurniture(sim.profile, "lamp_desk", NOW);
    expect(studyBonus(sim.profile.home)).toBeCloseTo(base + 0.1);
    let t = NOW;
    for (let i = 0; i < 3; i++) {
      expect(startActivity(sim, "study_home", t)).toEqual({ ok: true });
      for (let k = 0; k < 14; k++) stepLife(sim, 1000, (t += 1000), still);
    }
    expect(sim.profile.day.counters.homeStudy).toBe(3);
    expect(startActivity(sim, "study_home", t)).toMatchObject({ ok: false, reason: expect.stringContaining("enough") });
  });

  it("sleeps better in a bigger home", () => {
    const sim = townSim(200_000);
    buyHouse(sim.profile, "selfcon", 2, NOW);
    buyHouse(sim.profile, "miniflat", 4, NOW);
    standAt(sim, "sleep_home");
    sim.profile.day.needs.energy = 10;
    let t = NOW;
    expect(startActivity(sim, "sleep_home", t)).toEqual({ ok: true });
    for (let k = 0; k < 20; k++) stepLife(sim, 1000, (t += 1000), still);
    // 10 + 62 for a mini flat, minus a little for 20 seconds of tiredness.
    expect(sim.profile.day.needs.energy).toBeGreaterThan(65);
  });
});

describe("food court", () => {
  it("has every restaurant's dishes on the menu", () => {
    expect(restaurants.length).toBeGreaterThanOrEqual(9);
    for (const r of restaurants) for (const d of r.dishes) expect(activities[mealKey(r.id, d.id)]?.cost).toBe(d.price);
  });

  it("searches by restaurant or dish", () => {
    expect(searchRestaurants("suya").map((r) => r.id)).toEqual(["bukka_hut"]);
    expect(searchRestaurants("chicken republic").map((r) => r.id)).toEqual(["chicken_republic"]);
    expect(searchRestaurants("jollof").length).toBeGreaterThanOrEqual(3);
    expect(searchRestaurants("").length).toBe(restaurants.length);
  });

  it("orders, pays and eats at the Food Court", () => {
    const sim = townSim(2000);
    const key = mealKey("chicken_republic", "refuel");
    expect(orderMeal(sim, key, NOW)).toMatchObject({ ok: false, reason: expect.stringContaining("Food Court") });
    standAt(sim, "food_court");
    sim.profile.day.needs.hunger = 20;
    expect(orderMeal(sim, key, NOW)).toEqual({ ok: true });
    expect(sim.profile.coins).toBeLessThan(2000);
    let t = NOW;
    const events = [];
    for (let k = 0; k < 10; k++) events.push(...stepLife(sim, 1000, (t += 1000), still));
    expect(events.some((e) => e.kind === "activity_done" && e.key === key)).toBe(true);
    expect(sim.profile.day.needs.hunger).toBeGreaterThan(65);
    expect(sim.profile.day.counters.meals).toBe(1);
  });

  it("won't let you eat when full", () => {
    const sim = townSim();
    standAt(sim, "food_court");
    sim.profile.day.needs.hunger = 99;
    expect(orderMeal(sim, mealKey("mr_biggs", "meatpie"), NOW)).toMatchObject({ ok: false, reason: expect.stringContaining("full") });
  });
});
