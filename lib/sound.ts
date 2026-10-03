/**
 * Sound effects. Files are loaded from /public/sounds; when a file is missing or audio is
 * blocked, a short synthesized tone plays instead so the game never breaks.
 */
export type SoundName =
  | "break-bell"
  | "snack-collect"
  | "powerup"
  | "caught"
  | "final-bell"
  | "winner"
  | "button-click"
  | "pop"
  | "coin"
  | "chime"
  | "message"
  | "bus";

/** A note in a synthesized sound: pitch (Hz), when it starts and how long it rings (ms). */
type Note = { f: number; at: number; ms: number };
type Tone = { notes: Note[]; type: OscillatorType; gain: number };

const seq = (freqs: number[], step: number, ms = step * 1.6): Note[] => freqs.map((f, i) => ({ f, at: i * step, ms }));

/**
 * Soft built-in sounds: sine and triangle waves with gentle fades, kept quiet so they never
 * get tiring. Used whenever there's no audio file for a sound.
 */
const TONES: Record<SoundName, Tone> = {
  // School bell: two soft dings.
  "break-bell": { notes: seq([988, 784], 160, 420), type: "triangle", gain: 0.05 },
  "final-bell": { notes: seq([988, 784, 988, 784], 170, 420), type: "triangle", gain: 0.05 },
  "snack-collect": { notes: seq([784, 1175], 60), type: "sine", gain: 0.06 },
  powerup: { notes: seq([523, 659, 784], 70), type: "triangle", gain: 0.05 },
  // A low "uh-oh" rather than a buzzer.
  caught: { notes: seq([392, 311], 150, 260), type: "triangle", gain: 0.07 },
  winner: { notes: seq([523, 659, 784, 1047], 110, 300), type: "triangle", gain: 0.05 },
  "button-click": { notes: [{ f: 880, at: 0, ms: 35 }], type: "sine", gain: 0.03 },
  pop: { notes: [{ f: 660, at: 0, ms: 70 }, { f: 990, at: 40, ms: 80 }], type: "sine", gain: 0.04 },
  // Two bright pings, like coins.
  coin: { notes: [{ f: 1319, at: 0, ms: 90 }, { f: 1760, at: 70, ms: 220 }], type: "sine", gain: 0.045 },
  chime: { notes: seq([784, 988, 1175], 90, 320), type: "sine", gain: 0.05 },
  message: { notes: [{ f: 1047, at: 0, ms: 120 }, { f: 1319, at: 90, ms: 160 }], type: "sine", gain: 0.035 },
  // A friendly two-tone horn.
  bus: { notes: [{ f: 330, at: 0, ms: 200 }, { f: 415, at: 0, ms: 200 }, { f: 330, at: 260, ms: 260 }, { f: 415, at: 260, ms: 260 }], type: "triangle", gain: 0.035 },
};

/** The same sound won't play again within this time, and only a few sounds play per second. */
const REPEAT_GAP_MS = 150;
const MAX_PER_SECOND = 5;
const lastPlayed = new Map<SoundName, number>();
let recent: number[] = [];

function allowed(name: SoundName): boolean {
  const now = Date.now();
  if (now - (lastPlayed.get(name) ?? 0) < REPEAT_GAP_MS) return false;
  recent = recent.filter((t) => now - t < 1000);
  if (recent.length >= MAX_PER_SECOND) return false;
  recent.push(now);
  lastPlayed.set(name, now);
  return true;
}

/**
 * Sound files that exist in /public/sounds. Add a name here after dropping in its .mp3;
 * anything not listed uses the built-in tone (and avoids a 404 request).
 */
const AVAILABLE_FILES: SoundName[] = [];

let muted = false;
let audioCtx: AudioContext | null = null;
const missing = new Set<SoundName>();
const cache = new Map<SoundName, HTMLAudioElement>();

export function setMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem("sbb-muted", value ? "1" : "0");
  } catch {
    // ignore
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    muted = window.localStorage.getItem("sbb-muted") === "1";
  } catch {
    // ignore
  }
  return muted;
}

function playTone(name: SoundName): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const { notes, type, gain } = TONES[name];
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const start = ctx.currentTime + note.at / 1000;
      const end = start + note.ms / 1000;
      osc.type = type;
      osc.frequency.value = note.f;
      // Soft attack and a smooth fade out: no clicks.
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(amp).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch {
    // Audio unavailable: stay silent.
  }
}

export function playSound(name: SoundName): void {
  if (typeof window === "undefined" || muted || !allowed(name)) return;
  if (!AVAILABLE_FILES.includes(name) || missing.has(name)) return playTone(name);
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = 0.35;
    audio.addEventListener("error", () => missing.add(name), { once: true });
    cache.set(name, audio);
  }
  const clip = audio.cloneNode(true) as HTMLAudioElement;
  clip.volume = audio.volume;
  clip.play().catch(() => {
    missing.add(name);
    playTone(name);
  });
}

/** Short vibration on phones that support it. Follows the sound mute setting. */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || muted || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Not allowed (e.g. before the first tap): ignore.
  }
}
