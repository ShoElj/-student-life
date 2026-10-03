/**
 * Walking directions: finds a path through doorways from where the student is to a place on the
 * map, so tapping a place on the map walks the student there.
 */
import { isWalkable } from "@/lib/game/collision";
import type { Point } from "@/lib/game/types";
import { worlds, type WorldKey } from "./worlds";

const CELL = 16;
const BODY_HALF = 12;

type Grid = { cols: number; rows: number; open: Uint8Array };
const grids = new Map<WorldKey, Grid>();

function gridFor(world: WorldKey): Grid {
  let grid = grids.get(world);
  if (!grid) {
    const { geometry, size } = worlds[world];
    const cols = Math.ceil(size.width / CELL);
    const rows = Math.ceil(size.height / CELL);
    const open = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * CELL + CELL / 2;
        const y = r * CELL + CELL / 2;
        open[r * cols + c] = isWalkable(x, y, BODY_HALF, geometry.zones, geometry.solids, geometry.world) === true ? 1 : 0;
      }
    }
    grid = { cols, rows, open };
    grids.set(world, grid);
  }
  return grid;
}

const centre = (c: number, r: number): Point => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });

/** The open cell nearest to a point (searching outwards), or null. */
function nearestOpen(grid: Grid, p: Point): [number, number] | null {
  const c0 = Math.floor(p.x / CELL);
  const r0 = Math.floor(p.y / CELL);
  for (let d = 0; d < 12; d++) {
    for (let dr = -d; dr <= d; dr++) {
      for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && grid.open[r * grid.cols + c]) return [c, r];
      }
    }
  }
  return null;
}

/** True if the student's whole body fits all along a straight walk between two points. */
function clearLine(world: WorldKey, a: Point, b: Point): boolean {
  const { geometry } = worlds[world];
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
  for (let i = 0; i <= steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    // A pixel of margin so rounding while walking never clips a wall.
    if (isWalkable(x, y, BODY_HALF + 1, geometry.zones, geometry.solids, geometry.world) !== true) return false;
  }
  return true;
}

/** Waypoints from `from` to `to` (not including the start), or null if there is no way there. */
export function findPath(world: WorldKey, from: Point, to: Point): Point[] | null {
  const grid = gridFor(world);
  const start = nearestOpen(grid, from);
  const goal = nearestOpen(grid, to);
  if (!start || !goal) return null;
  const { cols, rows, open } = grid;
  const prev = new Int32Array(cols * rows).fill(-1);
  const startIdx = start[1] * cols + start[0];
  const goalIdx = goal[1] * cols + goal[0];
  prev[startIdx] = startIdx;
  const queue = new Int32Array(cols * rows);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;
  while (head < tail) {
    const idx = queue[head++];
    if (idx === goalIdx) break;
    const c = idx % cols;
    const r = (idx - c) / cols;
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const n = nr * cols + nc;
      if (!open[n] || prev[n] !== -1) continue;
      prev[n] = idx;
      queue[tail++] = n;
    }
  }
  if (prev[goalIdx] === -1) return null;
  const cells: Point[] = [];
  for (let idx = goalIdx; idx !== startIdx; idx = prev[idx]) cells.push(centre(idx % cols, Math.floor(idx / cols)));
  cells.reverse();
  // Smooth the zig-zag grid path into a few straight legs.
  const path: Point[] = [];
  let anchor: Point = from;
  for (let i = 0; i < cells.length; i++) {
    const next = cells[i + 1];
    if (!next || !clearLine(world, anchor, next)) {
      path.push(cells[i]);
      anchor = cells[i];
    }
  }
  return path;
}
