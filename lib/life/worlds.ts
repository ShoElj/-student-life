/**
 * The two places a student can be: the school and the town outside it. Each world has its own
 * map; the bus moves a student between them.
 */
import type { MapGeometry } from "@/lib/game/collision";
import type { Obstacle } from "@/lib/game/map";
import type { Point } from "@/lib/game/types";
import { LIFE_SPAWN, LIFE_WORLD, lifeDecorations, lifeFurniture, lifeSpots, lifeZones, type Decoration, type LifeZone, type Spot } from "./map";
import { TOWN_SPAWN, TOWN_WORLD, townDecorations, townFurniture, townSpots, townZones } from "./town";

export type WorldKey = "school" | "town";

export type WorldDef = {
  key: WorldKey;
  name: string;
  size: { width: number; height: number };
  zones: LifeZone[];
  furniture: Obstacle[];
  decorations: Decoration[];
  spots: Spot[];
  spawn: Point;
  geometry: MapGeometry;
  /** Grass colour around the buildings. */
  ground: number;
};

export const worlds: Record<WorldKey, WorldDef> = {
  school: {
    key: "school",
    name: "School",
    size: LIFE_WORLD,
    zones: lifeZones,
    furniture: lifeFurniture,
    decorations: lifeDecorations,
    spots: lifeSpots,
    spawn: LIFE_SPAWN,
    geometry: { zones: lifeZones, solids: lifeFurniture, world: LIFE_WORLD },
    ground: 0x8fcf7a,
  },
  town: {
    key: "town",
    name: "Town",
    size: TOWN_WORLD,
    zones: townZones,
    furniture: townFurniture,
    decorations: townDecorations,
    spots: townSpots,
    spawn: TOWN_SPAWN,
    geometry: { zones: townZones, solids: townFurniture, world: TOWN_WORLD },
    ground: 0x86c46d,
  },
};

export function isWorldKey(v: unknown): v is WorldKey {
  return v === "school" || v === "town";
}

export function findSpot(world: WorldKey, id: string): Spot | undefined {
  return worlds[world].spots.find((s) => s.id === id);
}
