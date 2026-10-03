/**
 * The whole school for Student Life.
 *
 *   North (outdoors):  School Farm · Assembly Ground · Sports Field · Basketball Court
 *   Main Corridor
 *   Classroom A · Classroom B · Science Lab · Computer Lab · Library · Music & Art Room
 *   South Corridor
 *   Canteen · Common Room · Sick Bay · School Shop · School Bank
 *   East (outdoors):   Front Yard with the School Gate, Tuck Shop and Bus Stop
 *
 * Rooms are joined by short doorways ("links"); students can only walk on zones and links.
 */
import type { MapGeometry } from "@/lib/game/collision";
import type { Obstacle, Zone } from "@/lib/game/map";
import type { Point, Rect } from "@/lib/game/types";

export const LIFE_WORLD = { width: 2700, height: 1660 } as const;

export type LifeZoneKey = string;

/** How a floor is drawn. */
export type FloorPattern = "planks" | "tiles" | "grid" | "stripes" | "soil" | "court" | "paving" | "asphalt" | "plain";

export type LifeZone = Zone<LifeZoneKey> & { pattern?: FloorPattern };

const room = (key: string, label: string, x: number, y: number, width: number, height: number, floor: string, pattern: FloorPattern): LifeZone => ({
  key,
  label,
  x,
  y,
  width,
  height,
  floor,
  pattern,
});

const DOOR_FLOOR = "#d9dee7";
const door = (key: string, x: number, y: number, width: number, height: number): LifeZone => ({
  key,
  x,
  y,
  width,
  height,
  label: null,
  floor: DOOR_FLOOR,
  isLink: true,
});

// Row positions.
const NORTH_Y = 40;
const NORTH_H = 380;
const MAIN_CORRIDOR_Y = 500;
const ROW_A_Y = 680;
const ROW_A_H = 320;
const SOUTH_CORRIDOR_Y = 1080;
const ROW_B_Y = 1260;
const CORRIDOR_H = 100;
/** Doorways are wide enough to walk through easily with a joystick. */
const DOOR_W = 80;

/** Doorways above and below a Row A room (to both corridors). */
const rowADoors = (key: string, x: number): LifeZone[] => [
  door(`${key}Up`, x, MAIN_CORRIDOR_Y + CORRIDOR_H, DOOR_W, ROW_A_Y - MAIN_CORRIDOR_Y - CORRIDOR_H),
  door(`${key}Down`, x, ROW_A_Y + ROW_A_H, DOOR_W, SOUTH_CORRIDOR_Y - ROW_A_Y - ROW_A_H),
];

/** Doorway from a Row B room up to the south corridor. */
const rowBDoor = (key: string, x: number): LifeZone =>
  door(`${key}Door`, x, SOUTH_CORRIDOR_Y + CORRIDOR_H, DOOR_W, ROW_B_Y - SOUTH_CORRIDOR_Y - CORRIDOR_H);

/** Doorway from a north (outdoor) area down to the main corridor. */
const northDoor = (key: string, x: number, width = DOOR_W): LifeZone =>
  door(`${key}Door`, x, NORTH_Y + NORTH_H, width, MAIN_CORRIDOR_Y - NORTH_Y - NORTH_H);

