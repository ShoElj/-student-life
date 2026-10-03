import { describe, expect, it } from "vitest";
import { findPath } from "../pathfind";
import { createSim, newProfile, stepLife, travel } from "../sim";
import { randomStarterLook } from "../wardrobe";
import { worlds, type WorldKey } from "../worlds";

/** Follows waypoints the way the client does, returning where the student ends up. */
function follow(world: WorldKey, to: { x: number; y: number }): { x: number; y: number } {
  const now = Date.UTC(2026, 9, 6, 12);
  const sim = createSim("me", newProfile("me", randomStarterLook(), now), now);
  if (world === "town") travel(sim, "town");
  const path = findPath(world, sim, to);
  expect(path).not.toBeNull();
  const points = [...path!];
  for (let i = 0; i < 4000 && points.length; i++) {
    const next = points[0];
    const dx = next.x - sim.x;
    const dy = next.y - sim.y;
    const len = Math.hypot(dx, dy);
    if (len < 6) {
      points.shift();
      continue;
    }
    const k = Math.min(1, len / 10);
    stepLife(sim, 50, now, { dx: (dx / len) * k, dy: (dy / len) * k });
  }
  return { x: sim.x, y: sim.y };
}

describe.each(["school", "town"] as WorldKey[])("walking directions in the %s", (world) => {
  it("reaches every activity from the arrival point", () => {
    for (const spot of worlds[world].spots) {
      const end = follow(world, spot);
      expect(Math.hypot(end.x - spot.x, end.y - spot.y), spot.id).toBeLessThan(spot.radius);
    }
  });
});
