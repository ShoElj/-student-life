"use client";

import { useState } from "react";
import { bouncing, FREE_THROWS, throwScores, throwZone } from "@/lib/life/sports";
import { cn } from "@/lib/utils";
import { BigButton, Flash, Meter, useFrame, useKeys, type SportGameProps } from "./shared";

/** Free throws: stop the marker in the green zone. */
export function FreeThrows({ onDone }: SportGameProps) {
  const [shot, setShot] = useState(0);
  const [made, setMade] = useState(0);
  const [streak, setStreak] = useState(0);
  const [marker, setMarker] = useState(0);
  const [aiming, setAiming] = useState(true);
  const [flash, setFlash] = useState<{ text: string; good: boolean } | null>(null);
  const [history, setHistory] = useState<boolean[]>([]);

  // The marker speeds up a little with every shot.
  useFrame(aiming, (ms) => setMarker(bouncing(ms, Math.max(800, 1400 - shot * 55))));

  const zone = throwZone(streak);
  const shoot = () => {
    if (!aiming) return;
    const scored = throwScores(marker, streak);
    const total = scored ? made + 1 : made;
    setAiming(false);
    setMade(total);
    setStreak(scored ? streak + 1 : 0);
    setHistory((h) => [...h, scored]);
    setFlash(scored ? { text: streak >= 2 ? `Swish! 🔥 ${streak + 1} in a row` : "Swish! 🏀", good: true } : { text: marker < zone.min ? "Short! Off the rim" : "Too long! Off the board", good: false });
    setTimeout(() => {
      if (shot + 1 >= FREE_THROWS) onDone(total);
      else {
        setShot(shot + 1);
        setFlash(null);
        setAiming(true);
      }
    }, 900);
  };
  useKeys({ Space: shoot, Enter: shoot }, aiming);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-base font-black text-ink">
        <span>
          Shot {Math.min(shot + 1, FREE_THROWS)} of {FREE_THROWS}
        </span>
        <span>🏀 {made}</span>
      </div>
      <div className="flex justify-center gap-1" aria-hidden>
        {Array.from({ length: FREE_THROWS }, (_, i) => (
          <span key={i} className={cn("h-3 w-3 rounded-full", history[i] === undefined ? "bg-ink/15" : history[i] ? "bg-leaf" : "bg-danger")} />
        ))}
      </div>
      <div className="relative mx-auto grid h-40 w-full max-w-sm place-items-center rounded-2xl bg-[#e59a5c]">
        <div className="absolute top-3 h-16 w-24 rounded border-4 border-white bg-white/30" aria-hidden />
        <div className="absolute top-14 h-2 w-14 rounded-full bg-orange-600" aria-hidden />
        <span className={cn("absolute text-4xl transition-all duration-500", aiming ? "bottom-3" : flash?.good ? "top-8" : "top-4 left-[60%]")} aria-hidden>
          🏀
        </span>
      </div>
      <Flash text={flash?.text ?? ""} tone={flash?.good ? "good" : "bad"} />
      <Meter value={marker} zone={zone} label="Throw timing" />
      <BigButton onClick={shoot} disabled={!aiming}>
        Throw! <span className="text-sm opacity-70">(Space)</span>
      </BigButton>
    </div>
  );
}
