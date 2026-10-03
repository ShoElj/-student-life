/**
 * Cartoon students drawn with the 2D canvas API, so they need no image files. The same
 * drawings are used as Phaser textures in the game and as avatars in the React UI.
 */
import type { CharacterKey } from "../types";

export type HairStyle = "short" | "puffs" | "braids" | "afro";
export type Accessory = "headband" | "badge" | "glasses" | "stripes" | "sash";

export type Look = {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  bottom: string;
  skirt: boolean;
  /** Long trousers instead of bare legs. */
  trousers: boolean;
  shoes: string;
  accessories: Accessory[];
};

export type LookKey = CharacterKey | "prefect";
export type StudentView = "front" | "back" | "side";
/** 0 = standing, 1 and 2 = the two walking steps. */
export type StudentFrame = 0 | 1 | 2;

export const STUDENT_WIDTH = 32;
export const STUDENT_HEIGHT = 44;
/** Drawings are rendered at 4× so they stay crisp when the camera zooms in. */
export const ART_SCALE = 4;

const OUTLINE = "#1e293b";
const HAIR = "#1c1209";

export const looks: Record<LookKey, Look> = {
  fast_runner: {
    skin: "#8d5524",
    hair: HAIR,
    hairStyle: "short",
    shirt: "#ef4444",
    bottom: "#1e3a8a",
    skirt: false,
    trousers: false,
    shoes: "#f8fafc",
    accessories: ["headband"],
  },
  snack_lover: {
    skin: "#a0662f",
    hair: HAIR,
    hairStyle: "puffs",
    shirt: "#f97316",
    bottom: "#1e3a8a",
    skirt: true,
    trousers: false,
    shoes: "#3f2a1d",
    accessories: [],
  },
  class_captain: {
    skin: "#6b3e1f",
    hair: HAIR,
    hairStyle: "short",
    shirt: "#2563eb",
    bottom: "#b08d57",
    skirt: false,
    trousers: false,
    shoes: "#111827",
    accessories: ["badge"],
  },
  bookworm: {
    skin: "#c68642",
    hair: HAIR,
    hairStyle: "braids",
    shirt: "#9333ea",
    bottom: "#7f1d1d",
    skirt: true,
    trousers: false,
    shoes: "#111827",
    accessories: ["glasses"],
  },
  football_boy: {
    skin: "#7a4a26",
    hair: HAIR,
    hairStyle: "short",
    shirt: "#16a34a",
    bottom: "#f8fafc",
    skirt: false,
    trousers: false,
    shoes: "#111827",
    accessories: ["stripes"],
  },
  quiet_genius: {
    skin: "#8d5524",
    hair: HAIR,
    hairStyle: "afro",
    shirt: "#0891b2",
    bottom: "#1e3a8a",
    skirt: true,
    trousers: false,
    shoes: "#3f2a1d",
    accessories: ["glasses"],
  },
  prefect: {
    skin: "#5c3317",
    hair: HAIR,
    hairStyle: "short",
    shirt: "#f8fafc",
    bottom: "#1e3a8a",
    skirt: false,
    trousers: true,
    shoes: "#111827",
    accessories: ["sash"],
  },
};

type Ctx = CanvasRenderingContext2D;
type Paint = string | CanvasGradient;

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

/** Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour. */
export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) => {
    const c = (n >> shift) & 0xff;
    const v = amount >= 0 ? c + (255 - c) * amount : c * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** Soft outline: a deep version of the fill colour instead of flat black. */
const edge = (color: string) => shade(color, -0.55);

function shape(ctx: Ctx, fill: Paint, draw: () => void, outline: string | null = OUTLINE, width = 0.8): void {
  ctx.beginPath();
  draw();
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

/** Top-to-bottom gradient: light at the top, darker at the bottom. */
function vGrad(ctx: Ctx, color: string, y0: number, y1: number, light = 0.14, dark = -0.14): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(color, light));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, dark));
  return g;
}

