/**
 * Each student's room at home, and their pet. Furniture is bought at the town's furniture shop
 * and each piece fills one place in the room (a new bed replaces the old one). Rooms and pets are
 * saved with the student, so classmates can come and see them.
 */
import { formatMoney, spend } from "./money";
import type { LifeProfile } from "./types";

export type RoomSlot = "bed" | "desk" | "rug" | "poster" | "lamp" | "plant" | "tv" | "shelf" | "sofa" | "petbed";

export type FurnitureItem = { id: string; slot: RoomSlot; name: string; emoji: string; price: number };

export const ROOM_SLOTS: { slot: RoomSlot; label: string }[] = [
  { slot: "bed", label: "Bed" },
  { slot: "desk", label: "Desk" },
  { slot: "rug", label: "Rug" },
  { slot: "poster", label: "Wall art" },
  { slot: "lamp", label: "Lamp" },
  { slot: "plant", label: "Plant" },
  { slot: "tv", label: "TV & games" },
  { slot: "shelf", label: "Shelf" },
  { slot: "sofa", label: "Seat" },
  { slot: "petbed", label: "Pet bed" },
];

export const furniture: FurnitureItem[] = [
  { id: "bed_mat", slot: "bed", name: "Sleeping mat", emoji: "🛏️", price: 0 },
  { id: "bed_single", slot: "bed", name: "Comfy bed", emoji: "🛏️", price: 2000 },
  { id: "bed_royal", slot: "bed", name: "Royal bed", emoji: "👑", price: 6000 },
  { id: "desk_basic", slot: "desk", name: "Study desk", emoji: "📚", price: 1200 },
  { id: "desk_pc", slot: "desk", name: "Gaming desk", emoji: "💻", price: 5000 },
  { id: "rug_red", slot: "rug", name: "Red rug", emoji: "🟥", price: 600 },
  { id: "rug_ankara", slot: "rug", name: "Ankara rug", emoji: "🟪", price: 1500 },
  { id: "poster_star", slot: "poster", name: "Football star poster", emoji: "⚽", price: 400 },
  { id: "poster_art", slot: "poster", name: "Painting", emoji: "🖼️", price: 1200 },
  { id: "poster_flag", slot: "poster", name: "Naija flag", emoji: "🇳🇬", price: 500 },
  { id: "lamp_desk", slot: "lamp", name: "Desk lamp", emoji: "💡", price: 500 },
  { id: "lamp_lava", slot: "lamp", name: "Fairy lights", emoji: "✨", price: 1400 },
  { id: "plant_small", slot: "plant", name: "Small plant", emoji: "🪴", price: 400 },
  { id: "plant_palm", slot: "plant", name: "Palm tree", emoji: "🌴", price: 1600 },
  { id: "tv_small", slot: "tv", name: "Small TV", emoji: "📺", price: 3000 },
  { id: "tv_console", slot: "tv", name: "TV and console", emoji: "🎮", price: 7000 },
  { id: "shelf_books", slot: "shelf", name: "Bookshelf", emoji: "📚", price: 900 },
  { id: "shelf_trophy", slot: "shelf", name: "Trophy shelf", emoji: "🏆", price: 2500 },
  { id: "sofa_beanbag", slot: "sofa", name: "Bean bag", emoji: "🛋️", price: 1500 },
  { id: "sofa_couch", slot: "sofa", name: "Couch", emoji: "🛋️", price: 3500 },
  { id: "petbed_basket", slot: "petbed", name: "Pet basket", emoji: "🧺", price: 700 },
];

export function getFurniture(id: string | undefined): FurnitureItem | undefined {
  return furniture.find((f) => f.id === id);
}

export type PetKind = "cat" | "dog" | "rabbit" | "parrot";

export const pets: Record<PetKind, { name: string; emoji: string; price: number }> = {
  rabbit: { name: "Rabbit", emoji: "🐇", price: 1500 },
  cat: { name: "Cat", emoji: "🐈", price: 2500 },
  dog: { name: "Dog", emoji: "🐕", price: 3000 },
  parrot: { name: "Parrot", emoji: "🦜", price: 4000 },
};

export const PET_FOOD_PRICE = 200;

export type Pet = { kind: PetKind; name: string; lastFed: string; lastPlayed: number };

export type Home = {
  /** What fills each place in the room. */
  items: Partial<Record<RoomSlot, string>>;
  owned: string[];
  wall: string;
  pet?: Pet;
};

export const WALL_COLOURS = ["#fde68a", "#bfdbfe", "#fbcfe8", "#bbf7d0", "#e9d5ff", "#fed7aa"];

export function newHome(): Home {
  return { items: { bed: "bed_mat" }, owned: ["bed_mat"], wall: WALL_COLOURS[0] };
}

