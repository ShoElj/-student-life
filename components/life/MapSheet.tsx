"use client";

import { useEffect, useState } from "react";
import { activities } from "@/lib/life/activities";
import { getLifeClient } from "@/lib/life/client";
import { worlds } from "@/lib/life/worlds";
import { useLifeStore } from "@/store/lifeStore";

type Dot = { id: string; x: number; y: number; name: string };

/** The whole school with "you are here" and classmates who are at school. */
export function MapSheet({ onWalk }: { onWalk?: () => void }) {
  const [dots, setDots] = useState<{ me: Dot | null; mates: Dot[] }>({ me: null, mates: [] });

  useEffect(() => {
    const read = () => {
      const client = getLifeClient();
      if (!client) return;
      setDots({
        me: { id: client.studentId, x: client.sim.x, y: client.sim.y, name: client.name },
        mates: [...client.classmates.values()].filter((c) => c.world === client.sim.world).map((c) => ({ id: c.id, x: c.display.x, y: c.display.y, name: c.name })),
      });
    };
    read();
    const t = setInterval(read, 400);
    return () => clearInterval(t);
  }, []);

  const world = worlds[useLifeStore((st) => st.hud?.world ?? "school")];
  const rooms = world.zones.filter((z) => !z.isLink);
  const walk = (x: number, y: number, label: string) => {
    if (getLifeClient()?.walkTo({ x, y }, label)) onWalk?.();
  };
  // One button per room: walk to its first sign, or to its middle.
  const places = rooms
    .filter((z) => z.label && !/corridor|road/i.test(z.label))
    .map((z) => {
      const spot = world.spots.find((s) => s.x > z.x && s.x < z.x + z.width && s.y > z.y && s.y < z.y + z.height);
      return {
        key: z.key,
        label: z.label!,
        emoji: spot ? (activities[spot.activity]?.emoji ?? "📍") : "📍",
        x: spot?.x ?? z.x + z.width / 2,
        y: spot?.y ?? z.y + z.height / 2,
      };
    });
  const doors = world.zones.filter((z) => z.isLink);
  const here = dots.me ? rooms.find((z) => dots.me!.x >= z.x && dots.me!.x <= z.x + z.width && dots.me!.y >= z.y && dots.me!.y <= z.y + z.height) : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-base text-ink/70">
        📍 You are {here ? <b className="text-brand">in the {here.label}</b> : "walking between rooms"}. Classmates at school show as{" "}
        <span className="font-bold text-leaf-dark">green dots</span>.
      </p>
      <div className="overflow-x-auto rounded-2xl bg-[#8fcf7a] p-1.5">
        <svg
          viewBox={`0 0 ${world.size.width} ${world.size.height}`}
          className="h-auto w-full min-w-[34rem]"
          role="img"
          aria-label={`Map of the ${world.key === "town" ? "town" : "school"}.${here ? ` You are in the ${here.label}.` : ""}`}
        >
          {doors.map((d) => (
            <rect key={d.key} x={d.x} y={d.y} width={d.width} height={d.height} fill={d.floor} />
          ))}
          {rooms.map((z) => (
            <g key={z.key}>
              <rect x={z.x} y={z.y} width={z.width} height={z.height} rx={12} fill={z.floor} stroke="#1e3a8a" strokeWidth={8} />
              <text
                x={z.x + z.width / 2}
                y={z.y + (z.height > 150 ? 56 : z.height / 2 + 16)}
                textAnchor="middle"
                fontSize={Math.min(z.height > 150 ? 46 : 40, (z.width - 24) / (0.6 * (z.label?.length ?? 1)))}
                fontWeight={900}
                fill="#1e3a8a"
              >
                {z.label}
              </text>
            </g>
          ))}
          {world.spots.map((s) => (
            <text
              key={s.id}
              x={s.x}
              y={s.y + 18}
              textAnchor="middle"
              fontSize={44}
              opacity={0.9}
              style={{ cursor: "pointer" }}
              onClick={() => walk(s.x, s.y, s.label)}
            >
              {activities[s.activity]?.emoji}
            </text>
          ))}
          {dots.mates.map((m) => (
            <g key={m.id}>
              <circle cx={m.x} cy={m.y} r={22} fill="#16a34a" stroke="#fff" strokeWidth={8} />
              <text x={m.x} y={m.y - 34} textAnchor="middle" fontSize={34} fontWeight={800} fill="#14532d">
                {m.name}
              </text>
            </g>
          ))}
          {dots.me && (
            <g>
              <circle cx={dots.me.x} cy={dots.me.y} r={46} fill="#facc15" opacity={0.45}>
                <animate attributeName="r" values="30;60;30" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={dots.me.x} cy={dots.me.y} r={26} fill="#facc15" stroke="#1e3a8a" strokeWidth={9} />
            </g>
          )}
        </svg>
      </div>
      <p className="text-sm font-bold text-ink/70">Tap a sign on the map, or a place below, and you&apos;ll walk there.</p>
      <div className="flex flex-wrap gap-1.5">
        {places.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => walk(p.x, p.y, p.label)}
            className="min-h-10 rounded-full bg-sky px-3 text-sm font-bold text-brand active:scale-95"
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink/50">
        {world.key === "town"
          ? "The Bus Park 🚌 on the right takes you back to school."
          : "The bus stop 🚌 to town, tuck shop 🍬 and school gate are in the Front Yard on the right."}
      </p>
    </div>
  );
}
