/**
 * Phaser scene for the Student Life world: draws the school, the student and their classmates
 * (each in their own outfit), activity spots and speech bubbles. Game rules live in LifeClient.
 */
import type PhaserType from "phaser";
import { ART_SCALE, drawStudent, STUDENT_HEIGHT, type Look, type StudentFrame, type StudentView } from "../art/students";
import type { Direction } from "../types";
import { activities } from "@/lib/life/activities";
import { friendLevel } from "@/lib/life/friendship";
import type { Decoration, FloorPattern, LifeZone } from "@/lib/life/map";
import { worlds, type WorldDef, type WorldKey } from "@/lib/life/worlds";
import { useLifeStore } from "@/store/lifeStore";
import type { LifeClient } from "@/lib/life/client";

type PhaserModule = typeof PhaserType;
type Container = PhaserType.GameObjects.Container;
type Text = PhaserType.GameObjects.Text;
type Image = PhaserType.GameObjects.Image;
type Graphics = PhaserType.GameObjects.Graphics;

const NAVY = 0x1e3a8a;
const FONT = '"Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const FEET_Y = 13;
const SCALE = 1.2;
const STEP_MS = 140;
const VIEWS: StudentView[] = ["front", "back", "side"];
const FRAMES: StudentFrame[] = [0, 1, 2];
const MIN_ZOOM = 0.8;
const MIN_TOUCH_ZOOM = 0.85;
const MAX_ZOOM = 1.4;

const hex = (color: string) => parseInt(color.replace("#", ""), 16);
const WALL = 0x1e3a8a;
const WALL_TOP = 0x3b5bb5;