/** Light from the top left. */
function ballGrad(ctx: Ctx, color: string, x: number, y: number, r: number): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r * 1.05);
  g.addColorStop(0, shade(color, 0.2));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.12));
  return g;
}

const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => () => ctx.roundRect(x, y, w, h, r);
const circle = (ctx: Ctx, x: number, y: number, r: number) => () => ctx.arc(x, y, r, 0, Math.PI * 2);
const ellipse = (ctx: Ctx, x: number, y: number, rx: number, ry: number) => () =>
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);

/** A limb that swings from a pivot (hip or shoulder). */
function limb(ctx: Ctx, pivotX: number, pivotY: number, angle: number, draw: () => void): void {
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);
  draw();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Body parts
// ---------------------------------------------------------------------------

const HEAD_Y = 10.6;
const HEAD_R = 8;

function leg(ctx: Ctx, look: Look, length: number, side: boolean): void {
  // Drawn relative to the hip, pointing down.
  const fill = look.trousers ? look.bottom : look.skin;
  const g = ctx.createLinearGradient(-2.2, 0, 2.2, 0);
  g.addColorStop(0, shade(fill, 0.1));
  g.addColorStop(1, shade(fill, -0.15));
  shape(ctx, g, rect(ctx, -2.1, 0, 4.2, length, 1.4), edge(fill));
  if (!look.trousers) {
    // Socks.
    shape(ctx, "#f8fafc", rect(ctx, -2.1, length - 3.2, 4.2, 2.4, 0.6), "#cbd5e1", 0.5);
  }
  // Shoe with a little shine.
  const sx = side ? 1.1 : 0;
  shape(ctx, vGrad(ctx, look.shoes, length - 1, length + 2.4, 0.25, -0.2), ellipse(ctx, sx, length + 0.7, side ? 3.4 : 2.8, 1.9), edge(look.shoes));
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(sx - 0.8, length - 0.1, 0.9, 0.45, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function arm(ctx: Ctx, look: Look): void {
  shape(ctx, vGrad(ctx, look.shirt, 0, 6), rect(ctx, -2, 0, 4, 5.6, 1.6), edge(look.shirt));
  // Sleeve cuff.
  ctx.fillStyle = shade(look.shirt, -0.18);
  ctx.fillRect(-1.9, 4.6, 3.8, 0.9);
  shape(ctx, look.skin, rect(ctx, -1.5, 5.2, 3, 3.6, 1.2), edge(look.skin), 0.6);
  // Hand.
  shape(ctx, ballGrad(ctx, look.skin, 0, 9.4, 1.9), circle(ctx, 0, 9.4, 1.9), edge(look.skin), 0.6);
}

function bottom(ctx: Ctx, look: Look, cx: number, halfWidth: number): void {
  const fill = vGrad(ctx, look.bottom, 26.5, 34, 0.12, -0.18);
  if (look.skirt) {
    shape(
      ctx,
      fill,
      () => {
        ctx.moveTo(cx - halfWidth, 26.8);
        ctx.lineTo(cx + halfWidth, 26.8);
        ctx.lineTo(cx + halfWidth + 2.4, 34.2);
        ctx.quadraticCurveTo(cx, 35.2, cx - halfWidth - 2.4, 34.2);
        ctx.closePath();
      },
      edge(look.bottom),
    );
    // Pleats.
    ctx.strokeStyle = shade(look.bottom, -0.25);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (const dx of [-3, 0, 3]) {
      ctx.moveTo(cx + dx, 28);
      ctx.lineTo(cx + dx * 1.25, 34);
    }
    ctx.stroke();
  } else {
    shape(ctx, fill, rect(ctx, cx - halfWidth, 26.4, halfWidth * 2, look.trousers ? 6 : 6.6, 1.6), edge(look.bottom));
    ctx.strokeStyle = shade(look.bottom, -0.3);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, 28.6);
    ctx.lineTo(cx, 32.6);
    ctx.stroke();
  }
  // Belt line.
  ctx.fillStyle = shade(look.bottom, -0.35);
  ctx.fillRect(cx - halfWidth + 0.5, 26.6, halfWidth * 2 - 1, 0.9);
}

function torso(ctx: Ctx, look: Look, x: number, width: number, view: StudentView): void {
  shape(ctx, vGrad(ctx, look.shirt, 16.5, 28.5), rect(ctx, x, 16.5, width, 11.6, 3.4), edge(look.shirt));
  // Shade the far side of the body.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, 16.5, width, 11.6, 3.4);
  ctx.clip();
  ctx.fillStyle = "rgba(15,23,42,0.12)";
  ctx.fillRect(x + width * 0.68, 16.5, width, 12);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x, 16.5, width * 0.25, 12);
  ctx.restore();
  if (view === "back") {
    ctx.strokeStyle = shade(look.shirt, -0.22);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, 18.5);
    ctx.lineTo(x + width / 2, 27);
    ctx.stroke();
  }
}

