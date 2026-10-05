/**
 * The neighbourhood outside school. Students ride the bus here from the school's Front Yard and
 * can stay as long as they like: the town is open at any time of the school day.
 *
 *   North of Main Road: Your Home · Barber & Salon · Supermarket & Furniture · Viewing Centre · Town Bank
 *   Main Road (east end: Bus Park, with the Office Complex for graduates just south of it)
 *   South of Main Road: Market · Food Court (Nigerian restaurants) · Football Park · Church & Mosque Square
 */
import type { Obstacle } from "@/lib/game/map";
import type { Point } from "@/lib/game/types";
import type { Decoration, LifeZone, Spot } from "./map";
import { restaurants } from "./restaurants";

export const TOWN_WORLD = { width: 2700, height: 1460 } as const;

const NORTH_Y = 120;
const NORTH_H = 420;
const ROAD_Y = 620;
const ROAD_H = 160;
const SOUTH_Y = 860;
const SOUTH_H = 540;
const DOOR_W = 80;

const place = (key: string, label: string, x: number, y: number, width: number, height: number, floor: string, pattern: LifeZone["pattern"]): LifeZone => ({
  key,
  label,
  x,
  y,
  width,
  height,
  floor,
  pattern,
});

const door = (key: string, x: number, y: number, width: number, height: number): LifeZone => ({
  key,
  x,
  y,
  width,
  height,
  label: null,
  floor: "#d6d3d1",
  isLink: true,
});

const northDoor = (key: string, x: number) => door(`${key}Door`, x, NORTH_Y + NORTH_H, DOOR_W, ROAD_Y - NORTH_Y - NORTH_H);
const southDoor = (key: string, x: number) => door(`${key}Door`, x, ROAD_Y + ROAD_H, DOOR_W, SOUTH_Y - ROAD_Y - ROAD_H);

export const townZones: LifeZone[] = [
  place("road", "Main Road", 40, ROAD_Y, 2320, ROAD_H, "#6b7280", "asphalt"),
  place("buspark", "Bus Park", 2420, 360, 240, 660, "#d6d3d1", "paving"),
  // North.
  place("home", "Your Home", 60, NORTH_Y, 420, NORTH_H, "#f5deb3", "planks"),
  place("salon", "Barber & Salon", 540, NORTH_Y, 320, NORTH_H, "#fce7f3", "tiles"),
  place("supermarket", "Supermarket & Furniture", 920, NORTH_Y, 460, NORTH_H, "#ecfeff", "tiles"),
  place("viewing", "Viewing Centre", 1440, NORTH_Y, 400, NORTH_H, "#1f2937", "plain"),
  place("townbank", "Town Bank", 1900, NORTH_Y, 400, NORTH_H, "#e2e8f0", "tiles"),
  // South.
  place("market", "Market", 60, SOUTH_Y, 660, SOUTH_H, "#e7d3b0", "paving"),
  place("bukka", "Food Court", 780, SOUTH_Y, 380, SOUTH_H, "#fde7c8", "tiles"),
  place("park", "Football Park", 1220, SOUTH_Y, 640, SOUTH_H, "#8fd16f", "stripes"),
  place("square", "Church & Mosque Square", 1920, SOUTH_Y, 440, SOUTH_H, "#e7e5e4", "paving"),
  // Where graduates work.
  place("office", "Office Complex", 2420, 1100, 240, 300, "#e0e7ff", "tiles"),

  northDoor("home", 230),
  northDoor("salon", 660),
  northDoor("supermarket", 1110),
  northDoor("viewing", 1600),
  northDoor("townbank", 2060),
  southDoor("market", 350),
  southDoor("bukka", 930),
  southDoor("park", 1500),
  southDoor("square", 2100),
  door("busDoor", 2360, ROAD_Y, 60, ROAD_H),
  door("officeDoor", 2500, 1020, 80, 80),
];

const solid = (id: string, label: string, x: number, y: number, width: number, height: number, color: string, emoji?: string): Obstacle => ({
  id,
  label,
  kind: "solid",
  penalizes: false,
  x,
  y,
  width,
  height,
  color,
  emoji,
});

