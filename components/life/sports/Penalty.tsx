"use client";

import { useMemo, useState } from "react";
import { bouncing, keeperDives, PENALTIES, penaltyResult, POWER_GOOD, type PenaltyTarget, type ShotResult } from "@/lib/life/sports";
import { cn } from "@/lib/utils";
import { BigButton, Flash, Meter, useFrame, useKeys, type SportGameProps } from "./shared";

const RESULT_TEXT: Record<ShotResult, string> = { goal: "GOAL! ⚽", saved: "Saved! 🧤", over: "Over the bar!", weak: "Too weak — saved!" };

/** Penalty shootout: pick a corner, then time the power. */
export function Penalty({ seed, onDone }: SportGameProps) {
  const dives = useMemo(() => keeperDives(seed), [seed]);
  const [shot, setShot] = useState(0);
  const [goals, setGoals] = useState(0);
  const [phase, setPhase] = useState<"aim" | "power" | "result">("aim");
  const [target, setTarget] = useState<PenaltyTarget | null>(null);
  const [power, setPower] = useState(0);
  const [last, setLast] = useState<ShotResult | null>(null);
  const [history, setHistory] = useState<ShotResult[]>([]);

  useFrame(phase === "power", (ms) => setPower(bouncing(ms, 1300)));

  const shoot = () => {
    if (phase !== "power" || target === null) return;
    const result = penaltyResult(target, power, dives[shot]);
    const scored = result === "goal" ? goals + 1 : goals;
    setLast(result);
    setGoals(scored);
    setHistory((h) => [...h, result]);
    setPhase("result");
    setTimeout(() => {
      if (shot + 1 >= PENALTIES) onDone(scored);
      else {
        setShot(shot + 1);
        setTarget(null);
        setLast(null);
        setPhase("aim");
      }
    }, 1300);
  };
  useKeys({ Space: shoot, Enter: shoot }, phase === "power");

  const keeperColumn = phase === "result" ? dives[shot] : 1;
  const ballAt = phase === "result" && target !== null && last !== "over" && last !== "weak" ? target : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-base font-black text-ink">
        <span>
          Penalty {Math.min(shot + 1, PENALTIES)} of {PENALTIES}
        </span>
        <span className="flex gap-1" aria-label={`${goals} goals so far`}>
          {Array.from({ length: PENALTIES }, (_, i) => (
            <span key={i} className={cn("h-4 w-4 rounded-full", history[i] === undefined ? "bg-ink/15" : history[i] === "goal" ? "bg-leaf" : "bg-danger")} />
          ))}
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-md rounded-t-xl border-x-[6px] border-t-[6px] border-white bg-[repeating-linear-gradient(90deg,#e2e8f0_0_2px,transparent_2px_14px),repeating-linear-gradient(0deg,#e2e8f0_0_2px,#86efac_2px_14px)] p-1.5 shadow-inner">
        <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
          {([0, 1, 2, 3, 4, 5] as PenaltyTarget[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={phase !== "aim"}
              onClick={() => {
                setTarget(t);
                setPhase("power");
              }}
              aria-label={`Aim ${t < 3 ? "high" : "low"} ${["left", "centre", "right"][t % 3]}`}
              className={cn(
                "grid h-16 place-items-center rounded-lg border-2 border-dashed text-2xl transition-colors",
                target === t ? "border-sun bg-sun/50" : "border-white/70 bg-white/20",
                phase === "aim" && "hover:bg-sun/30 active:scale-95",
              )}
            >
              {ballAt === t ? "⚽" : target === t && phase === "power" ? "🎯" : ""}
            </button>
          ))}
        </div>
        <span
          aria-hidden
          className="absolute bottom-1 text-4xl transition-all duration-300"
          style={{ left: `${keeperColumn * 33.3 + 16.6}%`, transform: "translateX(-50%)" }}
        >
          🧤
        </span>
      </div>

      <Flash text={last ? RESULT_TEXT[last] : ""} tone={last === "goal" ? "good" : "bad"} />

      {phase === "aim" && <p className="text-center text-base font-bold text-ink/70">Tap where you want to shoot.</p>}
      {phase !== "aim" && <Meter value={power} zone={POWER_GOOD} label="Shot power" />}
      <BigButton onClick={shoot} disabled={phase !== "power"}>
        Shoot! <span className="text-sm opacity-70">(Space)</span>
      </BigButton>
    </div>
  );
}
