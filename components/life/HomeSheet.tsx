"use client";

import { useState } from "react";
import { getLifeClient } from "@/lib/life/client";
import { dateKey } from "@/lib/life/events";
import {
  furniture,
  getFurniture,
  petMood,
  pets,
  PET_FOOD_PRICE,
  ROOM_SLOTS,
  roomValue,
  WALL_COLOURS,
  type Home,
  type PetKind,
  type RoomSlot,
} from "@/lib/life/home";
import { formatMoney } from "@/lib/life/money";
import { cn } from "@/lib/utils";
import { useLifeStore } from "@/store/lifeStore";
import { LookAvatar } from "./LookPreview";

/** Where each piece of furniture sits in the room picture (percent of width/height). */
const PLACES: Record<RoomSlot, { left: number; top: number; size: number }> = {
  poster: { left: 18, top: 14, size: 34 },
  shelf: { left: 50, top: 12, size: 34 },
  tv: { left: 80, top: 30, size: 40 },
  bed: { left: 16, top: 66, size: 54 },
  desk: { left: 82, top: 66, size: 40 },
  lamp: { left: 90, top: 50, size: 26 },
  rug: { left: 50, top: 76, size: 58 },
  sofa: { left: 52, top: 56, size: 40 },
  plant: { left: 6, top: 44, size: 32 },
  petbed: { left: 66, top: 86, size: 30 },
};

/** A picture of a room: wall, window, floor and whatever furniture is in it. */
export function RoomView({ home, title, petDancing = false }: { home: Home | null; title: string; petDancing?: boolean }) {
  const [today] = useState(() => dateKey(Date.now()));
  const pet = home?.pet;
  return (
    <figure className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border-4 border-[#7c4a21] shadow-inner" aria-label={title}>
      <div className="relative aspect-[16/10] w-full select-none [container-type:inline-size]" style={{ background: `linear-gradient(${home?.wall ?? WALL_COLOURS[0]} 0 48%, #c08552 48% 100%)` }}>
        {/* Skirting board, floor planks and a window. */}
        <div className="absolute inset-x-0 top-[48%] h-[3%] bg-[#7c4a21]/60" />
        <div className="absolute inset-x-0 bottom-0 h-[49%] bg-[repeating-linear-gradient(90deg,transparent_0_15%,rgba(0,0,0,0.08)_15%_15.4%)]" />
        <div className="absolute top-[8%] left-[33%] h-[26%] w-[12%] rounded-md border-4 border-white bg-gradient-to-b from-sky-300 to-sky-100 shadow">
          <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-white" />
          <span className="absolute right-1 bottom-0 text-[10px]">☁️</span>
        </div>
        {ROOM_SLOTS.map(({ slot }) => {
          const item = getFurniture(home?.items[slot]);
          if (!item) return null;
          const at = PLACES[slot];
          if (slot === "rug") {
            return (
              <div
                key={slot}
                className={cn("absolute h-[14%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] shadow-inner", item.id === "rug_ankara" ? "bg-[repeating-linear-gradient(45deg,#7c3aed_0_8px,#f59e0b_8px_16px,#16a34a_16px_24px)]" : "bg-red-500")}
                style={{ left: `${at.left}%`, top: `${at.top}%` }}
                title={item.name}
              />
            );
          }
          return (
            <span
              key={slot}
              title={item.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)]"
              style={{ left: `${at.left}%`, top: `${at.top}%`, fontSize: `${(at.size / 4.2).toFixed(1)}cqw` }}
            >
              {item.emoji}
            </span>
          );
        })}
        {pet && (
          <span
            className={cn("absolute bottom-[6%] left-[40%] text-[9cqw] drop-shadow", petDancing ? "animate-bounce" : "")}
            title={`${pet.name} ${petMood(pet, today).emoji}`}
          >
            {pets[pet.kind].emoji}
          </span>
        )}
      </div>
      <figcaption className="flex items-center justify-between bg-[#7c4a21] px-3 py-1.5 text-sm font-bold text-white">
        <span className="truncate">{title}</span>
        <span>Room value {formatMoney(roomValue(home ?? undefined))}</span>
      </figcaption>
    </figure>
  );
}