/** The restaurant stalls: two each side of the door along the top, then down both walls. */
function foodStalls(): Obstacle[] {
  const places = [
    { x: 790, y: 876, w: 64, h: 44 },
    { x: 862, y: 876, w: 60, h: 44 },
    { x: 1018, y: 876, w: 64, h: 44 },
    { x: 1090, y: 876, w: 60, h: 44 },
    { x: 790, y: 990, w: 56, h: 52 },
    { x: 790, y: 1080, w: 56, h: 52 },
    { x: 790, y: 1170, w: 56, h: 52 },
    { x: 1094, y: 990, w: 56, h: 52 },
    { x: 1094, y: 1080, w: 56, h: 52 },
  ];
  return places.map((p, i) => {
    const r = restaurants[i];
    return { ...solid(`stall_${r.id}`, r.name, p.x, p.y, p.w, p.h, r.color, r.emoji), caption: r.sign };
  });
}

export const townFurniture: Obstacle[] = [
  // Your Home.
  solid("home_bed", "Bed", 80, 140, 100, 70, "#60a5fa", "🛏️"),
  solid("home_wardrobe", "Wardrobe", 200, 136, 80, 40, "#92400e", "🚪"),
  solid("home_desk", "Desk", 380, 136, 80, 30, "#b45309", "📚"),
  solid("home_table", "Table", 370, 420, 90, 40, "#b45309", "🍽️"),
  // Barber & Salon.
  solid("salon_chair_1", "Barber chair", 570, 150, 60, 50, "#be185d", "💈"),
  solid("salon_chair_2", "Salon chair", 770, 150, 60, 50, "#be185d", "💇"),
  solid("salon_mirror", "Mirror", 650, 132, 100, 14, "#bae6fd", "🪞"),
  // Supermarket & Furniture.
  solid("shelves_1", "Shelves", 940, 150, 160, 24, "#0e7490", "🥫"),
  solid("shelves_2", "Shelves", 940, 230, 160, 24, "#0e7490", "🍪"),
  solid("sofa_display", "Sofa display", 1250, 150, 110, 40, "#7c3aed", "🛋️"),
  solid("checkout", "Checkout", 960, 470, 120, 24, "#475569", "🧾"),
  // Viewing Centre.
  solid("big_screen", "Big screen", 1470, 132, 340, 20, "#0f172a", "📺"),
  // Benches either side of a centre aisle that lines up with the door.
  solid("bench_1", "Bench", 1470, 330, 120, 18, "#92400e"),
  solid("bench_2", "Bench", 1690, 330, 120, 18, "#92400e"),
  solid("bench_3", "Bench", 1470, 410, 120, 18, "#92400e"),
  solid("bench_4", "Bench", 1690, 410, 120, 18, "#92400e"),
  // Town Bank.
  solid("town_bank_counter", "Bank counter", 1940, 150, 320, 24, "#475569", "🏦"),
  // Market stalls.
  solid("stall_1", "Tomato stall", 90, 1240, 120, 50, "#dc2626", "🍅"),
  solid("stall_2", "Fish stall", 250, 1240, 120, 50, "#0284c7", "🐟"),
  solid("stall_3", "Fruit stall", 560, 900, 130, 50, "#16a34a", "🍌"),
  solid("mama_put", "Mama Put", 90, 890, 150, 50, "#ea580c", "🍲"),
  // Food Court: a stall for each restaurant around the walls, tables in the middle.
  ...foodStalls(),
  solid("food_table_1", "Table", 880, 1180, 60, 36, "#c2410c", "🍽️"),
  solid("food_table_2", "Table", 1000, 1180, 60, 36, "#c2410c", "🍽️"),
  solid("bukka_counter", "Mama's Bukka", 820, 1360, 300, 20, "#a16207"),
  // Church & Mosque Square.
  solid("church", "Church", 1950, 1240, 150, 130, "#e5e7eb", "⛪"),
  solid("mosque", "Mosque", 2180, 1240, 150, 130, "#d1fae5", "🕌"),
  solid("fountain", "Fountain", 2100, 960, 80, 60, "#7dd3fc", "⛲"),
  // Bus Park.
  solid("bus", "Bus", 2560, 400, 80, 150, "#facc15", "🚌"),
  // Office Complex: two desks and a reception counter.
  solid("office_desk_1", "Desk", 2440, 1180, 70, 34, "#475569", "💻"),
  solid("office_desk_2", "Desk", 2580, 1180, 70, 34, "#475569", "🗂️"),
  solid("office_reception", "Reception", 2450, 1350, 180, 22, "#1e3a8a"),
];

