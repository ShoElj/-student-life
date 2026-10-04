"use client";

import { useState } from "react";
import { getLifeClient } from "@/lib/life/client";
import { dateKey } from "@/lib/life/events";
import {
  furniture,
  getFurniture,
  getHouse,
  houses,
  nextHouse,
  slotUnlocked,
  studyBonus,
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
import { level } from "@/lib/life/sim";
import { cn } from "@/lib/utils";
import { useLifeStore } from "@/store/lifeStore";
import { LookAvatar } from "./LookPreview";

type BedroomSlot = "poster" | "shelf" | "tv" | "bed" | "desk" | "lamp" | "rug" | "sofa" | "plant" | "petbed";
const BEDROOM: BedroomSlot[] = ["poster", "shelf", "tv", "bed", "desk", "lamp", "rug", "sofa", "plant", "petbed"];

/** Where each piece of furniture sits in the room picture (percent of width/height). */
const PLACES: Record<BedroomSlot, { left: number; top: number; size: number }> = {
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

/** One piece of furniture drawn as a big emoji at a spot in a picture. */
function Thing({ slot, home, left, top, size }: { slot: RoomSlot; home: Home | null; left: number; top: number; size: number }) {
  const item = getFurniture(home?.items[slot]);
  if (!item) return null;
  return (
    <span
      title={item.name}
      className="absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)]"
      style={{ left: `${left}%`, top: `${top}%`, fontSize: `${(size / 4.2).toFixed(1)}cqw` }}
    >
      {item.emoji}
    </span>
  );
}

/** A picture of a home: the bedroom, then the kitchen and the yard once the home has them. */
export function RoomView({ home, title, petDancing = false }: { home: Home | null; title: string; petDancing?: boolean }) {
  const [today] = useState(() => dateKey(Date.now()));
  const pet = home?.pet;
  const house = getHouse(home?.house);
  const hasKitchen = slotUnlocked(home ?? undefined, "kitchen");
  const hasYard = slotUnlocked(home ?? undefined, "garden");
  return (
    <figure className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border-4 border-[#7c4a21] shadow-inner" aria-label={`${title}: ${house.name}`}>
      <div
        className="relative aspect-[16/10] w-full select-none [container-type:inline-size]"
        style={{ background: `linear-gradient(${home?.wall ?? WALL_COLOURS[0]} 0 48%, ${house.floor} 48% 100%)` }}
      >
        {/* Skirting board, floor planks and a window. */}
        <div className="absolute inset-x-0 top-[48%] h-[3%] bg-[#7c4a21]/60" />
        <div className="absolute inset-x-0 bottom-0 h-[49%] bg-[repeating-linear-gradient(90deg,transparent_0_15%,rgba(0,0,0,0.08)_15%_15.4%)]" />
        <div className="absolute top-[8%] left-[33%] h-[26%] w-[12%] rounded-md border-4 border-white bg-gradient-to-b from-sky-300 to-sky-100 shadow">
          <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-white" />
          <span className="absolute right-1 bottom-0 text-[10px]">☁️</span>
        </div>
        {BEDROOM.map((slot) => {
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
          return <Thing key={slot} slot={slot} home={home} {...at} />;
        })}
        {pet && (
          <span
            className={cn("absolute bottom-[6%] left-[40%] text-[9cqw] drop-shadow", petDancing ? "animate-bounce" : "")}
            title={`${pet.name} ${petMood(pet, today).emoji}`}
          >
            {pets[pet.kind].emoji}
          </span>
        )}
        <span className="absolute top-[3%] right-[3%] rounded-full bg-white/80 px-2 py-0.5 text-[3.2cqw] font-black text-[#7c4a21]">
          {house.emoji} {house.name}
        </span>
      </div>
      {hasKitchen && (
        <div className="relative aspect-[16/5] w-full border-t-4 border-[#7c4a21] bg-[linear-gradient(#e0f2fe_0_45%,#f8fafc_45%_100%)] [container-type:inline-size]">
          <div className="absolute inset-x-0 bottom-0 h-[55%] bg-[repeating-conic-gradient(#e2e8f0_0_25%,#f8fafc_0_50%)] bg-[length:8%_25%] opacity-80" />
          <span className="absolute top-[8%] left-[3%] text-[2.8cqw] font-black text-ink/40">KITCHEN &amp; SITTING ROOM</span>
          <Thing slot="kitchen" home={home} left={14} top={58} size={40} />
          <Thing slot="dining" home={home} left={50} top={62} size={40} />
          <Thing slot="gen" home={home} left={86} top={60} size={34} />
        </div>
      )}
      {hasYard && (
        <div className="relative aspect-[16/5] w-full border-t-4 border-[#7c4a21] bg-[linear-gradient(#bae6fd_0_35%,#86c46d_35%_100%)] [container-type:inline-size]">
          <span className="absolute top-[8%] left-[3%] text-[2.8cqw] font-black text-ink/40">YARD</span>
          <span className="absolute top-[6%] right-[8%] text-[6cqw]">☀️</span>
          <Thing slot="garden" home={home} left={16} top={62} size={42} />
          <Thing slot="bike" home={home} left={44} top={64} size={36} />
          <Thing slot="pool" home={home} left={76} top={64} size={46} />
        </div>
      )}
      <figcaption className="flex items-center justify-between bg-[#7c4a21] px-3 py-1.5 text-sm font-bold text-white">
        <span className="truncate">{title}</span>
        <span>Home value {formatMoney(roomValue(home ?? undefined))}</span>
      </figcaption>
    </figure>
  );
}

/** Moving up the property ladder: room → self-contain → mini flat → bungalow → duplex. */
function Homes({ home }: { home: Home }) {
  const coins = useLifeStore((s) => s.hud?.coins ?? 0);
  const xp = useLifeStore((s) => s.hud?.xp ?? 0);
  const myLevel = level(xp);
  const current = getHouse(home.house);
  const next = nextHouse(home);
  const client = getLifeClient();
  return (
    <div className="flex flex-col gap-2">
      <p className="rounded-2xl bg-sun/30 px-3 py-2 text-sm text-ink/80">
        Grow up the property ladder! Each home needs a <b>level</b> (study and work to level up) and the <b>money</b>. Bigger homes mean better sleep (
        {current.sleepEnergy} energy now), better studying at your desk (×{studyBonus(home).toFixed(2)}) and more places to furnish.
      </p>
      <ol className="flex flex-col gap-2">
        {houses.map((h) => {
          const lived = houses.indexOf(h) <= houses.indexOf(current);
          const isNext = next?.key === h.key;
          const levelOk = myLevel >= h.minLevel;
          const canBuy = isNext && levelOk && coins >= h.price;
          return (
            <li key={h.key} className={cn("flex items-center gap-3 rounded-2xl border-[3px] p-2.5", h.key === current.key ? "border-leaf bg-leaf/10" : "border-ink/10 bg-white")}>
              <span className="text-4xl" aria-hidden>
                {h.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold text-ink">{h.name}</span>
                <span className="block text-xs text-ink/70">{h.blurb}</span>
                {!lived && (
                  <span className="text-xs font-bold text-brand">
                    {formatMoney(h.price)} · <span className={levelOk ? "text-leaf-dark" : "text-danger"}>Level {h.minLevel}</span>
                  </span>
                )}
              </span>
              {h.key === current.key ? (
                <span className="shrink-0 rounded-full bg-leaf px-3 py-1 text-xs font-black text-white">You live here</span>
              ) : lived ? (
                <span className="shrink-0 text-xs font-bold text-ink/40">Moved out ✓</span>
              ) : isNext ? (
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => client?.buyHouse(h.key)}
                  className="min-h-11 shrink-0 rounded-xl bg-brand px-3 text-sm font-black text-white active:scale-95 disabled:opacity-40"
                >
                  {!levelOk ? `🔒 Lv ${h.minLevel}` : coins < h.price ? "Save up" : "Move in"}
                </button>
              ) : (
                <span className="shrink-0 text-lg" aria-label="Locked">
                  🔒
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-ink/50">Tip: keep money in the bank — it earns interest every night while you save for your next home.</p>
    </div>
  );
}

function Decorate({ home, shop }: { home: Home; shop: boolean }) {
  const coins = useLifeStore((s) => s.hud?.coins ?? 0);
  const [slot, setSlot] = useState<RoomSlot>("bed");
  const client = getLifeClient();
  const items = furniture.filter((f) => f.slot === slot);
  const locked = !slotUnlocked(home, slot);
  const needs = getHouse(ROOM_SLOTS.find((r) => r.slot === slot)?.house);
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
            {slotUnlocked(home, s.slot) ? "" : "🔒 "}
            {s.label}
          </button>
        ))}
      </div>
      {locked && <p className="rounded-2xl bg-ink/5 px-3 py-2 text-sm font-bold text-ink/70">🔒 You need a {needs.name.toLowerCase()} for this. See the Homes tab in your room.</p>}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const owned = home.owned.includes(item.id);
          const placed = home.items[slot] === item.id;
          const canAct = !locked && (owned ? !placed : shop && item.price <= coins);
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
        <RoomView home={person.home} title={`${person.name}'s home`} />
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
  const [tab, setTab] = useState<"decorate" | "homes" | "pet" | "visit">("decorate");
  if (!home) return null;
  const shop = mode === "furniture";
  return (
    <div className="flex flex-col gap-3">
      <RoomView home={home} title={`${me?.name ?? "Your"}'s home`} petDancing />
      {!shop && (
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-ink/5 p-1" role="tablist" aria-label="Home">
          {(
            [
              ["decorate", "🛋️ Room"],
              ["homes", "🏡 Homes"],
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
      {!shop && tab === "homes" && <Homes home={home} />}
      {!shop && tab === "pet" && <PetCorner home={home} />}
      {!shop && tab === "visit" && <Visit />}
    </div>
  );
}
