/**
 * The Food Court in town: well-known Nigerian restaurant chains and their favourite dishes.
 * Ordering a dish is a short timed meal (like any other activity) that fills you up.
 * Prices are game prices, scaled to pocket money, not the restaurants' real prices.
 */
import type { ActivityDef } from "./activities";

export type Dish = { id: string; name: string; emoji: string; price: number; hunger: number; fun?: number; social?: number };

export type Restaurant = {
  id: string;
  name: string;
  /** Two short lines for the stall's sign on the map. */
  sign: string;
  emoji: string;
  color: string;
  about: string;
  dishes: Dish[];
};

export const restaurants: Restaurant[] = [
  {
    id: "chicken_republic",
    name: "Chicken Republic",
    sign: "Chicken\nRepublic",
    emoji: "🍗",
    color: "#dc2626",
    about: "Fried chicken and jollof, started in Lagos in 2004.",
    dishes: [
      { id: "refuel", name: "Refuel meal (jollof & chicken)", emoji: "🍗", price: 900, hunger: 55, fun: 4 },
      { id: "chips", name: "Chicken & chips", emoji: "🍟", price: 800, hunger: 50, fun: 3 },
      { id: "wings", name: "Spicy wings", emoji: "🌶️", price: 600, hunger: 35, fun: 6 },
      { id: "icecream", name: "Ice cream cone", emoji: "🍦", price: 300, hunger: 8, fun: 12 },
    ],
  },
  {
    id: "mr_biggs",
    name: "Mr Bigg's",
    sign: "Mr\nBigg's",
    emoji: "🥧",
    color: "#f59e0b",
    about: "Nigeria's first big fast-food chain, famous for meat pies.",
    dishes: [
      { id: "meatpie", name: "Meat pie", emoji: "🥧", price: 350, hunger: 22, fun: 3 },
      { id: "jollof", name: "Jollof rice & chicken", emoji: "🍛", price: 850, hunger: 52, fun: 3 },
      { id: "scotch", name: "Scotch egg", emoji: "🥚", price: 300, hunger: 20 },
      { id: "doughnut", name: "Doughnut", emoji: "🍩", price: 250, hunger: 12, fun: 8 },
    ],
  },
  {
    id: "tantalizers",
    name: "Tantalizers",
    sign: "Tanta-\nlizers",
    emoji: "🍚",
    color: "#16a34a",
    about: "Fried rice, beans and plantain — a Lagos favourite.",
    dishes: [
      { id: "friedrice", name: "Fried rice & chicken", emoji: "🍚", price: 850, hunger: 52, fun: 3 },
      { id: "beans", name: "Beans & dodo", emoji: "🫘", price: 600, hunger: 45 },
      { id: "sausage", name: "Sausage roll", emoji: "🌭", price: 300, hunger: 18, fun: 3 },
      { id: "zobo", name: "Chilled zobo", emoji: "🧃", price: 200, hunger: 5, fun: 8 },
    ],
  },
  {
    id: "sweet_sensation",
    name: "Sweet Sensation",
    sign: "Sweet\nSensation",
    emoji: "🍲",
    color: "#ea580c",
    about: "Proper Nigerian dishes: ofada, swallow and soups.",
    dishes: [
      { id: "ofada", name: "Ofada rice & sauce", emoji: "🍛", price: 800, hunger: 52, fun: 3 },
      { id: "poundo", name: "Pounded yam & egusi", emoji: "🍲", price: 900, hunger: 60 },
      { id: "chinchin", name: "Chin chin", emoji: "🍪", price: 250, hunger: 10, fun: 6 },
    ],
  },
  {
    id: "kilimanjaro",
    name: "Kilimanjaro",
    sign: "Kiliman-\njaro",
    emoji: "🌶️",
    color: "#b91c1c",
    about: "From Port Harcourt: native jollof and peppered chicken.",
    dishes: [
      { id: "native", name: "Native jollof", emoji: "🍛", price: 750, hunger: 50, fun: 3 },
      { id: "pepper", name: "Peppered chicken", emoji: "🍗", price: 650, hunger: 35, fun: 6 },
      { id: "pie", name: "Chicken pie", emoji: "🥧", price: 350, hunger: 22 },
    ],
  },
  {
    id: "bukka_hut",
    name: "Bukka Hut",
    sign: "Bukka\nHut",
    emoji: "🔥",
    color: "#92400e",
    about: "Buka food in a cool spot: suya, moi moi and ofada.",
    dishes: [
      { id: "suya", name: "Ram suya", emoji: "🍢", price: 700, hunger: 35, fun: 8, social: 4 },
      { id: "moimoi", name: "Moi moi", emoji: "🟧", price: 300, hunger: 25 },
      { id: "ayamase", name: "Ofada rice & ayamase", emoji: "🍛", price: 900, hunger: 58 },
      { id: "amala", name: "Amala & ewedu", emoji: "🥣", price: 800, hunger: 55 },
    ],
  },
  {
    id: "mama_cass",
    name: "Mama Cass",
    sign: "Mama\nCass",
    emoji: "🥘",
    color: "#7c3aed",
    about: "Home-style cooking: soups, swallow and plantain.",
    dishes: [
      { id: "ogbono", name: "Eba & ogbono soup", emoji: "🥘", price: 750, hunger: 55 },
      { id: "plantain", name: "Plantain & eggs", emoji: "🍳", price: 600, hunger: 40, fun: 3 },
      { id: "fruit", name: "Fruit salad", emoji: "🍉", price: 400, hunger: 20, fun: 6 },
    ],
  },
  {
    id: "tastee",
    name: "Tastee Fried Chicken",
    sign: "Tastee\nChicken",
    emoji: "🍔",
    color: "#2563eb",
    about: "Crispy chicken and burgers, a classic since the 80s.",
    dishes: [
      { id: "chicken", name: "Fried chicken", emoji: "🍗", price: 700, hunger: 40, fun: 4 },
      { id: "burger", name: "Chicken burger", emoji: "🍔", price: 650, hunger: 38, fun: 5 },
      { id: "coleslaw", name: "Coleslaw", emoji: "🥗", price: 250, hunger: 10 },
    ],
  },
  {
    id: "crunchies",
    name: "Crunchies",
    sign: "Crun-\nchies",
    emoji: "🌯",
    color: "#0891b2",
    about: "Shawarma, burgers and chicken.",
    dishes: [
      { id: "shawarma", name: "Chicken shawarma", emoji: "🌯", price: 700, hunger: 42, fun: 6 },
      { id: "burgerchips", name: "Burger & chips", emoji: "🍔", price: 800, hunger: 48, fun: 4 },
      { id: "smoothie", name: "Smoothie", emoji: "🥤", price: 350, hunger: 8, fun: 10 },
    ],
  },
  {
    id: "mamas_bukka",
    name: "Mama's Bukka",
    sign: "Mama's\nBukka",
    emoji: "🍛",
    color: "#a16207",
    about: "The town's own buka: cheap, filling and friendly.",
    dishes: [
      { id: "ricestew", name: "Rice & stew", emoji: "🍛", price: 400, hunger: 40 },
      { id: "akara", name: "Akara & pap", emoji: "🥣", price: 300, hunger: 30, fun: 2 },
      { id: "puffpuff", name: "Puff-puff", emoji: "🟤", price: 150, hunger: 10, fun: 4 },
    ],
  },
];