function hairShine(ctx: Ctx, look: Look, x: number, y: number, r: number, from: number, to: number): void {
  ctx.strokeStyle = shade(look.hair === "#1c1209" ? "#4a3423" : look.hair, 0.35);
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 0.9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x, y, r, from, to);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A plait: a column of small overlapping beads. */
function braid(ctx: Ctx, look: Look, x: number, y: number, length: number): void {
  for (let i = 0; i < length; i += 2.2) {
    shape(ctx, ballGrad(ctx, look.hair, x, y + i, 1.6), ellipse(ctx, x, y + i, 1.5, 1.35), edge(look.hair), 0.5);
  }
  shape(ctx, "#f43f5e", circle(ctx, x, y + length + 0.6, 0.9), null);
}

function afroPuff(ctx: Ctx, look: Look, x: number, y: number, r: number): void {
  // Fluffy outline: a ring of small circles round a big one.
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) ctx.arc(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = look.hair;
  ctx.fill();
  shape(ctx, ballGrad(ctx, look.hair, x, y, r), circle(ctx, x, y, r * 0.9), null);
  hairShine(ctx, look, x, y, r * 0.62, Math.PI * 1.1, Math.PI * 1.45);
}

function hairBack(ctx: Ctx, look: Look, cx: number, view: StudentView): void {
  if (look.hairStyle === "afro") afroPuff(ctx, look, cx - (view === "side" ? 1 : 0), 10, 8.8);
  if (look.hairStyle === "puffs") {
    const puffs = view === "side" ? [cx - 6.2] : [cx - 7.8, cx + 7.8];
    for (const px of puffs) {
      afroPuff(ctx, look, px, 4.4, 4.2);
      // Hair tie.
      shape(ctx, "#f43f5e", rect(ctx, px - 1.6 + (px < cx ? 2.2 : -2.2), 6, 3.2, 1.3, 0.6), null);
    }
  }
  if (look.hairStyle === "braids" && view !== "back") {
    if (view === "side") braid(ctx, look, cx - 6.2, 10, 12);
    else {
      braid(ctx, look, cx - 7.6, 10, 12);
      braid(ctx, look, cx + 7.6, 10, 12);
    }
  }
}

