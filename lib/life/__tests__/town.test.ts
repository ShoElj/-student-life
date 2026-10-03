import { describe, expect, it } from "vitest";
import { isWalkable } from "@/lib/game/collision";
import { getActivity } from "../activities";
import { dateKey, eventFor, streakReward, visit } from "../events";
import { adoptPet, buyFurniture, daysHungry, feedPet, newHome, placeFurniture, roomValue, sanitizeHome } from "../home";
import { createSim, newProfile, priceOf, startActivity, stepLife, travel } from "../sim";
import { randomStarterLook } from "../wardrobe";
import { worlds, type WorldKey } from "../worlds";

const still = { dx: 0, dy: 0 };

describe.each(["school", "town"] as WorldKey[])("%s map", (key) => {
  const world = worlds[key];
  const free = (x: number, y: number) => isWalkable(x, y, 12, world.geometry.zones, world.geometry.solids, world.geometry.world) === true;

  it("every place and activity can be walked to from the bus stop / gate", () => {
    const STEP = 10;
    const cols = Math.ceil(world.size.width / STEP);
    const rows = Math.ceil(world.size.height / STEP);
    const seen = new Uint8Array(cols * rows);
    const start = [Math.round(world.spawn.x / STEP), Math.round(world.spawn.y / STEP)];
    expect(free(world.spawn.x, world.spawn.y)).toBe(true);
    const queue = [start];
    seen[start[1] * cols + start[0]] = 1;
    while (queue.length) {
      const [cx, cy] = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx]) continue;
        if (!free(nx * STEP, ny * STEP)) continue;
        seen[ny * cols + nx] = 1;
        queue.push([nx, ny]);
      }
    }
    for (const s of world.spots) {
      expect(free(s.x, s.y), s.id).toBe(true);
      expect(seen[Math.round(s.y / STEP) * cols + Math.round(s.x / STEP)], s.id).toBe(1);
      expect(getActivity(s.activity), s.activity).not.toBeNull();
    }
  });

  it("spot ids are unique across both worlds", () => {
    const all = [...worlds.school.spots, ...worlds.town.spots].map((s) => s.id);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("town life", () => {
  const now = Date.UTC(2026, 9, 6, 12); // a Tuesday (no weekly event)

  it("the bus takes you to town and back", () => {
    const sim = createSim("me", newProfile("me", randomStarterLook(), now), now);
    expect(sim.world).toBe("school");
    const stop = worlds.school.spots.find((s) => s.activity === "bus_to_town")!;
    Object.assign(sim, { x: stop.x, y: stop.y });
    expect(startActivity(sim, stop.id, now)).toEqual({ ok: true });
    let events: ReturnType<typeof stepLife> = [];
    for (let t = 0; t < 5000; t += 100) events = events.concat(stepLife(sim, 100, now + t, still));
    expect(events.some((e) => e.kind === "travelled" && e.world === "town")).toBe(true);
    expect(sim.world).toBe("town");
    expect(sim.profile.world).toBe("town");
    travel(sim, "school");
    expect(sim.world).toBe("school");
  });

  it("the town stays open after school", () => {
    const sim = createSim("me", newProfile("me", randomStarterLook(), now), now);
    travel(sim, "town");
    const homeTime = Math.floor(now / 600_000) * 600_000 + 570_000;
    const square = worlds.town.spots.find((s) => s.id === "square")!;
    Object.assign(sim, { x: square.x, y: square.y });
    expect(startActivity(sim, "square", homeTime)).toEqual({ ok: true });
  });
});

describe("weekly events and streaks", () => {
  it("market day halves market prices; movie night is free", () => {
    const monday = new Date(2026, 9, 5, 12).getTime();
    const friday = new Date(2026, 9, 9, 12).getTime();
    expect(eventFor(monday)?.key).toBe("market_monday");
    expect(priceOf(getActivity("mama_put")!, monday)).toBe(175);
    expect(priceOf(getActivity("viewing_match")!, friday)).toBe(0);
    expect(priceOf(getActivity("viewing_match")!, monday)).toBe(100);
  });

  it("coming back on consecutive days grows the streak; missing a day resets it", () => {
    const day1 = new Date(2026, 9, 5, 9).getTime();
    const p: { streak?: { count: number; lastDate: string; best: number } } = {};
    expect(visit(p, day1)).toEqual({ count: 1, reward: streakReward(1) });
    expect(visit(p, day1 + 3_600_000)).toBeNull();
    expect(visit(p, day1 + 86_400_000)?.count).toBe(2);
    expect(visit(p, day1 + 3 * 86_400_000)?.count).toBe(1);
    expect(p.streak?.best).toBe(2);
    expect(streakReward(7)).toBe(1400 + 1000);
  });

  it("arriving pays the daily streak bonus once", () => {
    const t = new Date(2026, 9, 6, 9).getTime();
    const profile = newProfile("me", randomStarterLook(), t);
    const before = profile.coins;
    const sim = createSim("me", profile, t);
    expect(sim.profile.coins).toBe(before + streakReward(1));
    expect(stepLife(sim, 16, t, still).some((e) => e.kind === "streak")).toBe(true);
    const again = createSim("me", sim.profile, t + 60_000);
    expect(again.pending.some((e) => e.kind === "streak")).toBe(false);
  });
});

describe("home, furniture and pets", () => {
  it("buying furniture places it; owned furniture can be swapped for free", () => {
    const p = newProfile("me", randomStarterLook());
    p.coins = 10_000;
    expect(buyFurniture(p, "bed_single")).toEqual({ ok: true });
    expect(p.coins).toBe(8000);
    expect(p.home?.items.bed).toBe("bed_single");
    expect(placeFurniture(p, "bed", "bed_mat")).toEqual({ ok: true });
    expect(buyFurniture(p, "bed_single")).toEqual({ ok: true });
    expect(p.coins).toBe(8000);
    expect(placeFurniture(p, "tv", "tv_console")).toMatchObject({ ok: false });
    expect(roomValue(p.home)).toBe(2000);
  });

  it("pets are adopted, fed once a day and get hungry", () => {
    const p = newProfile("me", randomStarterLook());
    p.coins = 5000;
    expect(adoptPet(p, "cat", "Bisi", "2026-10-05")).toEqual({ ok: true });
    expect(p.coins).toBe(2500);
    expect(feedPet(p, "2026-10-05")).toMatchObject({ ok: false });
    expect(daysHungry(p.home!.pet!, "2026-10-08")).toBe(3);
    expect(feedPet(p, "2026-10-08")).toEqual({ ok: true });
    expect(p.home!.pet!.lastFed).toBe("2026-10-08");
  });

  it("rejects bad room data from other devices", () => {
    expect(sanitizeHome({ items: { bed: "bed_royal", tv: "rocket" }, owned: ["bed_royal", 5], wall: "red", pet: { kind: "dragon" } })).toEqual({
      items: { bed: "bed_royal" },
      owned: ["bed_royal"],
      wall: newHome().wall,
      pet: undefined,
    });
    expect(dateKey(new Date(2026, 0, 2, 10).getTime())).toBe("2026-01-02");
  });
});
