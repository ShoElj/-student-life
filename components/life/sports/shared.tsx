"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Calls `onFrame(elapsedMs)` every animation frame while `running`. */
export function useFrame(running: boolean, onFrame: (elapsedMs: number) => void): void {
  const cb = useRef(onFrame);
  useEffect(() => {
    cb.current = onFrame;
  });
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      cb.current(now - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

/**
 * Keyboard controls for a mini-game. Listens in the capture phase and stops the event, so the
 * arrow keys play the game instead of walking the student around behind the sheet.
 */
export function useKeys(handlers: Record<string, () => void>, active = true): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const fn = ref.current[e.code];
      if (!fn) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) fn();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [active]);
}

/** A horizontal meter with a coloured "good" zone and a moving marker. */
export function Meter({ value, zone, label }: { value: number; zone: { min: number; max: number }; label: string }) {
  return (
    <div className="relative h-8 w-full overflow-hidden rounded-full bg-ink/10" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="absolute inset-y-0 bg-leaf/70" style={{ left: `${zone.min * 100}%`, width: `${(Math.min(1, zone.max) - zone.min) * 100}%` }} />
      <div className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${Math.min(1, Math.max(0, value)) * 100}%` }} />
    </div>
  );
}

export function BigButton({ onClick, children, disabled, tone = "brand", className }: { onClick: () => void; children: React.ReactNode; disabled?: boolean; tone?: "brand" | "leaf" | "sun"; className?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        // Pointer down (not click) so fast tapping games respond instantly.
        e.preventDefault();
        if (!disabled) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!disabled) onClick();
        }
      }}
      className={cn(
        "min-h-16 touch-manipulation rounded-2xl text-xl font-black select-none active:scale-95 disabled:opacity-40",
        tone === "brand" && "bg-brand text-white shadow-[0_4px_0_0_var(--color-brand-dark)]",
        tone === "leaf" && "bg-leaf text-white",
        tone === "sun" && "bg-sun text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Flash({ text, tone }: { text: string; tone: "good" | "bad" }) {
  if (!text) return <p className="h-8" aria-hidden />;
  return (
    <p role="status" className={cn("animate-pop h-8 text-center text-2xl font-black", tone === "good" ? "text-leaf-dark" : "text-danger")}>
      {text}
    </p>
  );
}

/** Mini-game props: the shared seed, and a callback with the final score. */
export type SportGameProps = { seed: number; onDone: (score: number) => void; ghostMs?: number };
