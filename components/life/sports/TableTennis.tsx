"use client";

import { useRef, useState } from "react";
import { crossingMs, hitZone, TT_BALLS } from "@/lib/life/sports";
import { BigButton, Flash, useFrame, useKeys, type SportGameProps } from "./shared";

type Rally = { toMe: boolean; startedAt: number; hits: number };

/** Table tennis: hit the ball when it reaches the yellow zone on your side. */
export function TableTennis({ onDone }: SportGameProps) {
  const [ballsLeft, setBallsLeft] = useState(TT_BALLS);
  const [total, setTotal] = useState(0);
  const [pos, setPos] = useState(0);
  const [flash, setFlash] = useState<{ text: string; good: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  /** Hits in the current rally (for drawing the hit zone). */
  const [rallyHits, setRallyHits] = useState(0);
  const rally = useRef<Rally>({ toMe: true, startedAt: 0, hits: 0 });
  const finished = useRef(false);
  /** True while a ball is in play (a ref so a miss is only counted once per ball). */
  const live = useRef(false);

  const serve = () => {
    rally.current = { toMe: true, startedAt: performance.now(), hits: 0 };
    live.current = true;
    setRallyHits(0);
    setFlash(null);
    setPlaying(true);
  };

  const lose = (text: string) => {
    if (!live.current) return;
    live.current = false;
    setPlaying(false);
    setFlash({ text, good: false });
    const left = ballsLeft - 1;
    setBallsLeft(left);
    if (left <= 0) {
      finished.current = true;
      setTimeout(() => onDone(total), 900);
    } else setTimeout(serve, 1000);
  };

  useFrame(playing, () => {
    const r = rally.current;
    const t = (performance.now() - r.startedAt) / crossingMs(r.hits);
    if (r.toMe) {
      setPos(t);
      if (t > hitZone(r.hits).max) lose("Missed it! 😮");
    } else {
      setPos(1 - t);
      // The other player always returns it.
      if (t >= 1) rally.current = { toMe: true, startedAt: performance.now(), hits: r.hits };
    }
  });

  const hit = () => {
    if (finished.current) return;
    if (!live.current) {
      if (ballsLeft === TT_BALLS && total === 0 && !flash) serve();
      return;
    }
    const r = rally.current;
    const zone = hitZone(r.hits);
    if (r.toMe && pos >= zone.min && pos <= zone.max) {
      rally.current = { toMe: false, startedAt: performance.now(), hits: r.hits + 1 };
      setTotal((n) => n + 1);
      setRallyHits(r.hits + 1);
      setFlash({ text: r.hits + 1 >= 5 ? `Rally ${r.hits + 1}! 🔥` : "Nice hit! 🏓", good: true });
    } else {
      lose(r.toMe ? "Too early! 😬" : "Wait for it to come back!");
    }
  };
  useKeys({ Space: hit, Enter: hit }, true);

  const zone = hitZone(rallyHits);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-base font-black text-ink">
        <span>Balls left: {"🏓".repeat(ballsLeft) || "–"}</span>
        <span>Hits: {total}</span>
      </div>
      <div className="relative h-28 rounded-2xl border-4 border-white bg-blue-700 shadow-inner" aria-hidden>
        <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-white/80" />
        <div className="absolute inset-y-0 bg-sun/60" style={{ left: `${zone.min * 92 + 4}%`, right: 0 }} />
        <span className="absolute top-1/2 left-1 -translate-y-1/2 text-2xl">🤖</span>
        <span className="absolute top-1/2 right-1 -translate-y-1/2 text-2xl">🏓</span>
        <span
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
          style={{ left: `${Math.min(1.04, Math.max(0, pos)) * 92 + 4}%` }}
        />
      </div>
      <Flash text={flash?.text ?? (!playing && total === 0 && ballsLeft === TT_BALLS ? "Tap Hit to serve" : "")} tone={flash?.good === false ? "bad" : "good"} />
      <BigButton onClick={hit}>
        Hit! <span className="text-sm opacity-70">(Space)</span>
      </BigButton>
    </div>
  );
}