/** What everything in the room is worth (for the "best room" leaderboard). */
export function roomValue(home: Home | undefined): number {
  if (!home) return 0;
  return Object.values(home.items).reduce((sum, id) => sum + (getFurniture(id)?.price ?? 0), 0) + (home.pet ? pets[home.pet.kind].price : 0);
}

export type HomeResult = { ok: true } | { ok: false; reason: string };

/** Buys a piece of furniture (at the shop) and puts it in its place. */
export function buyFurniture(profile: LifeProfile, itemId: string, now = Date.now()): HomeResult {
  const item = getFurniture(itemId);
  if (!item) return { ok: false, reason: "That isn't for sale." };
  const home = (profile.home ??= newHome());
  if (!home.owned.includes(item.id)) {
    if (!spend(profile, item.price, `Bought ${item.name.toLowerCase()}`, now)) return { ok: false, reason: `You need ${formatMoney(item.price)}` };
    home.owned.push(item.id);
  }
  home.items[item.slot] = item.id;
  return { ok: true };
}

/** Puts something I already own in its place, or clears the place. */
export function placeFurniture(profile: LifeProfile, slot: RoomSlot, itemId: string | null): HomeResult {
  const home = (profile.home ??= newHome());
  if (itemId === null) {
    delete home.items[slot];
    return { ok: true };
  }
  const item = getFurniture(itemId);
  if (!item || item.slot !== slot || !home.owned.includes(itemId)) return { ok: false, reason: "You don't own that." };
  home.items[slot] = itemId;
  return { ok: true };
}

export function adoptPet(profile: LifeProfile, kind: PetKind, rawName: string, today: string, now = Date.now()): HomeResult {
  const home = (profile.home ??= newHome());
  if (home.pet) return { ok: false, reason: `You already have ${home.pet.name}.` };
  const name = rawName.trim().slice(0, 16) || pets[kind].name;
  if (!spend(profile, pets[kind].price, `Adopted ${name} the ${pets[kind].name.toLowerCase()}`, now)) {
    return { ok: false, reason: `You need ${formatMoney(pets[kind].price)}` };
  }
  home.pet = { kind, name, lastFed: today, lastPlayed: 0 };
  return { ok: true };
}

/** Days since the pet was last fed (by calendar date). */
export function daysHungry(pet: Pet, today: string): number {
  const ms = Date.parse(`${today}T00:00:00`) - Date.parse(`${pet.lastFed}T00:00:00`);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 86_400_000)) : 0;
}

export function petMood(pet: Pet, today: string): { emoji: string; text: string; happy: boolean } {
  const days = daysHungry(pet, today);
  if (days === 0) return { emoji: "😊", text: `${pet.name} is happy and full.`, happy: true };
  if (days === 1) return { emoji: "🙂", text: `${pet.name} is getting hungry. Feed them today!`, happy: true };
  return { emoji: "😿", text: `${pet.name} is very hungry — ${days} days without food!`, happy: false };
}

export function feedPet(profile: LifeProfile, today: string, now = Date.now()): HomeResult {
  const pet = profile.home?.pet;
  if (!pet) return { ok: false, reason: "You don't have a pet yet." };
  if (pet.lastFed === today) return { ok: false, reason: `${pet.name} has already eaten today.` };
  if (!spend(profile, PET_FOOD_PRICE, `Food for ${pet.name}`, now)) return { ok: false, reason: `Pet food costs ${formatMoney(PET_FOOD_PRICE)}` };
  pet.lastFed = today;
  return { ok: true };
}

export const PET_PLAY_COOLDOWN_MS = 60_000;

/** Repairs a saved home (older saves, or one sent by a classmate's device). */
export function sanitizeHome(raw: unknown): Home | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<Home>;
  const owned = Array.isArray(r.owned) ? r.owned.filter((id): id is string => typeof id === "string" && Boolean(getFurniture(id))) : [];
  const items: Home["items"] = {};
  for (const { slot } of ROOM_SLOTS) {
    const id = r.items?.[slot];
    if (typeof id === "string" && getFurniture(id)?.slot === slot) items[slot] = id;
  }
  const wall = typeof r.wall === "string" && WALL_COLOURS.includes(r.wall) ? r.wall : WALL_COLOURS[0];
  const p = r.pet;
  const pet =
    p && typeof p === "object" && p.kind in pets && typeof p.name === "string" && typeof p.lastFed === "string"
      ? { kind: p.kind, name: p.name.slice(0, 16), lastFed: p.lastFed, lastPlayed: Number(p.lastPlayed) || 0 }
      : undefined;
  return { items, owned, wall, pet };
}
