"use client";

import { useMemo, useRef, useState } from "react";
import { clapInterval, tenTenCalls } from "@/lib/life/sports";
import { cn } from "@/lib/utils";
import { BigButton, Flash, useFrame, useKeys, type SportGameProps } from "./shared";

/** Ten-ten: on every clap, match the foot your partner puts out. */
export function TenTen({ seed, onDone }: SportGameProps) {
  const calls = useMemo(() => tenTenCalls(seed), [seed]);
  const [beat, setBeat] = useState(-1);
  const [score, setScore] = useState(0);
  const [out, setOut] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const answered = useRef(false);
  const nextAt = useRef(0);
  const done = useRef(false);

  const finish = (text: string, finalScore: number) => {
    if (done.current) return;
    done.current = true;
    setOut(text);
    setTimeout(() => onDone(finalScore), 1000);
  };

  useFrame(started && !out, () => {
    const now = performance.now();
    if (now < nextAt.current) return;
    // A new clap. If the last call wasn't answered, you're out.
    if (beat >= 0 && !answered.current) {
      finish("Too slow — you're out! 👏", score);
      return;
    }
    const next = beat + 1;
    if (next >= calls.length) {
      finish("Perfect game! 🌟", score);
      return;
    }
    answered.current = false;
    setBeat(next);
    nextAt.current = now + clapInterval(next);
  });

  const tap = (foot: "left" | "right") => {
    if (!started) {
      setStarted(true);
      nextAt.current = performance.now() + 600;
      return;
    }
    if (out || beat < 0 || answered.current) return;
    answered.current = true;
    if (calls[beat] === foot) setScore((s) => s + 1);
    else finish("Wrong foot — you're out! 😅", score);
  };
  useKeys({ ArrowLeft: () => tap("left"), KeyA: () => tap("left"), ArrowRight: () => tap("right"), KeyD: () => tap("right") }, true);

  const call = beat >= 0 ? calls[beat] : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-base font-black text-ink">
        <span>Points: {score}</span>
        <span className="text-sm text-ink/60">{started ? `Clap ${beat + 1}` : "Ready?"}</span>
      </div>
      <div className="grid h-36 grid-cols-2 place-items-center rounded-2xl bg-[#d6d3d1]" aria-live="polite">
        {(["left", "right"] as const).map((f) => (
          <div key={f} className={cn("flex flex-col items-center transition-transform duration-100", call === f && !out ? "scale-125" : "opacity-30")}>
            <span className={cn("text-6xl", f === "left" && "-scale-x-100")} aria-hidden>
              🦶
            </span>
            <span className="text-sm font-black text-ink">{f === "left" ? "LEFT" : "RIGHT"}</span>
          </div>
        ))}
      </div>
      <p className="sr-only">{call ? `Partner shows ${call} foot` : ""}</p>
      <Flash text={out ?? (started ? (beat >= 0 ? "👏" : "") : "Tap a foot to start")} tone={out && !out.startsWith("Perfect") ? "bad" : "good"} />
      <div className="grid grid-cols-2 gap-3">
        <BigButton tone="sun" onClick={() => tap("left")} className="min-h-20">
          LEFT <span className="block text-sm opacity-70">(←)</span>
        </BigButton>
        <BigButton tone="sun" onClick={() => tap("right")} className="min-h-20">
          RIGHT <span className="block text-sm opacity-70">(→)</span>
        </BigButton>
      </div>
    </div>
  );
}