function mix(c: number, target: number, amount: number): number {
  const ch = (shift: number) => {
    const a = (c >> shift) & 0xff;
    const b = (target >> shift) & 0xff;
    return Math.round(a + (b - a) * amount);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
const lighten = (c: number, amount: number) => mix(c, 0xffffff, amount);
const darken = (c: number, amount: number) => mix(c, 0x000000, amount);

/** Small seeded random numbers, so the scenery is the same every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lookHash(look: Look): string {
  const text = JSON.stringify(look);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `look-${(h >>> 0).toString(36)}`;
}

type PersonView = {
  root: Container;
  sprite: Image;
  lookKey: string;
  name: Text;
  badge: Text;
  heart: Text;
  bubble: Container;
  bubbleBg: Graphics;
  bubbleText: Text;
  lastBubble: string;
  lastX: number;
  lastY: number;
  walkMs: number;
  /** A pet trotting behind its owner. */
  pet: Text;
  petPos: { x: number; y: number } | null;
};

export function createLifeScene(Phaser: PhaserModule, getClient: () => LifeClient | null) {
  return class LifeScene extends Phaser.Scene {
    private people = new Map<string, PersonView>();
    private mapObjects: PhaserType.GameObjects.GameObject[] = [];
    private toBake: Graphics[] = [];
    private worldKey: WorldKey = "school";
    private zoom = 0;
    private camCenter: { x: number; y: number } | null = null;
    private isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

    constructor() {
      super("life");
    }

    create(): void {
      const client = getClient();
      this.drawMap(client?.sim.world ?? "school");
    }

    update(_time: number, delta: number): void {
      const client = getClient();
      if (!client) return;
      client.frame(performance.now());
      if (client.sim.world !== this.worldKey) {
        // Took the bus: draw the other world and start the camera afresh.
        this.drawMap(client.sim.world);
        this.camCenter = null;
      }
      this.syncPeople(client, delta);
      this.syncCamera(client);
    }

    // -- Textures ---------------------------------------------------------

    private ensureLook(look: Look): string {
      const key = lookHash(look);
      if (!this.textures.exists(`${key}-front-0`)) {
        for (const view of VIEWS) for (const frame of FRAMES) this.textures.addCanvas(`${key}-${view}-${frame}`, drawStudent(look, view, frame));
      }
      return key;
    }

    // -- Map --------------------------------------------------------------

    /**
     * Static shapes (grass, trees, walls, floors, furniture) are drawn into one image after the
     * map is built, instead of being re-drawn from thousands of shapes every frame.
     */
    private staticGraphics(depth: number): Graphics {
      const g = this.add.graphics().setDepth(depth);
      this.toBake.push(g);
      return g;
    }

    private bake(width: number, height: number): void {
      // Drawn at the closest zoom so the map stays sharp (and within phones' 4096px texture limit).
      const scale = Math.min(MAX_ZOOM, 4096 / Math.max(width, height));
      const rt = this.track(
        this.add
          .renderTexture(0, 0, Math.ceil(width * scale), Math.ceil(height * scale))
          .setOrigin(0, 0)
          .setScale(1 / scale)
          .setDepth(0),
      );
      for (const g of [...this.toBake].sort((a, b) => a.depth - b.depth)) rt.draw(g.setScale(scale));
      for (const g of this.toBake) g.destroy();
      this.toBake = [];
    }

    /** The rounded sign behind an activity's emoji, drawn once per border colour and reused. */
    private signTexture(border: number): string {
      const key = `sign-${border.toString(16)}`;
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0x0f172a, 0.18).fillEllipse(17, 41, 22, 7);
        g.fillStyle(0xffffff, 0.96).fillRoundedRect(2, 2, 30, 30, 10);
        g.lineStyle(2.5, border, 0.8).strokeRoundedRect(2, 2, 30, 30, 10);
        g.generateTexture(key, 34, 46);
        g.destroy();
      }
      return key;
    }

    private track<T extends PhaserType.GameObjects.GameObject>(obj: T): T {
      this.mapObjects.push(obj);
      return obj;
    }

    private drawMap(key: WorldKey): void {
      for (const o of this.mapObjects) o.destroy();
      this.mapObjects = [];
      this.worldKey = key;
      const world = worlds[key];
      const { width: W, height: H } = world.size;

      // Grass with soft light and dark patches.
      const g = this.staticGraphics(0);
      g.fillStyle(world.ground, 1).fillRect(0, 0, W, H);
      const rand = seeded(key === "school" ? 11 : 29);
      for (let i = 0; i < (W * H) / 9000; i++) {
        g.fillStyle(rand() < 0.5 ? darken(world.ground, 0.08) : lighten(world.ground, 0.08), 0.6);
        g.fillEllipse(rand() * W, rand() * H, 30 + rand() * 60, 14 + rand() * 30);
      }
      for (let i = 0; i < (W * H) / 2500; i++) {
        g.fillStyle(darken(world.ground, 0.18), 0.7);
        const x = rand() * W;
        const y = rand() * H;
        g.fillTriangle(x, y, x + 2, y - 6, x + 4, y);
      }
      this.drawTrees(world, rand);

      const ordered = [...world.zones].sort((a, b) => Number(Boolean(b.isLink)) - Number(Boolean(a.isLink)));
      // Drop shadows under the buildings, then walls, then floors.
      for (const z of ordered) if (!z.isLink) g.fillStyle(0x0f172a, 0.18).fillRoundedRect(z.x - 2, z.y + 6, z.width + 12, z.height + 10, 12);
      for (const z of ordered) {
        g.fillStyle(WALL, 1).fillRoundedRect(z.x - 7, z.y - 7, z.width + 14, z.height + 14, 12);
        g.fillStyle(WALL_TOP, 1).fillRoundedRect(z.x - 7, z.y - 7, z.width + 14, 6, { tl: 12, tr: 12, bl: 0, br: 0 });
      }
      for (const z of ordered) g.fillStyle(hex(z.floor), 1).fillRect(z.x, z.y, z.width, z.height);
      for (const z of world.zones) if (z.pattern) this.drawFloor(g, z, z.pattern);
      // A soft shadow where the floor meets the top wall.
      for (const z of world.zones) {
        if (z.isLink) continue;
        g.fillStyle(0x0f172a, 0.1).fillRect(z.x, z.y, z.width, 8);
        g.fillStyle(0x0f172a, 0.05).fillRect(z.x, z.y + 8, z.width, 6);
      }

      for (const d of world.decorations) this.drawDecoration(g, d);

      const fg = this.staticGraphics(1);
      for (const o of world.furniture) {
        // Shadow, body, lighter top face and a crisp edge.
        fg.fillStyle(0x0f172a, 0.22).fillRoundedRect(o.x + 3, o.y + 5, o.width, o.height, 6);
        fg.fillStyle(hex(o.color), 1).fillRoundedRect(o.x, o.y, o.width, o.height, 6);
        const top = Math.min(10, Math.max(3, o.height * 0.3));
        fg.fillStyle(lighten(hex(o.color), 0.22), 1).fillRoundedRect(o.x, o.y, o.width, top, { tl: 6, tr: 6, bl: 0, br: 0 });
        fg.lineStyle(2, darken(hex(o.color), 0.45), 0.9).strokeRoundedRect(o.x, o.y, o.width, o.height, 6);
        if (o.emoji) {
          const size = Math.max(14, Math.min(34, Math.min(o.width, o.height) * 0.7));
          this.track(this.add.text(o.x + o.width / 2, o.y + o.height / 2, o.emoji, { fontSize: `${size}px` }).setOrigin(0.5).setDepth(1.5));
        }
      }

      // Room name plates.
      for (const z of world.zones) {
        if (!z.label) continue;
        const label = this.track(
          this.add.text(z.x + 12, z.y + 10, z.label, { fontFamily: FONT, fontSize: "15px", fontStyle: "bold", color: "#1e3a8a" }).setDepth(2.5),
        );
        const plate = this.staticGraphics(2.4);
        plate.fillStyle(0x0f172a, 0.15).fillRoundedRect(z.x + 6, z.y + 8, label.width + 14, label.height + 6, 9);
        plate.fillStyle(0xffffff, 0.92).fillRoundedRect(z.x + 4, z.y + 5, label.width + 14, label.height + 6, 9);
        label.setPosition(z.x + 11, z.y + 8);
      }

      this.bake(W, H);

      // Activity spots: a floating sign so students know where to go.
      for (const spot of world.spots) {
        const def = activities[spot.activity];
        if (!def) continue;
        const sign = this.track(this.add.container(spot.x, spot.y - 34).setDepth(2.6));
        const bg = this.add.image(0, 6, this.signTexture(def.risk ? 0xdc2626 : def.job ? 0x16a34a : def.opens ? 0x7c3aed : NAVY));
        sign.add([bg, this.add.text(0, 0, def.emoji, { fontSize: "17px" }).setOrigin(0.5)]);
        this.tweens.add({ targets: sign, y: spot.y - 39, duration: 900 + (spot.x % 300), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
    }

    /** Trees and bushes on the grass, kept clear of buildings and paths. */
    private drawTrees(world: WorldDef, rand: () => number): void {
      const { width: W, height: H } = world.size;
      const clear = (x: number, y: number, r: number) =>
        world.zones.every((z) => x + r < z.x - 12 || x - r > z.x + z.width + 12 || y + r < z.y - 12 || y - r > z.y + z.height + 12);
      const g = this.staticGraphics(0.5);
      let placed = 0;
      for (let i = 0; i < 900 && placed < (W * H) / 26000; i++) {
        const x = 20 + rand() * (W - 40);
        const y = 20 + rand() * (H - 40);
        const big = rand() < 0.55;
        const r = big ? 22 + rand() * 10 : 11 + rand() * 6;
        if (!clear(x, y, r + 4)) continue;
        placed += 1;
        g.fillStyle(0x0f172a, 0.2).fillEllipse(x + 6, y + r * 0.75, r * 2, r * 0.8);
        if (big) {
          g.fillStyle(0x7c4a21, 1).fillRect(x - 3, y, 6, r * 0.7);
          const leaf = rand() < 0.5 ? 0x2f8f3a : 0x3fa34d;
          g.fillStyle(darken(leaf, 0.2), 1).fillCircle(x, y - 2, r);
          g.fillStyle(leaf, 1).fillCircle(x - r * 0.25, y - r * 0.3, r * 0.8);
          g.fillStyle(lighten(leaf, 0.25), 1).fillCircle(x - r * 0.4, y - r * 0.5, r * 0.35);
        } else {
          const leaf = 0x4caf50;
          g.fillStyle(darken(leaf, 0.15), 1).fillCircle(x, y, r);
          g.fillStyle(leaf, 1).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.7);
          if (rand() < 0.5) {
            g.fillStyle(rand() < 0.5 ? 0xf472b6 : 0xfacc15, 1);
            for (let k = 0; k < 4; k++) g.fillCircle(x + (rand() - 0.5) * r * 1.4, y + (rand() - 0.5) * r * 1.4, 2.2);
          }
        }
      }
    }

    /** Floor texture for one room. */
    private drawFloor(g: Graphics, z: LifeZone, pattern: FloorPattern): void {
      const base = hex(z.floor);
      const right = z.x + z.width;
      const bottom = z.y + z.height;
      if (pattern === "planks") {
        g.lineStyle(1, darken(base, 0.12), 1);
        for (let y = z.y + 18, row = 0; y < bottom; y += 18, row++) {
          g.lineBetween(z.x, y, right, y);
          for (let x = z.x + (row % 2 ? 40 : 90); x < right; x += 130) g.lineBetween(x, y - 18, x, y);
        }
      } else if (pattern === "tiles") {
        for (let x = z.x, i = 0; x < right; x += 25, i++) {
          for (let y = z.y, j = 0; y < bottom; y += 25, j++) {
            if ((i + j) % 2 === 0) g.fillStyle(lighten(base, 0.06), 1).fillRect(x, y, Math.min(25, right - x), Math.min(25, bottom - y));
          }
        }
        g.lineStyle(1, darken(base, 0.08), 0.8);
        for (let x = z.x + 25; x < right; x += 25) g.lineBetween(x, z.y, x, bottom);
        for (let y = z.y + 25; y < bottom; y += 25) g.lineBetween(z.x, y, right, y);
      } else if (pattern === "grid") {
        g.lineStyle(1, darken(base, 0.1), 1);
        for (let x = z.x + 40; x < right; x += 40) g.lineBetween(x, z.y, x, bottom);
        for (let y = z.y + 40; y < bottom; y += 40) g.lineBetween(z.x, y, right, y);
      } else if (pattern === "stripes") {
        g.fillStyle(darken(base, 0.06), 1);
        for (let x = z.x; x < right; x += 60) g.fillRect(x, z.y, Math.min(30, right - x), z.height);
      } else if (pattern === "soil") {
        const rand = seeded(z.x + z.y);
        for (let i = 0; i < (z.width * z.height) / 700; i++) {
          g.fillStyle(rand() < 0.5 ? darken(base, 0.12) : lighten(base, 0.08), 1);
          g.fillCircle(z.x + rand() * z.width, z.y + rand() * z.height, 1.5 + rand() * 1.5);
        }
      } else if (pattern === "paving") {
        g.lineStyle(1, darken(base, 0.12), 1);
        for (let y = z.y + 30; y < bottom; y += 30) {
          g.lineBetween(z.x, y, right, y);
          const offset = (y / 30) % 2 === 0 ? 0 : 30;
          for (let x = z.x + offset; x < right; x += 60) g.lineBetween(x, y - 30, x, y);
        }
      } else if (pattern === "asphalt") {
        const rand = seeded(z.x * 3 + z.y);
        for (let i = 0; i < (z.width * z.height) / 400; i++) {
          g.fillStyle(rand() < 0.5 ? darken(base, 0.15) : lighten(base, 0.1), 0.8);
          g.fillRect(z.x + rand() * z.width, z.y + rand() * z.height, 2, 2);
        }
        // Kerbs.
        g.fillStyle(0xd6d3d1, 1).fillRect(z.x, z.y, z.width, 10).fillRect(z.x, bottom - 10, z.width, 10);
      } else if (pattern === "court") {
        g.fillStyle(darken(base, 0.06), 1).fillRect(z.x + 10, z.y + 20, z.width - 20, z.height - 30);
      }
    }

    private drawDecoration(g: Graphics, d: Decoration): void {
      if (d.kind === "pitch") {
        g.lineStyle(3, 0xffffff, 0.9).strokeRect(d.x, d.y, d.width, d.height);
        g.lineBetween(d.x + d.width / 2, d.y, d.x + d.width / 2, d.y + d.height);
        g.strokeCircle(d.x + d.width / 2, d.y + d.height / 2, 46);
        g.strokeRect(d.x, d.y + d.height / 2 - 60, 60, 120);
        g.strokeRect(d.x + d.width - 60, d.y + d.height / 2 - 60, 60, 120);
      } else if (d.kind === "goal") {
        g.fillStyle(0xffffff, 0.35).fillRect(d.x, d.y, d.width, d.height);
        g.lineStyle(4, 0xffffff, 1).strokeRect(d.x, d.y, d.width, d.height);
      } else if (d.kind === "court") {
        const cx = d.x + d.width / 2;
        const cy = d.y + d.height / 2;
        g.lineStyle(3, 0xffffff, 0.9).strokeRect(d.x, d.y, d.width, d.height);
        g.lineBetween(cx, d.y, cx, d.y + d.height);
        g.strokeCircle(cx, cy, 40);
        g.strokeRect(d.x, cy - 50, 70, 100);
        g.strokeRect(d.x + d.width - 70, cy - 50, 70, 100);
        g.fillStyle(0xf97316, 1).fillCircle(d.x + 6, cy, 9).fillCircle(d.x + d.width - 6, cy, 9);
      } else if (d.kind === "crops") {
        g.fillStyle(0x8b5e34, 1).fillRoundedRect(d.x, d.y, d.width, d.height, 6);
        g.fillStyle(0x6b4423, 1);
        for (let y = d.y + 6; y < d.y + d.height; y += 18) g.fillRect(d.x + 4, y + 9, d.width - 8, 3);
        for (let y = d.y + 12; y < d.y + d.height - 6; y += 18) {
          for (let x = d.x + 12; x < d.x + d.width - 6; x += 18) {
            g.fillStyle(darken(hex(d.color), 0.2), 1).fillCircle(x + 1, y + 1, 6);
            g.fillStyle(hex(d.color), 1).fillCircle(x, y, 6);
            g.fillStyle(lighten(hex(d.color), 0.3), 1).fillCircle(x - 2, y - 2, 2);
          }
        }
      } else if (d.kind === "flag") {
        g.fillStyle(0x16a34a, 1).fillRect(d.x, d.y, d.width / 3, d.height);
        g.fillStyle(0xffffff, 1).fillRect(d.x + d.width / 3, d.y, d.width / 3, d.height);
        g.fillStyle(0x16a34a, 1).fillRect(d.x + (2 * d.width) / 3, d.y, d.width / 3, d.height);
      } else if (d.kind === "gate") {
        g.fillStyle(hex(d.color), 1).fillRect(d.x, d.y, d.width, d.height);
        g.lineStyle(2, 0xfacc15, 1);
        for (let y = d.y + 10; y < d.y + d.height; y += 16) g.lineBetween(d.x, y, d.x + d.width, y);
        this.track(this.add.text(d.x - 8, d.y + d.height / 2, "GATE", { fontFamily: FONT, fontSize: "14px", fontStyle: "bold", color: "#1e3a8a" }).setOrigin(1, 0.5).setDepth(1));
      } else if (d.kind === "sign") {
        g.fillStyle(0x0f172a, 0.2).fillRoundedRect(d.x + 3, d.y + 4, d.width, d.height, 8);
        g.fillStyle(hex(d.color), 1).fillRoundedRect(d.x, d.y, d.width, d.height, 8);
        const text = this.worldKey === "town" ? "🚌 Bus to school" : `🏫 ${useLifeStore.getState().me?.className ?? "Our School"}`;
        this.track(
          this.add.text(d.x + d.width / 2, d.y + d.height / 2, text, { fontFamily: FONT, fontSize: "14px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5).setDepth(1),
        );
      } else if (d.kind === "notice") {
        g.fillStyle(hex(d.color), 1).fillRect(d.x, d.y, d.width, d.height);
        g.fillStyle(0xfef3c7, 1).fillRect(d.x + 6, d.y + 2, 20, 6).fillRect(d.x + 34, d.y + 2, 20, 6).fillRect(d.x + 62, d.y + 2, 20, 6);
      } else if (d.kind === "track") {
        g.fillStyle(hex(d.color), 1).fillRoundedRect(d.x, d.y, d.width, d.height, 8);
        g.lineStyle(2, 0xffffff, 0.9);
        for (let x = d.x + d.width / 4; x < d.x + d.width; x += d.width / 4) g.lineBetween(x, d.y + 6, x, d.y + d.height - 6);
        g.lineStyle(4, 0xffffff, 1).lineBetween(d.x + 4, d.y + 14, d.x + d.width - 4, d.y + 14);
        this.track(this.add.text(d.x + d.width / 2, d.y + d.height - 18, "100 m", { fontFamily: FONT, fontSize: "13px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5).setDepth(1));
      } else if (d.kind === "chalk") {
        const cx = d.x + d.width / 2;
        const cy = d.y + d.height / 2;
        g.lineStyle(3, 0xffffff, 0.9).strokeCircle(cx, cy, d.width / 2);
        g.lineStyle(2, 0xffffff, 0.7).strokeCircle(cx, cy, d.width / 4);
      } else if (d.kind === "lane") {
        g.fillStyle(hex(d.color), 1);
        for (let x = d.x; x < d.x + d.width; x += 70) g.fillRect(x, d.y, 40, d.height);
      } else if (d.kind === "zebra") {
        g.fillStyle(0xffffff, 0.9);
        for (let y = d.y; y < d.y + d.height; y += 22) g.fillRect(d.x, y, d.width, 12);
      } else if (d.kind === "garden") {
        g.fillStyle(0x15803d, 1).fillRoundedRect(d.x, d.y, d.width, d.height, 14);
        const rand = seeded(d.x + d.y);
        for (let i = 0; i < 18; i++) {
          g.fillStyle([0xf472b6, 0xfacc15, 0xffffff, 0xf87171][i % 4], 1);
          g.fillCircle(d.x + 8 + rand() * (d.width - 16), d.y + 8 + rand() * (d.height - 16), 3);
        }
      } else {
        g.fillStyle(hex(d.color), 1).fillRoundedRect(d.x, d.y, d.width, d.height, 10);
        g.lineStyle(2, darken(hex(d.color), 0.2), 1).strokeRoundedRect(d.x + 6, d.y + 6, d.width - 12, d.height - 12, 8);
      }
    }

    // -- People -----------------------------------------------------------

    private makePerson(name: string, look: Look, isMe: boolean): PersonView {
      const lookKey = this.ensureLook(look);
      const top = FEET_Y - STUDENT_HEIGHT * SCALE;
      const parts: PhaserType.GameObjects.GameObject[] = [];
      if (isMe) parts.push(this.add.ellipse(0, FEET_Y - 1, 34, 13, 0xfacc15, 0.75).setStrokeStyle(2, 0xca8a04));
      parts.push(this.add.ellipse(0, FEET_Y - 1, 24, 7, 0x000000, 0.2));
      const sprite = this.add.image(0, FEET_Y, `${lookKey}-front-0`).setOrigin(0.5, 1).setScale(SCALE / ART_SCALE);
      const nameText = this.add
        .text(0, top - 2, name, {
          fontFamily: FONT,
          fontSize: "12px",
          fontStyle: "bold",
          color: isMe ? "#facc15" : "#ffffff",
          stroke: "#1e3a8a",
          strokeThickness: 4,
        })
        .setOrigin(0.5, 1);
      const heart = this.add.text(0, top - 16, "", { fontSize: "11px" }).setOrigin(0.5, 1);
      const badge = this.add.text(16, top + 8, "", { fontSize: "16px" }).setOrigin(0.5);
      const bubbleBg = this.add.graphics();
      const bubbleText = this.add
        .text(0, 0, "", { fontFamily: FONT, fontSize: "12px", fontStyle: "bold", color: "#1f2937" })
        .setOrigin(0.5);
      const bubble = this.add.container(0, top - 36, [bubbleBg, bubbleText]).setVisible(false);
      parts.push(sprite, nameText, heart, badge, bubble);
      const root = this.add.container(0, 0, parts).setDepth(3);
      const pet = this.add.text(0, 0, "", { fontSize: "28px" }).setOrigin(0.5, 1).setVisible(false);
      return { root, sprite, lookKey, name: nameText, badge, heart, bubble, bubbleBg, bubbleText, lastBubble: "", lastX: 0, lastY: 0, walkMs: 0, pet, petPos: null };
    }

    private syncPerson(
      view: PersonView,
      p: { x: number; y: number; facing: Direction; look: Look; activity: string | null; pet: string | null },
      bubble: string,
      friendship: number | null,
      deltaMs: number,
      isMe: boolean,
    ): void {
      const lookKey = lookHash(p.look);
      if (lookKey !== view.lookKey) view.lookKey = this.ensureLook(p.look);
      view.root.setPosition(p.x, p.y);
      view.root.setDepth(3 + p.y / 10000 + (isMe ? 0.00001 : 0));

      // The pet follows a little behind, catching up smoothly.
      if (p.pet) {
        const behind = { up: [0, 22], down: [0, -18], left: [26, 4], right: [-26, 4] }[p.facing];
        const target = { x: p.x + behind[0], y: p.y + behind[1] };
        if (!view.petPos || Math.hypot(view.petPos.x - target.x, view.petPos.y - target.y) > 300) view.petPos = { ...target };
        const k = Math.min(1, (deltaMs / 1000) * 5);
        view.petPos.x += (target.x - view.petPos.x) * k;
        view.petPos.y += (target.y - view.petPos.y) * k;
        const hop = Math.abs(Math.sin(performance.now() / 120)) * (Math.hypot(target.x - view.petPos.x, target.y - view.petPos.y) > 4 ? 4 : 0);
        view.pet
          .setText(p.pet)
          .setVisible(true)
          .setPosition(view.petPos.x, view.petPos.y + FEET_Y - hop)
          .setFlipX(p.facing === "right")
          .setDepth(3 + view.petPos.y / 10000);
      } else if (view.pet.visible) {
        view.pet.setVisible(false);
        view.petPos = null;
      }

      const moving = Math.hypot(p.x - view.lastX, p.y - view.lastY) > 0.15;
      view.lastX = p.x;
      view.lastY = p.y;
      view.walkMs = moving ? view.walkMs + deltaMs : 0;
      const frame: StudentFrame = moving ? (Math.floor(view.walkMs / STEP_MS) % 2 === 0 ? 1 : 2) : 0;
      const pose: StudentView = p.facing === "up" ? "back" : p.facing === "down" ? "front" : "side";
      view.sprite.setTexture(`${view.lookKey}-${pose}-${frame}`).setFlipX(p.facing === "left");

      view.badge.setText(p.activity ? (activities[p.activity]?.emoji ?? "") : "");
      view.heart.setText(friendship !== null && friendship >= 10 ? "❤️".repeat(friendLevel(friendship).hearts - 1) : "");

      if (bubble !== view.lastBubble) {
        view.lastBubble = bubble;
        view.bubble.setVisible(Boolean(bubble));
        if (bubble) {
          view.bubbleText.setText(bubble);
          const w = view.bubbleText.width + 14;
          const h = view.bubbleText.height + 8;
          view.bubbleBg.clear();
          view.bubbleBg.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
          view.bubbleBg.lineStyle(2, NAVY, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
          view.bubbleBg.fillStyle(0xffffff, 1).fillTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 6);
        }
      }
    }

    private syncPeople(client: LifeClient, deltaMs: number): void {
      const now = Date.now();
      const bubbleFor = (id: string) => {
        const b = client.bubbles.get(id);
        return b && b.until > now ? b.text : "";
      };
      const seen = new Set<string>();

      const meId = client.studentId;
      seen.add(meId);
      let me = this.people.get(meId);
      if (!me) {
        me = this.makePerson(client.name, client.sim.profile.look, true);
        this.people.set(meId, me);
      }
      this.syncPerson(
        me,
        {
          x: client.sim.x,
          y: client.sim.y,
          facing: client.sim.facing,
          look: client.sim.profile.look,
          activity: client.sim.activity?.key ?? null,
          pet: client.petEmoji(),
        },
        bubbleFor(meId),
        null,
        deltaMs,
        true,
      );

      for (const c of client.classmates.values()) {
        // Only classmates in the same place (school or town) are drawn.
        if (c.world !== client.sim.world) continue;
        seen.add(c.id);
        let view = this.people.get(c.id);
        if (!view) {
          view = this.makePerson(c.name, c.look, false);
          this.people.set(c.id, view);
        }
        this.syncPerson(
          view,
          { x: c.display.x, y: c.display.y, facing: c.facing, look: c.look, activity: c.activity, pet: c.pet },
          bubbleFor(c.id),
          client.friendships[c.id] ?? 0,
          deltaMs,
          false,
        );
      }

      for (const [id, view] of this.people) {
        if (!seen.has(id)) {
          view.root.destroy();
          view.pet.destroy();
          this.people.delete(id);
        }
      }
    }

    // -- Camera -----------------------------------------------------------

    private syncCamera(client: LifeClient): void {
      const { width, height } = this.scale.gameSize;
      if (!width || !height) return;
      const size = worlds[this.worldKey].size;
      const minZoom = this.isTouch ? Math.min(1.15, Math.max(MIN_TOUCH_ZOOM, (height / size.height) * 0.9)) : MIN_ZOOM;
      const zoom = Math.min(MAX_ZOOM, Math.max(Math.min(width / size.width, height / size.height), minZoom));
      const viewW = width / zoom;
      const viewH = height / zoom;
      const clamp = (v: number, view: number, size: number) =>
        view >= size ? size / 2 : Math.min(size - view / 2, Math.max(view / 2, v));
      const target = { x: clamp(client.sim.x, viewW, size.width), y: clamp(client.sim.y, viewH, size.height) };
      if (!this.camCenter || zoom !== this.zoom) this.camCenter = target;
      else {
        this.camCenter.x += (target.x - this.camCenter.x) * 0.15;
        this.camCenter.y += (target.y - this.camCenter.y) * 0.15;
      }
      this.zoom = zoom;
      this.cameras.main.setZoom(zoom).centerOn(this.camCenter.x, this.camCenter.y);
    }
  };
}