export const lifeZones: LifeZone[] = [
  // North, outdoors.
  room("farm", "School Farm", 40, NORTH_Y, 460, NORTH_H, "#c8b07f", "soil"),
  room("assembly", "Assembly Ground", 560, NORTH_Y, 520, NORTH_H, "#d6e9c4", "grid"),
  room("field", "Sports Field", 1140, NORTH_Y, 700, NORTH_H, "#8fd16f", "stripes"),
  room("court", "Basketball Court", 1900, NORTH_Y, 420, NORTH_H, "#e59a5c", "court"),
  // Corridors.
  room("corridor", "Main Corridor", 40, MAIN_CORRIDOR_Y, 2320, CORRIDOR_H, "#d9dee7", "tiles"),
  room("corridor2", "South Corridor", 40, SOUTH_CORRIDOR_Y, 2320, CORRIDOR_H, "#d9dee7", "tiles"),
  // Row A.
  room("classA", "Classroom A", 40, ROW_A_Y, 340, ROW_A_H, "#f3d9a4", "planks"),
  room("classB", "Classroom B", 440, ROW_A_Y, 340, ROW_A_H, "#f3d9a4", "planks"),
  room("lab", "Science Lab", 840, ROW_A_Y, 320, ROW_A_H, "#dbeafe", "tiles"),
  room("ict", "Computer Lab", 1220, ROW_A_Y, 320, ROW_A_H, "#e0e7ff", "tiles"),
  room("library", "Library", 1600, ROW_A_Y, 360, ROW_A_H, "#ead9bd", "planks"),
  room("music", "Music & Art", 2020, ROW_A_Y, 300, ROW_A_H, "#fde2e4", "planks"),
  // Row B.
  room("canteen", "Canteen", 40, ROW_B_Y, 520, 360, "#fde7c8", "tiles"),
  room("common", "Common Room", 620, ROW_B_Y, 600, 360, "#e5d4f5", "plain"),
  room("sickbay", "Sick Bay", 1280, ROW_B_Y, 280, 360, "#ecfdf5", "tiles"),
  room("shop", "School Shop", 1620, ROW_B_Y, 320, 360, "#fef3c7", "planks"),
  room("bank", "School Bank", 2000, ROW_B_Y, 320, 360, "#e2e8f0", "tiles"),
  // East, outdoors.
  room("yard", "Front Yard", 2400, 40, 260, 1580, "#d6d3d1", "paving"),

  // Doorways: north outdoors ↔ main corridor.
  northDoor("farm", 230),
  northDoor("assembly", 780),
  northDoor("field", 1450, 100),
  northDoor("court", 2070),
  // Front yard ↔ court and both corridors.
  door("courtYard", 2320, 300, 80, 100),
  door("corridorYard", 2360, MAIN_CORRIDOR_Y, 40, CORRIDOR_H),
  door("corridor2Yard", 2360, SOUTH_CORRIDOR_Y, 40, CORRIDOR_H),
  // Row A rooms open onto both corridors.
  ...rowADoors("classA", 170),
  ...rowADoors("classB", 570),
  ...rowADoors("lab", 960),
  ...rowADoors("ict", 1340),
  ...rowADoors("library", 1740),
  ...rowADoors("music", 2130),
  // Row B rooms open onto the south corridor.
  rowBDoor("canteen", 260),
  rowBDoor("common", 880),
  rowBDoor("sickbay", 1380),
  rowBDoor("shop", 1740),
  rowBDoor("bank", 2120),
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

/** Desks in two rows of three, starting at `x`. */
const desks = (prefix: string, x: number): Obstacle[] =>
  [0, 1, 2].flatMap((i) => [
    solid(`${prefix}_desk_${i}`, "Desk", x + i * 80, ROW_A_Y + 110, 44, 24, "#b45309"),
    solid(`${prefix}_desk_${i + 3}`, "Desk", x + i * 80, ROW_A_Y + 185, 44, 24, "#b45309"),
  ]);

/** Furniture. Solid, but bumping it is harmless in Student Life. */
export const lifeFurniture: Obstacle[] = [
  // Farm.
  solid("farm_shed", "Tool shed", 330, 90, 80, 50, "#92400e", "🛖"),
  solid("orange_tree", "Orange tree", 430, 70, 44, 44, "#15803d", "🍊"),
  // Assembly ground.
  solid("podium", "Podium", 760, 62, 120, 26, "#b45309", "🎤"),
  solid("flagpole", "Flagpole", 960, 60, 8, 8, "#64748b"),
  // Sports field: stands along the top.
  solid("stands", "Stands", 1330, 50, 480, 24, "#64748b", "📣"),
  // Basketball court: hoop posts.
  solid("hoop_left", "Hoop", 1912, 215, 8, 30, "#334155"),
  solid("hoop_right", "Hoop", 2300, 215, 8, 30, "#334155"),
  // Main corridor.
  solid("lockers_1", "Lockers", 330, 504, 240, 16, "#2563eb", "🔐"),
  solid("lockers_2", "Lockers", 1000, 504, 300, 16, "#2563eb", "🔐"),
  solid("lockers_3", "Lockers", 1600, 504, 300, 16, "#2563eb", "🔐"),
  solid("tap", "Water tap", 1100, 584, 30, 12, "#64748b", "🚰"),
  solid("snack_stall", "Snack stall", 2180, 504, 64, 18, "#f59e0b", "🧺"),
  // Classrooms.
  ...desks("a", 80),
  ...desks("b", 480),
  // Science lab.
  solid("lab_bench_1", "Lab bench", 870, 760, 120, 30, "#475569", "🧪"),
  solid("lab_bench_2", "Lab bench", 1020, 760, 120, 30, "#475569", "🔬"),
  // Computer lab.
  solid("pc_desk_1", "Computers", 1236, 740, 100, 26, "#334155", "💻"),
  solid("pc_desk_2", "Computers", 1430, 740, 100, 26, "#334155", "🖥️"),
  // Library.
  solid("shelf_top", "Bookshelf", 1606, 730, 18, 200, "#8b5a2b", "📚"),
  solid("study_table", "Study table", 1720, 830, 100, 40, "#a16207"),
  // Music & art.
  solid("drums", "Drum set", 2050, 725, 60, 40, "#be123c", "🥁"),
  solid("easel", "Easel", 2240, 725, 50, 40, "#a16207", "🎨"),
  // Canteen: serving counter along the back wall, tables in the middle.
  solid("counter", "Canteen counter", 50, 1592, 500, 20, "#a16207"),
  solid("canteen_table_1", "Table", 80, 1400, 60, 34, "#c2410c"),
  solid("canteen_table_2", "Table", 420, 1400, 60, 34, "#c2410c"),
  // Common room.
  solid("games_table_1", "Games table", 680, 1340, 60, 40, "#0f766e", "🎲"),
  solid("games_table_2", "Games table", 800, 1340, 60, 40, "#0f766e", "🌰"),
  solid("tv", "TV", 1100, 1270, 100, 14, "#111827", "📺"),
  solid("speakers", "Music corner", 1176, 1480, 30, 40, "#7c3aed", "🎧"),
  solid("pingpong", "Table tennis table", 930, 1430, 110, 60, "#1d4ed8", "🏓"),
  solid("sofa", "Sofa", 660, 1575, 130, 30, "#7c3aed", "🛋️"),
  // Sick bay.
  solid("bed_1", "Bed", 1300, 1300, 50, 80, "#e2e8f0", "🛏️"),
  solid("bed_2", "Bed", 1490, 1300, 50, 80, "#e2e8f0", "🛏️"),
  // School shop.
  solid("rack_1", "Clothes rack", 1640, 1300, 40, 90, "#c2410c", "👕"),
  solid("rack_2", "Shoe rack", 1880, 1300, 40, 90, "#c2410c", "👟"),
  solid("shop_counter", "Shop counter", 1700, 1570, 160, 20, "#a16207"),
  // School bank.
  solid("bank_counter", "Bank counter", 2040, 1570, 240, 20, "#475569", "🏦"),
  // Front yard.
  solid("bus_shelter", "Bus shelter", 2560, 80, 80, 30, "#ca8a04", "🚌"),
  solid("tuck_shop", "Tuck shop", 2560, 800, 90, 50, "#16a34a", "🍬"),
  solid("security_post", "Security post", 2580, 1290, 70, 50, "#1e3a8a", "💂"),
];

export const lifeGeometry: MapGeometry = { zones: lifeZones, solids: lifeFurniture, world: LIFE_WORLD };

/** Things drawn on the map that do not block movement. */
export type Decoration = Rect & {
  kind: "goal" | "pitch" | "board" | "rug" | "flag" | "crops" | "court" | "gate" | "sign" | "notice" | "track" | "chalk" | "lane" | "zebra" | "garden";
  color: string;
};

export const lifeDecorations: Decoration[] = [
  // Farm crop beds.
  { kind: "crops", x: 80, y: 170, width: 160, height: 90, color: "#65a30d" },
  { kind: "crops", x: 290, y: 170, width: 160, height: 90, color: "#ca8a04" },
  { kind: "crops", x: 80, y: 300, width: 140, height: 80, color: "#16a34a" },
  // Assembly flag.
  { kind: "flag", x: 964, y: 40, width: 30, height: 18, color: "#16a34a" },
  // Football pitch.
  { kind: "pitch", x: 1170, y: 100, width: 640, height: 300, color: "#ffffff" },
  { kind: "goal", x: 1156, y: 215, width: 14, height: 70, color: "#ffffff" },
  { kind: "goal", x: 1810, y: 215, width: 14, height: 70, color: "#ffffff" },
  // Basketball court lines.
  { kind: "court", x: 1920, y: 70, width: 380, height: 320, color: "#ffffff" },
  // Corridor notice board.
  { kind: "notice", x: 640, y: 503, width: 90, height: 10, color: "#b45309" },
  // Chalkboards.
  { kind: "board", x: 44, y: 740, width: 8, height: 160, color: "#14532d" },
  { kind: "board", x: 444, y: 740, width: 8, height: 160, color: "#14532d" },
  // Front Yard running track and the ten-ten circle.
  { kind: "track", x: 2420, y: 330, width: 100, height: 400, color: "#dc6b4a" },
  { kind: "chalk", x: 2470, y: 1020, width: 120, height: 120, color: "#ffffff" },
  // School gate and the school's name sign.
  { kind: "gate", x: 2650, y: 1400, width: 12, height: 160, color: "#1e3a8a" },
  { kind: "sign", x: 2420, y: 1590, width: 220, height: 26, color: "#1e3a8a" },
];

/** A place where a student can do an activity. */
export type Spot = Point & { id: string; activity: string; radius: number; label: string };

export const lifeSpots: Spot[] = [
  // Farm.
  { id: "water_crops", activity: "water_crops", x: 200, y: 285, radius: 60, label: "Crop beds" },
  { id: "oranges", activity: "pick_oranges", x: 452, y: 150, radius: 50, label: "Orange tree" },
  // Assembly.
  { id: "assembly", activity: "assembly", x: 820, y: 250, radius: 170, label: "Assembly" },
  // Sports field and court.
  { id: "stands", activity: "watch_match", x: 1460, y: 100, radius: 50, label: "Stands" },
  { id: "football", activity: "play_football", x: 1490, y: 260, radius: 180, label: "Football pitch" },
  { id: "basketball", activity: "play_basketball", x: 2110, y: 230, radius: 160, label: "Basketball court" },
  // Main corridor.
  { id: "water", activity: "drink_water", x: 1115, y: 555, radius: 45, label: "Water tap" },
  { id: "snack_stall", activity: "snack_stall", x: 2212, y: 552, radius: 50, label: "Snack stall" },
  // Classrooms.
  { id: "lesson", activity: "attend_lesson", x: 210, y: 840, radius: 150, label: "Classroom A" },
  { id: "sweep_job", activity: "sweep_job", x: 330, y: 720, radius: 45, label: "Broom cupboard" },
  { id: "lessonB", activity: "attend_lesson", x: 610, y: 840, radius: 150, label: "Classroom B" },
  // Breaking the rules.
  { id: "phone_in_class", activity: "phone_in_class", x: 735, y: 750, radius: 40, label: "Back row seat" },
  { id: "eat_in_class", activity: "eat_in_class", x: 100, y: 955, radius: 40, label: "Back of the class" },
  { id: "copy_homework", activity: "copy_homework", x: 1890, y: 950, radius: 40, label: "Quiet corner" },
  { id: "skip_class", activity: "skip_class", x: 300, y: 160, radius: 45, label: "Behind the shed" },
  // Science and computer labs.
  { id: "experiment", activity: "do_experiment", x: 1000, y: 880, radius: 90, label: "Lab benches" },
  { id: "coding", activity: "practise_coding", x: 1286, y: 850, radius: 60, label: "Computers" },
  { id: "fix_computers", activity: "fix_computers", x: 1480, y: 850, radius: 55, label: "Broken computers" },
  // Library.
  { id: "study", activity: "study", x: 1770, y: 905, radius: 70, label: "Study table" },
  { id: "comics", activity: "read_comics", x: 1905, y: 790, radius: 60, label: "Comics shelf" },
  { id: "library_job", activity: "library_job", x: 1655, y: 800, radius: 45, label: "Returned books" },
  // Music & art.
  { id: "drums", activity: "play_drums", x: 2080, y: 815, radius: 60, label: "Drum set" },
  { id: "paint", activity: "paint", x: 2265, y: 815, radius: 60, label: "Easel" },
  // Canteen.
  { id: "meal", activity: "buy_meal", x: 140, y: 1550, radius: 55, label: "Food counter" },
  { id: "canteen_job", activity: "canteen_job", x: 300, y: 1550, radius: 50, label: "Canteen kitchen" },
  { id: "snack", activity: "buy_snack", x: 460, y: 1550, radius: 55, label: "Snack counter" },
  // Common room.
  { id: "ludo", activity: "board_games", x: 710, y: 1410, radius: 50, label: "Games table" },
  { id: "games2", activity: "board_games", x: 830, y: 1410, radius: 50, label: "Games table" },
  { id: "tv", activity: "watch_tv", x: 1150, y: 1340, radius: 60, label: "TV corner" },
  { id: "music_corner", activity: "listen_music", x: 1135, y: 1500, radius: 50, label: "Music corner" },
  { id: "rest", activity: "rest", x: 725, y: 1545, radius: 60, label: "Sofa" },
  { id: "tabletennis", activity: "play_tabletennis", x: 985, y: 1545, radius: 55, label: "Table tennis table" },
  // Sick bay, shop, bank.
  { id: "sickbay", activity: "rest_sickbay", x: 1420, y: 1420, radius: 80, label: "Sick bay beds" },
  { id: "shop", activity: "school_shop", x: 1780, y: 1500, radius: 80, label: "School Shop" },
  { id: "bank", activity: "school_bank", x: 2160, y: 1500, radius: 80, label: "School Bank" },
  // Front yard.
  { id: "bus_stop", activity: "bus_to_town", x: 2520, y: 170, radius: 70, label: "Bus stop" },
  { id: "tuck_shop", activity: "tuck_snack", x: 2505, y: 825, radius: 55, label: "Tuck shop" },
  { id: "race", activity: "run_race", x: 2470, y: 530, radius: 70, label: "Running track" },
  { id: "tenten", activity: "play_tenten", x: 2530, y: 1080, radius: 65, label: "Ten-ten circle" },
];

/** Where students arrive: just inside the school gate. */
export const LIFE_SPAWN: Point = { x: 2530, y: 1480 };