export const mealKey = (restaurantId: string, dishId: string) => `meal_${restaurantId}_${dishId}`;

/** Every dish as a timed eating activity, so meals use the same rules as everything else. */
export function mealActivities(): Record<string, ActivityDef> {
  const out: Record<string, ActivityDef> = {};
  for (const r of restaurants) {
    for (const d of r.dishes) {
      const key = mealKey(r.id, d.id);
      out[key] = {
        key,
        label: `${d.name} at ${r.name}`,
        emoji: d.emoji,
        verb: `eating ${d.name.toLowerCase()}`,
        durationSec: d.hunger >= 40 ? 8 : 5,
        cost: d.price,
        effects: { hunger: d.hunger, ...(d.fun ? { fun: d.fun } : {}), ...(d.social ? { social: d.social } : {}) },
        counter: d.hunger >= 30 ? "meals" : "snacks",
        tag: "bukka",
      };
    }
  }
  return out;
}

/** Restaurants whose name or dishes match a search ("jollof", "suya", "chicken"…). */
export function searchRestaurants(query: string): Restaurant[] {
  const q = query.trim().toLowerCase();
  if (!q) return restaurants;
  return restaurants.filter((r) => r.name.toLowerCase().includes(q) || r.dishes.some((d) => d.name.toLowerCase().includes(q)));
}