export const townDecorations: Decoration[] = [
  { kind: "lane", x: 40, y: ROAD_Y + ROAD_H / 2 - 3, width: 2320, height: 6, color: "#fde047" },
  { kind: "zebra", x: 1110, y: ROAD_Y + 10, width: 80, height: ROAD_H - 20, color: "#ffffff" },
  { kind: "zebra", x: 1500, y: ROAD_Y + 10, width: 80, height: ROAD_H - 20, color: "#ffffff" },
  { kind: "rug", x: 260, y: 230, width: 160, height: 110, color: "#fca5a5" },
  { kind: "pitch", x: 1250, y: 900, width: 580, height: 460, color: "#ffffff" },
  { kind: "goal", x: 1236, y: 1095, width: 14, height: 70, color: "#ffffff" },
  { kind: "goal", x: 1830, y: 1095, width: 14, height: 70, color: "#ffffff" },
  { kind: "garden", x: 1960, y: 900, width: 110, height: 70, color: "#4ade80" },
  { kind: "garden", x: 2210, y: 900, width: 110, height: 70, color: "#4ade80" },
  { kind: "sign", x: 2430, y: 980, width: 220, height: 26, color: "#ca8a04" },
];

export const townSpots: Spot[] = [
  // Your Home.
  { id: "my_room", activity: "my_room", x: 300, y: 300, radius: 110, label: "Your room" },
  { id: "sleep_home", activity: "sleep_home", x: 130, y: 250, radius: 60, label: "Your bed" },
  { id: "study_home", activity: "study_home", x: 410, y: 210, radius: 55, label: "Your desk" },
  // Barber & Salon.
  { id: "salon", activity: "salon_look", x: 700, y: 280, radius: 90, label: "Barber & Salon" },
  { id: "salon_job", activity: "salon_job", x: 610, y: 470, radius: 50, label: "Salon broom" },
  // Supermarket & Furniture.
  { id: "supermarket", activity: "supermarket_snack", x: 1020, y: 380, radius: 70, label: "Supermarket" },
  { id: "furniture", activity: "furniture_shop", x: 1300, y: 330, radius: 80, label: "Furniture shop" },
  // Viewing Centre.
  { id: "viewing", activity: "viewing_match", x: 1640, y: 250, radius: 90, label: "Big screen" },
  // Town Bank.
  { id: "townbank", activity: "school_bank", x: 2100, y: 300, radius: 100, label: "Town Bank" },
  // Bus Park.
  { id: "bus_to_school", activity: "bus_to_school", x: 2530, y: 640, radius: 80, label: "Bus to school" },
  // Office Complex.
  { id: "office", activity: "career_work", x: 2540, y: 1270, radius: 80, label: "Your desk at work" },
  // Market.
  { id: "mama_put", activity: "mama_put", x: 165, y: 1000, radius: 70, label: "Mama Put" },
  { id: "fruit", activity: "buy_fruit", x: 625, y: 1010, radius: 60, label: "Fruit stall" },
  { id: "market_stall", activity: "market_stall", x: 310, y: 1180, radius: 70, label: "Market stall" },
  // Food Court.
  { id: "food_court", activity: "food_court", x: 970, y: 1050, radius: 110, label: "Food Court" },
  { id: "bukka", activity: "eat_together", x: 970, y: 1300, radius: 60, label: "Mama's Bukka" },
  // Football Park.
  { id: "park_football", activity: "park_football", x: 1540, y: 1130, radius: 180, label: "Football Park" },
  // Church & Mosque Square.
  { id: "square", activity: "relax_square", x: 2140, y: 1110, radius: 110, label: "The square" },
];

/** Where the bus drops students in town. */
export const TOWN_SPAWN: Point = { x: 2530, y: 760 };
