"use client";

import { useRef, useState } from "react";
import { RACE_METRES, raceStep, type RaceState } from "@/lib/life/sports";
import { BigButton, Flash, useFrame, useKeys, type SportGameProps } from "./shared";

/** 100 m sprint: alternate left and right as fast as you can. */
export function Race({ onDone, ghostMs }: SportGameProps) {
  const [state, setState] = useState<RaceState>({ metres: 0, lastFoot: null, stumbles: 0 });
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState("");
  const startedAt = useRef<number | null>(null);
  const done = useRef(false);
  const running = countdown === 0 && state.metres < RACE_METRES;

  useFrame(countdown > 0, (ms) => {
    const left = 3 - Math.floor(ms / 800);
    if (left <= 0) {
      startedAt.current = performance.now();
      setCountdown(0);
    } else if (left !== countdown) setCountdown(left);
  });
  useFrame(running, () => {
    if (startedAt.current !== null) setElapsed(performance.now() - startedAt.current);
  });

  const step = (foot: "left" | "right") => {
    if (!running || done.current) return;
    const next = raceStep(state, foot);
    if (next.stumbles > state.stumbles) {
      setFlash("Stumble! Switch feet 👟");
      setTimeout(() => setFlash(""), 500);
    }
    setState(next);
    if (next.metres >= RACE_METRES && startedAt.current !== null) {
      done.current = true;
      const time = Math.round(performance.now() - startedAt.current);
      setElapsed(time);
      setTimeout(() => onDone(time), 700);
    }
  };
  useKeys({ ArrowLeft: () => step("left"), KeyA: () => step("left"), ArrowRight: () => step("right"), KeyD: () => step("right") }, true);

  // The computer's runner moves at its finishing pace.
  const ghost = ghostMs ? Math.min(1, elapsed / ghostMs) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-base font-black text-ink">
        <span>{Math.round(state.metres)} m / {RACE_METRES} m</span>
        <span className="tabular-nums">⏱️ {(elapsed / 1000).toFixed(2)} s</span>
      </div>
      <div className="relative flex flex-col gap-1 rounded-2xl bg-[#dc6b4a] p-2" aria-hidden>
        {[{ label: "You", at: state.metres / RACE_METRES, emoji: "🏃" }, ...(ghostMs ? [{ label: "CPU", at: ghost, emoji: "🤖" }] : [])].map((lane) => (
          <div key={lane.label} className="relative h-12 rounded-lg border-y-2 border-white/60 bg-white/10">
            <span className="absolute top-1/2 left-1 -translate-y-1/2 text-xs font-black text-white/80">{lane.label}</span>
            <span className="absolute top-1/2 text-3xl transition-[left] duration-75" style={{ left: `calc(${lane.at * 88}% + 2rem)`, transform: "translateY(-50%) scaleX(-1)" }}>
              {lane.emoji}
            </span>
            <span className="absolute inset-y-0 right-2 w-1.5 bg-[repeating-linear-gradient(0deg,#fff_0_6px,#111_6px_12px)]" />
          </div>
        ))}
      </div>
      <Flash text={countdown > 0 ? `${countdown}…` : state.metres >= RACE_METRES ? "Finished! 🏁" : flash || (state.metres === 0 ? "GO! 🔫" : "")} tone={flash ? "bad" : "good"} />
      <div className="grid grid-cols-2 gap-3">
        <BigButton tone="sun" onClick={() => step("left")} disabled={!running} className="min-h-24">
          🦶 LEFT <span className="block text-sm opacity-70">(←)</span>
        </BigButton>
        <BigButton tone="sun" onClick={() => step("right")} disabled={!running} className="min-h-24">
          RIGHT 🦶 <span className="block text-sm opacity-70">(→)</span>
        </BigButton>
      </div>
    </div>
  );
}
