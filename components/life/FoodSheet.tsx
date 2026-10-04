"use client";

import { useState } from "react";
import { getActivity } from "@/lib/life/activities";
import { getLifeClient } from "@/lib/life/client";
import { formatMoney } from "@/lib/life/money";
import { mealKey, searchRestaurants } from "@/lib/life/restaurants";
import { priceOf } from "@/lib/life/sim";
import { cn } from "@/lib/utils";
import { useLifeStore } from "@/store/lifeStore";

/** The Food Court: search Nigerian restaurants and their dishes, then order and eat. */
export function FoodSheet({ onOrdered }: { onOrdered?: () => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const coins = useLifeStore((s) => s.hud?.coins ?? 0);
  const hunger = Math.round(useLifeStore((s) => s.hud?.needs.hunger ?? 0));
  const list = searchRestaurants(query);
  const q = query.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-sun/30 px-3 py-2">
        <span className="text-2xl" aria-hidden>
          🍛
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            Hunger {hunger}% · wallet {formatMoney(coins)}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
            <div className={cn("h-full rounded-full", hunger < 30 ? "bg-danger" : "bg-leaf")} style={{ width: `${hunger}%` }} />
          </div>
        </div>
      </div>
      <label className="sr-only" htmlFor="food-search">
        Search restaurants or food
      </label>
      <input
        id="food-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Search: jollof, suya, shawarma, Chicken Republic…"
        className="min-h-12 rounded-2xl border-2 border-ink/15 bg-white px-3 text-base text-ink outline-none focus:border-brand"
      />
      {list.length === 0 && <p className="text-sm text-ink/60">No restaurant here sells that. Try &quot;rice&quot; or &quot;chicken&quot;.</p>}
      <ul className="flex flex-col gap-2">
        {list.map((r) => {
          // While searching, open every match so the dish is easy to find.
          const expanded = open === r.id || (q !== "" && !r.name.toLowerCase().includes(q));
          const dishes = expanded && q && !r.name.toLowerCase().includes(q) ? r.dishes.filter((d) => d.name.toLowerCase().includes(q)) : r.dishes;
          return (
            <li key={r.id} className="overflow-hidden rounded-2xl border-[3px] bg-white" style={{ borderColor: r.color }}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(open === r.id ? null : r.id)}
                className="flex w-full items-center gap-3 p-2.5 text-left active:bg-ink/5"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-3xl text-white" style={{ backgroundColor: r.color }} aria-hidden>
                  {r.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-black text-ink">{r.name}</span>
                  <span className="block truncate text-xs text-ink/60">{r.about}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-brand">{expanded ? "▲" : "Menu ▼"}</span>
              </button>
              {expanded && (
                <ul className="flex flex-col gap-1 border-t border-ink/10 bg-ink/[0.03] p-2">
                  {dishes.map((d) => {
                    const key = mealKey(r.id, d.id);
                    const def = getActivity(key);
                    const price = def ? priceOf(def, now) : d.price;
                    const deal = price < d.price;
                    return (
                      <li key={d.id} className="flex items-center gap-2 rounded-xl bg-white p-2">
                        <span className="text-2xl" aria-hidden>
                          {d.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-extrabold text-ink">{d.name}</span>
                          <span className="text-xs font-bold text-leaf-dark">
                            +{d.hunger} food{d.fun ? ` · +${d.fun} fun` : ""}
                            {d.social ? ` · +${d.social} friends` : ""}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={price > coins}
                          onClick={() => {
                            if (getLifeClient()?.orderMeal(key)) onOrdered?.();
                          }}
                          className="min-h-11 shrink-0 rounded-xl bg-brand px-3 text-sm font-black text-white active:scale-95 disabled:opacity-40"
                        >
                          {deal && <s className="mr-1 font-bold opacity-60">{formatMoney(d.price)}</s>}
                          {formatMoney(price)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-ink/50">
        Treat Thursday: everything here is half price. Restaurant names belong to their owners; game prices are pretend and much lower than real ones.
      </p>
    </div>
  );
}