function hairCap(ctx: Ctx, look: Look, cx: number, view: StudentView): void {
  if (view === "back") {
    // The back of the head is all hair.
    shape(ctx, ballGrad(ctx, look.hair, cx, 9.8, 8.2), ellipse(ctx, cx, 9.8, 8.2, 7.8), edge(look.hair));
    hairShine(ctx, look, cx, 9.4, 5.4, Math.PI * 1.15, Math.PI * 1.55);
    if (look.hairStyle === "braids") {
      braid(ctx, look, cx - 3.6, 13, 11);
      braid(ctx, look, cx + 3.6, 13, 11);
    }
    return;
  }
  if (view === "side") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, HEAD_Y, HEAD_R + 0.4, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(cx - 9, 1);
    ctx.lineTo(cx + 9, 1);
    ctx.lineTo(cx + 9, 6.4);
    ctx.quadraticCurveTo(cx + 1.5, 4.8, cx - 1.2, 9);
    ctx.quadraticCurveTo(cx - 2.6, 13, cx - 2.2, 19);
    ctx.lineTo(cx - 9, 19);
    ctx.closePath();
    ctx.fillStyle = ballGrad(ctx, look.hair, cx - 2, 6, 9);
    ctx.fill();
    ctx.restore();
    hairShine(ctx, look, cx - 1, 9, 6.2, Math.PI * 1.2, Math.PI * 1.55);
    return;
  }
  shape(
    ctx,
    ballGrad(ctx, look.hair, cx, 5, 8.5),
    () => {
      ctx.moveTo(cx - 8.2, 10.4);
      ctx.quadraticCurveTo(cx - 8.6, 1.6, cx, 1.8);
      ctx.quadraticCurveTo(cx + 8.6, 1.6, cx + 8.2, 10.4);
      ctx.quadraticCurveTo(cx + 6.6, 5.6, cx + 1.5, 6);
      ctx.quadraticCurveTo(cx, 7.2, cx - 1.5, 6);
      ctx.quadraticCurveTo(cx - 6.6, 5.6, cx - 8.2, 10.4);
      ctx.closePath();
    },
    edge(look.hair),
  );
  hairShine(ctx, look, cx - 1.5, 7.5, 5, Math.PI * 1.15, Math.PI * 1.5);
  if (look.hairStyle === "short") {
    // Fine texture for a low cut.
    ctx.fillStyle = shade(look.hair, 0.18);
    for (const [dx, dy] of [
      [-4, 3.6],
      [3, 3.2],
      [5.5, 5.4],
      [-6, 6.4],
    ]) {
      ctx.fillRect(cx + dx, dy, 0.6, 0.6);
    }
  }
}