function Decorate({ home, shop }: { home: Home; shop: boolean }) {
  const coins = useLifeStore((s) => s.hud?.coins ?? 0);
  const [slot, setSlot] = useState<RoomSlot>("bed");
  const client = getLifeClient();
  const items = furniture.filter((f) => f.slot === slot);
  return (
    <div className="flex flex-col gap-2">
      <p className={cn("rounded-2xl px-3 py-2 text-sm font-bold", shop ? "bg-leaf/15 text-leaf-dark" : "bg-sun/30 text-ink/80")}>
        {shop ? `🛋️ Furniture shop — tap to buy (you have ${formatMoney(coins)}). It goes straight into your room.` : "🏠 Swap in things you own. New furniture is sold at the furniture shop in town."}
      </p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Room places">
        {ROOM_SLOTS.map((s) => (
          <button
            key={s.slot}
            type="button"
            role="tab"
            aria-selected={slot === s.slot}
            onClick={() => setSlot(s.slot)}
            className={cn("min-h-10 shrink-0 rounded-full px-3 text-sm font-bold", slot === s.slot ? "bg-brand text-white" : "bg-ink/5 text-ink")}
          >
            {s.label}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const owned = home.owned.includes(item.id);
          const placed = home.items[slot] === item.id;
          const canAct = owned ? !placed : shop && item.price <= coins;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!canAct && !placed}
                onClick={() => {
                  if (placed) client?.placeFurniture(slot, null);
                  else if (owned) client?.placeFurniture(slot, item.id);
                  else client?.buyFurniture(item.id);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-2xl border-[3px] bg-white p-2 text-left active:scale-95 disabled:opacity-50",
                  placed ? "border-leaf" : "border-ink/10",
                )}
              >
                <span className="text-3xl" aria-hidden>
                  {item.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-ink">{item.name}</span>
                  <span className={cn("text-xs font-bold", placed ? "text-leaf-dark" : owned ? "text-ink/50" : "text-brand")}>
                    {placed ? "In your room · tap to remove" : owned ? "Owned · tap to use" : shop ? formatMoney(item.price) : `${formatMoney(item.price)} at the shop`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!shop && (
        <div>
          <p className="mb-1 text-xs font-bold text-ink/60">Wall paint (free)</p>
          <div className="flex gap-2">
            {WALL_COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Paint the wall ${c}`}
                aria-pressed={home.wall === c}
                onClick={() => client?.paintWall(c)}
                className={cn("h-10 w-10 rounded-full border-4", home.wall === c ? "border-brand" : "border-white shadow")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PetCorner({ home }: { home: Home }) {
  const coins = useLifeStore((s) => s.hud?.coins ?? 0);
  const [name, setName] = useState("");
  const client = getLifeClient();
  const [today] = useState(() => dateKey(Date.now()));
  const pet = home.pet;
  if (pet) {
    const mood = petMood(pet, today);
    const fedToday = pet.lastFed === today;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-sky p-3">
          <span className="text-5xl" aria-hidden>
            {pets[pet.kind].emoji}
          </span>
          <div>
            <p className="text-lg font-black text-ink">
              {pet.name} {mood.emoji}
            </p>
            <p className={cn("text-sm", mood.happy ? "text-ink/70" : "font-bold text-danger")}>{mood.text}</p>
            <p className="text-xs text-ink/60">Feed {pet.name} every day. They follow you everywhere!</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={fedToday || coins < PET_FOOD_PRICE}
            onClick={() => client?.feedPet()}
            className="min-h-14 rounded-2xl bg-leaf text-base font-black text-white active:scale-95 disabled:opacity-40"
          >
            🍖 {fedToday ? "Fed today" : `Feed · ${formatMoney(PET_FOOD_PRICE)}`}
          </button>
          <button type="button" onClick={() => client?.playWithPet()} className="min-h-14 rounded-2xl bg-sun text-base font-black text-ink active:scale-95">
            🎾 Play together
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink/70">Adopt a pet! They live in your room, follow you around school and town, and cheer you up. Remember to feed them every day.</p>
      <label htmlFor="pet-name" className="text-xs font-bold text-ink/60">
        Name your pet
      </label>
      <input
        id="pet-name"
        maxLength={16}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Bisi"
        className="min-h-12 rounded-2xl border-2 border-ink/15 bg-white px-3 text-base text-ink outline-none focus:border-brand"
      />
      <ul className="grid grid-cols-2 gap-2">
        {(Object.keys(pets) as PetKind[]).map((k) => (
          <li key={k}>
            <button
              type="button"
              disabled={pets[k].price > coins}
              onClick={() => client?.adoptPet(k, name)}
              className="flex w-full items-center gap-2 rounded-2xl border-[3px] border-ink/10 bg-white p-2 text-left active:scale-95 disabled:opacity-50"
            >
              <span className="text-4xl" aria-hidden>
                {pets[k].emoji}
              </span>
              <span>
                <span className="block text-base font-extrabold text-ink">{pets[k].name}</span>
                <span className="text-xs font-bold text-brand">{formatMoney(pets[k].price)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Visit() {
  const roster = useLifeStore((s) => s.roster);
  const [who, setWho] = useState<string | null>(null);
  const person = roster.find((r) => r.id === who);
  if (person) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setWho(null)} className="min-h-10 self-start rounded-xl bg-ink/5 px-3 text-sm font-bold text-brand">
          ← Classmates
        </button>
        <RoomView home={person.home} title={`${person.name}'s room`} />
        {!person.home?.pet && Object.keys(person.home?.items ?? {}).length <= 1 && <p className="text-sm text-ink/60">{person.name} hasn&apos;t decorated yet.</p>}
      </div>
    );
  }
  const withRooms = [...roster].sort((a, b) => roomValue(b.home ?? undefined) - roomValue(a.home ?? undefined));
  return withRooms.length === 0 ? (
    <p className="text-sm text-ink/60">No classmates yet. Share your school code so friends can join!</p>
  ) : (
    <ul className="flex flex-col gap-2">
      {withRooms.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => setWho(r.id)} className="flex w-full items-center gap-3 rounded-2xl bg-ink/5 p-2 text-left active:bg-sun/30">
            <LookAvatar look={r.look} size={40} />
            <span className="min-w-0 flex-1 truncate text-base font-extrabold text-ink">
              {r.name} {r.home?.pet ? pets[r.home.pet.kind].emoji : ""}
            </span>
            <span className="text-sm font-bold text-brand">{formatMoney(roomValue(r.home ?? undefined))} · Visit →</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Your room at home: decorate, look after your pet, and visit classmates' rooms. */
export function HomeSheet({ mode }: { mode: "home" | "furniture" }) {
  const home = useLifeStore((s) => s.hud?.home ?? null);
  const me = useLifeStore((s) => s.me);
  const [tab, setTab] = useState<"decorate" | "pet" | "visit">("decorate");
  if (!home) return null;
  const shop = mode === "furniture";
  return (
    <div className="flex flex-col gap-3">
      <RoomView home={home} title={`${me?.name ?? "Your"}'s room`} petDancing />
      {!shop && (
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-ink/5 p-1" role="tablist" aria-label="Home">
          {(
            [
              ["decorate", "🛋️ Decorate"],
              ["pet", "🐾 Pet"],
              ["visit", "🏘️ Visit"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn("min-h-10 rounded-xl text-sm font-bold", tab === key ? "bg-white text-brand shadow" : "text-ink/60")}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {(shop || tab === "decorate") && <Decorate home={home} shop={shop} />}
      {!shop && tab === "pet" && <PetCorner home={home} />}
      {!shop && tab === "visit" && <Visit />}
    </div>
  );
}