function eye(ctx: Ctx, x: number, y: number): void {
  shape(ctx, "#ffffff", ellipse(ctx, x, y, 1.45, 1.75), "#334155", 0.45);
  ctx.fillStyle = "#3b2314";
  ctx.beginPath();
  ctx.ellipse(x + 0.1, y + 0.25, 1.05, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f0a07";
  ctx.beginPath();
  ctx.arc(x + 0.1, y + 0.35, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x - 0.35, y - 0.3, 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function face(ctx: Ctx, look: Look, cx: number, view: StudentView): void {
  ctx.lineCap = "round";
  if (view === "front") {
    eye(ctx, cx - 3.1, 11.2);
    eye(ctx, cx + 3.1, 11.2);
    // Eyebrows.
    ctx.strokeStyle = shade(look.hair, -0.2);
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(cx - 4.4, 8.6);
    ctx.quadraticCurveTo(cx - 3.1, 8, cx - 1.9, 8.5);
    ctx.moveTo(cx + 1.9, 8.5);
    ctx.quadraticCurveTo(cx + 3.1, 8, cx + 4.4, 8.6);
    ctx.stroke();
    // Cheeks.
    ctx.fillStyle = "rgba(244,63,94,0.28)";
    for (const bx of [cx - 5, cx + 5]) {
      ctx.beginPath();
      ctx.ellipse(bx, 13.6, 1.4, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nose.
    ctx.strokeStyle = shade(look.skin, -0.3);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, 12.6, 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // Smile.
    shape(
      ctx,
      "#9f1239",
      () => {
        ctx.moveTo(cx - 1.9, 14.3);
        ctx.quadraticCurveTo(cx, 16.6, cx + 1.9, 14.3);
        ctx.closePath();
      },
      "#4c0519",
      0.45,
    );
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - 1.2, 14.35, 2.4, 0.55);
    if (look.accessories.includes("glasses")) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 0.75;
      ctx.fillStyle = "rgba(186,230,253,0.25)";
      for (const ex of [cx - 3.1, cx + 3.1]) {
        ctx.beginPath();
        ctx.roundRect(ex - 2.3, 9.4, 4.6, 3.8, 1.3);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - 0.8, 10.8);
      ctx.lineTo(cx + 0.8, 10.8);
      ctx.stroke();
    }
  } else if (view === "side") {
    eye(ctx, cx + 4, 11);
    ctx.strokeStyle = shade(look.hair, -0.2);
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(cx + 2.8, 8.3);
    ctx.quadraticCurveTo(cx + 4, 7.8, cx + 5.3, 8.4);
    ctx.stroke();
    ctx.fillStyle = "rgba(244,63,94,0.28)";
    ctx.beginPath();
    ctx.ellipse(cx + 3.4, 13.8, 1.3, 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx + 4.4, 14.9);
    ctx.quadraticCurveTo(cx + 5.6, 15.5, cx + 6.4, 14.6);
    ctx.stroke();
    if (look.accessories.includes("glasses")) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.roundRect(cx + 2.1, 9.2, 4.4, 3.7, 1.3);
      ctx.moveTo(cx + 2.1, 10.6);
      ctx.lineTo(cx - 1.6, 10.2);
      ctx.stroke();
    }
  }
  if (look.accessories.includes("headband")) {
    const g = vGrad(ctx, "#f8fafc", 5, 7.4, 0, -0.12);
    if (view === "side") shape(ctx, g, rect(ctx, cx - 7.8, 5.4, 15.4, 2, 0.8), "#94a3b8", 0.5);
    else shape(ctx, g, rect(ctx, cx - 7.8, 5.2, 15.6, 2, 0.8), "#94a3b8", 0.5);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(view === "side" ? cx - 1 : cx - 1.2, 5.6, 2.4, 1.2);
  }
}

function star(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = "#facc15";
  ctx.fill();
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 0.4;
  ctx.stroke();
}

function torsoDetails(ctx: Ctx, look: Look, cx: number, view: StudentView): void {
  if (view === "front") {
    // White collar.
    for (const dir of [-1, 1]) {
      shape(
        ctx,
        "#f8fafc",
        () => {
          ctx.moveTo(cx, 17.2);
          ctx.lineTo(cx + dir * 3.9, 17);
          ctx.lineTo(cx + dir * 1.3, 20.8);
          ctx.closePath();
        },
        "#cbd5e1",
        0.45,
      );
    }
    // Buttons and a pocket.
    ctx.fillStyle = shade(look.shirt, -0.4);
    for (const by of [22, 24.6]) {
      ctx.beginPath();
      ctx.arc(cx, by, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = shade(look.shirt, -0.25);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cx - 4.8, 21, 2.6, 2.2);
    if (look.accessories.includes("badge")) star(ctx, cx + 3.6, 21.8, 1.9);
  }
  if (look.accessories.includes("stripes")) {
    ctx.fillStyle = "rgba(248,250,252,0.92)";
    const x = view === "side" ? cx - 0.8 : cx - 4.2;
    ctx.fillRect(x, 18, 1.6, 9.8);
    if (view !== "side") ctx.fillRect(cx + 2.6, 18, 1.6, 9.8);
  }
  if (look.accessories.includes("sash")) {
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "butt";
    ctx.beginPath();
    if (view === "side") {
      ctx.moveTo(cx - 3, 17.5);
      ctx.lineTo(cx + 3, 28);
    } else {
      ctx.moveTo(cx - 5.5, 17.6);
      ctx.lineTo(cx + 5.8, 28.2);
    }
    ctx.stroke();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

function head(ctx: Ctx, look: Look, cx: number, view: StudentView): void {
  // Neck with a soft shadow under the chin.
  shape(ctx, shade(look.skin, -0.12), rect(ctx, cx - 1.8, 14.8, 3.6, 3, 0.6), null);
  if (view === "front") {
    for (const ex of [cx - 7.9, cx + 7.9]) {
      shape(ctx, look.skin, circle(ctx, ex, 11.4, 1.6), edge(look.skin), 0.6);
      ctx.fillStyle = shade(look.skin, -0.18);
      ctx.beginPath();
      ctx.arc(ex, 11.4, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  shape(ctx, ballGrad(ctx, look.skin, cx, HEAD_Y, HEAD_R), circle(ctx, cx, HEAD_Y, HEAD_R), edge(look.skin));
  if (view === "side") {
    // A small nose on the profile.
    shape(ctx, look.skin, circle(ctx, cx + 7.7, 12.1, 0.9), null);
  }
}

function drawFrontOrBack(ctx: Ctx, look: Look, view: "front" | "back", frame: StudentFrame): void {
  const cx = 16;
  const leftLift = frame === 1 ? 1.6 : 0;
  const rightLift = frame === 2 ? 1.6 : 0;
  const armSwing = frame === 0 ? 0 : frame === 1 ? 0.2 : -0.2;
  const bob = frame === 0 ? 0 : -0.4;

  ctx.save();
  ctx.translate(0, bob);
  hairBack(ctx, look, cx, view);
  limb(ctx, cx - 3, 31, 0, () => leg(ctx, look, 8 - leftLift - bob, false));
  limb(ctx, cx + 3, 31, 0, () => leg(ctx, look, 8 - rightLift - bob, false));
  bottom(ctx, look, cx, 6.2);
  for (const [side, swing] of [
    [-1, armSwing],
    [1, -armSwing],
  ] as const) {
    limb(ctx, cx + side * 6.6, 18.4, side * 0.13 + swing, () => arm(ctx, look));
  }
  torso(ctx, look, cx - 6.6, 13.2, view);
  torsoDetails(ctx, look, cx, view);
  head(ctx, look, cx, view);
  hairCap(ctx, look, cx, view);
  face(ctx, look, cx, view);
  ctx.restore();
}

function drawSide(ctx: Ctx, look: Look, frame: StudentFrame): void {
  const cx = 16;
  const stride = frame === 0 ? 0 : frame === 1 ? 0.5 : -0.5;
  const bob = frame === 0 ? 0 : -0.4;

  ctx.save();
  ctx.translate(0, bob);
  hairBack(ctx, look, cx, "side");
  // Far leg and arm sit behind the body, a little darker.
  ctx.save();
  ctx.filter = "brightness(0.85)";
  limb(ctx, cx, 31, -stride, () => leg(ctx, look, 8 - bob, true));
  limb(ctx, cx, 18.4, stride * 0.9, () => arm(ctx, look));
  ctx.restore();
  limb(ctx, cx, 31, stride, () => leg(ctx, look, 8 - bob, true));
  bottom(ctx, look, cx, 4.6);
  torso(ctx, look, cx - 4.9, 9.8, "side");
  torsoDetails(ctx, look, cx, "side");
  limb(ctx, cx, 18.4, -stride * 0.9, () => arm(ctx, look));
  head(ctx, look, cx, "side");
  hairCap(ctx, look, cx, "side");
  shape(ctx, look.skin, circle(ctx, cx - 2.4, 11.6, 1.6), edge(look.skin), 0.6);
  face(ctx, look, cx, "side");
  ctx.restore();
}

/** Draws one pose of a student, facing down (front), up (back) or right (side). */
export function drawStudent(look: Look, view: StudentView, frame: StudentFrame): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = STUDENT_WIDTH * ART_SCALE;
  canvas.height = STUDENT_HEIGHT * ART_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(ART_SCALE, ART_SCALE);
  ctx.lineJoin = "round";
  if (view === "side") drawSide(ctx, look, frame);
  else drawFrontOrBack(ctx, look, view, frame);
  return canvas;
}

export function studentTextureKey(key: LookKey, view: StudentView, frame: StudentFrame): string {
  return `student-${key}-${view}-${frame}`;
}

const portraits = new Map<LookKey, HTMLCanvasElement>();

/** Head-and-shoulders portrait (front view) for avatars. Browser only. */
export function studentPortrait(key: LookKey): HTMLCanvasElement {
  let portrait = portraits.get(key);
  if (!portrait) {
    portrait = drawStudent(looks[key], "front", 0);
    portraits.set(key, portrait);
  }
  return portrait;
}
