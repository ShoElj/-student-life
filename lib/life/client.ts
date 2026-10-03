/**
 * One student's connection to their class's school world: runs their simulation, shares their
 * position and look with classmates over the `life:{classCode}` channel, applies social actions,
 * and saves progress. Lives outside React so it survives re-renders.
 */
import type { Direction } from "@/lib/game/types";
import { inputVector, playerInput, resetInput } from "@/lib/game/input";
import { createTransport, type RoomTransport } from "@/lib/realtime/channels";
import type { RoomMode } from "@/lib/session";
import { playSound, vibrate } from "@/lib/sound";
import { useLifeStore, type GameSession } from "@/store/lifeStore";
import { generateId } from "@/lib/utils";
import { activities, getActivity, jobKeys } from "./activities";
import { getLifeApi, LifeApiError, MAX_MESSAGE_LENGTH, type ChatMessage, type LifeApi } from "./api";
import { getSchoolTime } from "./clock";
import { GREETINGS, SOCIAL_RULES } from "./friendship";
import { games, isGameKind, replay, type GameKind } from "./games";
import { getGoal } from "./goals";
import { formatMoney, LEGACY_COIN_VALUE, PROFILE_VERSION } from "./money";
import {
  activityBlocker,
  buyOrWear,
  createSim,
  finishGame,
  goalProgress,
  gradeLetter,
  level,
  mood,
  moveSavings,
  nearestSpot,
  newProfile,
  payFor,
  repairDay,
  shiftsLeft,
  receiveSocial,
  sendSocial,
  startActivity,
  stepLife,
  type LifeEvent,
  type LifeSim,
} from "./sim";
import type { Classmate, LifeProfile, SocialKind } from "./types";
import { randomStarterLook, sanitizeLook, type WardrobeItem } from "./wardrobe";
import { maskRudeWords } from "@/lib/moderation";

const SESSION_KEY = "sbb-life-session";
const SAVE_EVERY_MS = 10_000;
const PRESENCE_MOVING_MS = 160;
const PRESENCE_IDLE_MS = 2_000;
const CLASSMATE_TIMEOUT_MS = 8_000;
const ROSTER_REFRESH_MS = 60_000;
const HUD_EVERY_MS = 200;
const BUBBLE_MS = 3_000;
const CHAT_BUBBLE_MS = 5_000;
const CHAT_REFRESH_MS = 30_000;
const INVITE_TIMEOUT_MS = 30_000;
const COMPUTER_THINK_MS = 650;

/** The conversation a message belongs to, seen from `me`. */
export function threadOf(m: Pick<ChatMessage, "from" | "to">, me: string): string {
  if (m.to === null) return "school";
  return m.from === me ? m.to : m.from;
}

function chatPrefsKey(studentId: string): string {
  return `sbb-life-chat:${studentId}`;
}

type LifeSession = {
  mode: RoomMode;
  classCode: string;
  className: string;
  studentId: string;
  name: string;
  token: string;
  /** Latest saved profile, so a reload can continue without asking for the PIN again. */
  profile: LifeProfile;
};

type StatePayload = { name: string; look: unknown; x: number; y: number; facing: Direction; activity: string | null; mood: number };
type SocialPayload = { to: string; kind: SocialKind; line?: string; friendship?: number | null };
type ChatPayload = { id: number; to: string | null; body: string; at: number; fromName: string };
type GamePayload = {
  to: string;
  gameId: string;
  action: "invite" | "accept" | "decline" | "move" | "quit";
  game: GameKind;
  move?: number;
  /** Index of the move in the game, so moves are applied once and in order. */
  seq?: number;
};

type LifeMessage =
  | { type: "life_state"; roomCode: string; playerId: string; payload: StatePayload; timestamp: number }
  | { type: "life_social"; roomCode: string; playerId: string; payload: SocialPayload; timestamp: number }
  | { type: "life_chat"; roomCode: string; playerId: string; payload: ChatPayload; timestamp: number }
  | { type: "life_game"; roomCode: string; playerId: string; payload: GamePayload; timestamp: number }
  | { type: "life_leave"; roomCode: string; playerId: string; payload: Record<string, never>; timestamp: number };

export type ClassmateView = Classmate & { display: { x: number; y: number } };

let active: LifeClient | null = null;
let starting: Promise<LifeClient> | null = null;

export function getLifeClient(): LifeClient | null {
  return active;
}

function loadSession(): LifeSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LifeSession) : null;
  } catch {
    return null;
  }
}

function storeSession(session: LifeSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable: the student signs in again after a reload.
  }
}

function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function savedLifeSession(): { classCode: string; name: string } | null {
  const s = typeof window === "undefined" ? null : loadSession();
  return s ? { classCode: s.classCode, name: s.name } : null;
}

/** Repairs a profile loaded from storage or the server (older saves, missing fields). */
function normaliseProfile(studentId: string, raw: LifeProfile | null): LifeProfile {
  const fresh = newProfile(studentId, randomStarterLook());
  if (!raw || typeof raw !== "object") return fresh;
  const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
  // Saves from before money was in Naira held coins: convert them at ₦50 each.
  const legacy = raw.v !== PROFILE_VERSION;
  const rate = legacy ? LEGACY_COIN_VALUE : 1;
  const day = raw.day && typeof raw.day === "object" && raw.day.needs ? repairDay(raw.day) : fresh.day;
  if (legacy) {
    day.coinsEarned *= rate;
    day.moneySpent = 0;
  }
  const ledger = Array.isArray(raw.ledger)
    ? raw.ledger
        .filter((e) => e && typeof e.label === "string" && Number.isFinite(e.amount) && Number.isFinite(e.at))
        .map((e) => ({ at: e.at, label: e.label.slice(0, 60), amount: Math.round(e.amount) }))
        .slice(0, 25)
    : [];
  return {
    v: PROFILE_VERSION,
    look: sanitizeLook(raw.look) ?? fresh.look,
    coins: Number.isFinite(raw.coins) ? money(raw.coins) * rate : fresh.coins,
    savings: money(raw.savings),
    ledger,
    xp: money(raw.xp),
    owned: Array.isArray(raw.owned) ? raw.owned.filter((o) => typeof o === "string") : [],
    day,
  };
}

export class LifeClient {
  readonly sim: LifeSim;
  readonly classmates = new Map<string, ClassmateView>();
  readonly bubbles = new Map<string, { text: string; until: number }>();
  friendships: Record<string, number> = {};
  private rosterNames = new Map<string, { name: string; look: LifeProfile["look"] | null }>();
  private api: LifeApi;
  private transport: RoomTransport<LifeMessage>;
  private cleanups: (() => void)[] = [];
  private lastFrame: number | null = null;
  private lastPresence = 0;
  private lastPresenceKey = "";
  private lastHud = 0;
  private lastSave = 0;
  private saving = false;
  private disposed = false;

  private constructor(private session: LifeSession) {
    this.api = getLifeApi(session.mode);
    this.transport = createTransport<LifeMessage>(session.mode, session.classCode, "life");
    this.sim = createSim(session.studentId, session.profile);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  static async signIn(mode: RoomMode, classCode: string, name: string, pin: string): Promise<LifeClient> {
    const result = await getLifeApi(mode).enter(classCode, name, pin);
    const session: LifeSession = {
      mode,
      classCode: classCode.trim().toUpperCase(),
      className: result.className,
      studentId: result.studentId,
      name: result.name,
      token: result.token,
      profile: normaliseProfile(result.studentId, result.profile),
    };
    storeSession(session);
    active?.dispose();
    active = null;
    return LifeClient.start(session);
  }

  /** Continues the session saved on this device, if it is for this class. */
  static resume(classCode: string): Promise<LifeClient | null> {
    if (active && active.session.classCode === classCode.toUpperCase() && !active.disposed) return Promise.resolve(active);
    const session = loadSession();
    if (!session || session.classCode !== classCode.toUpperCase()) return Promise.resolve(null);
    session.profile = normaliseProfile(session.studentId, session.profile);
    return LifeClient.start(session);
  }

  private static start(session: LifeSession): Promise<LifeClient> {
    if (starting) return starting;
    starting = (async () => {
      const client = new LifeClient(session);
      await client.open();
      active = client;
      return client;
    })().finally(() => {
      starting = null;
    });
    return starting;
  }

  private async open(): Promise<void> {
    const store = useLifeStore.getState();
    store.patch({ status: "loading" });
    this.cleanups.push(this.transport.subscribe((m) => this.receive(m)));
    try {
      await this.transport.connect();
    } catch {
      throw new LifeApiError("Could not connect to your class. Check your connection.");
    }
    resetInput();
    store.patch({
      status: "playing",
      me: { id: this.session.studentId, name: this.session.name, classCode: this.session.classCode, className: this.session.className },
      look: this.sim.profile.look,
      owned: [...this.sim.profile.owned],
      report: null,
      ...this.loadChatPrefs(),
    });
    void this.refreshRoster();
    void this.refreshMessages();
    const loop = setInterval(() => {
      // Keep the school running even when the tab is not drawing frames.
      const now = performance.now();
      if (this.lastFrame === null || now - this.lastFrame > 120) this.frame(now);
    }, 120);
    const roster = setInterval(() => void this.refreshRoster(), ROSTER_REFRESH_MS);
    const chat = setInterval(() => void this.refreshMessages(), CHAT_REFRESH_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") void this.save(true);
    };
    const onLeave = () => this.send("life_leave", {});
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);
    this.cleanups.push(
      () => clearInterval(loop),
      () => clearInterval(roster),
      () => clearInterval(chat),
      () => document.removeEventListener("visibilitychange", onHide),
      () => window.removeEventListener("pagehide", onLeave),
    );
    this.sendPresence(true);
  }

  dispose(): void {
    if (this.disposed) return;
    this.leaveGame();
    this.disposed = true;
    this.send("life_leave", {});
    for (const c of this.cleanups) c();
    this.transport.close();
    if (active === this) active = null;
  }

  async signOut(): Promise<void> {
    await this.save(true);
    this.dispose();
    clearStoredSession();
    useLifeStore.getState().reset();
  }

  get classCode(): string {
    return this.session.classCode;
  }

  get studentId(): string {
    return this.session.studentId;
  }

  get name(): string {
    return this.session.name;
  }

  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------

  frame(nowPerf: number = performance.now()): void {
    if (this.disposed) return;
    const dt = this.lastFrame === null ? 16 : Math.min(nowPerf - this.lastFrame, 1000);
    this.lastFrame = nowPerf;
    const now = Date.now();
    const mates = [...this.classmates.values()];
    const events = stepLife(this.sim, dt, now, inputVector(playerInput), mates);
    this.handleEvents(events);

    // Drop classmates who went quiet and glide the rest toward their latest position.
    const k = Math.min(1, (dt / 1000) * 10);
    for (const [id, c] of this.classmates) {
      if (now - c.lastSeen > CLASSMATE_TIMEOUT_MS) {
        this.classmates.delete(id);
        continue;
      }
      if (Math.hypot(c.display.x - c.x, c.display.y - c.y) > 200) c.display = { x: c.x, y: c.y };
      else {
        c.display.x += (c.x - c.display.x) * k;
        c.display.y += (c.y - c.display.y) * k;
      }
    }

    this.checkGameOpponent(now);
    this.sendPresence(false);
    if (nowPerf - this.lastHud >= HUD_EVERY_MS) {
      this.lastHud = nowPerf;
      this.publishHud(now);
    }
    if (now - this.lastSave >= SAVE_EVERY_MS) void this.save(false);
  }

  private handleEvents(events: LifeEvent[]): void {
    const store = useLifeStore.getState();
    for (const e of events) {
      switch (e.kind) {
        case "period_changed":
          playSound("break-bell");
          store.toast(`🔔 ${e.period.name}${e.period.kind === "lesson" ? ` — ${getSchoolTime().subject}` : ""}`, "info");
          break;
        case "activity_done": {
          const def = getActivity(e.key);
          playSound("powerup");
          vibrate(20);
          store.toast(`${def?.emoji ?? "✅"} Done${e.summary ? `: ${e.summary}` : "!"}`, "good");
          break;
        }
        case "activity_cancelled":
          store.toast(e.reason, "info");
          break;
        case "goal_done":
          playSound("winner");
          vibrate([30, 40, 30]);
          store.toast(`🎯 Goal complete: ${e.text} (+${formatMoney(e.reward)})`, "good");
          break;
        case "money_in":
          playSound("powerup");
          store.toast(`💵 ${e.label}: +${formatMoney(e.amount)}`, "good");
          break;
        case "need_low":
          store.toast(
            {
              energy: "😴 You're tired — rest on the sofa in the Common Room.",
              hunger: "🍛 You're hungry — the canteen opens at break.",
              fun: "😐 You're bored — play football or read comics.",
              social: "🤝 You're lonely — say hi to a classmate.",
            }[e.need],
            "bad",
          );
          break;
        case "played_with":
          for (const id of e.classmateIds) {
            // Only one of the two players records it, so friendship isn't counted twice.
            if (this.session.studentId < id) void this.addFriendship(id, SOCIAL_RULES.footballTogether.friendship);
          }
          store.toast(`⚽ Played with ${e.classmateIds.map((id) => this.nameOf(id)).join(", ")}!`, "good");
          break;
        case "report_card":
          playSound("final-bell");
          store.patch({ report: e.report });
          void this.save(true);
          break;
        case "new_day":
          store.toast("☀️ A new school day has started!", "info");
          break;
        default:
          break;
      }
    }
  }

  private publishHud(now: number): void {
    const sim = this.sim;
    const day = sim.profile.day;
    const time = getSchoolTime(now);
    const spot = sim.activity ? null : nearestSpot(sim);
    const spotDef = getActivity(spot?.activity);
    const activityDef = getActivity(sim.activity?.key);
    const nearest = this.nearestClassmate();
    const roster = [...this.rosterNames.entries()].map(([id, r]) => {
      const live = this.classmates.get(id);
      return {
        id,
        name: live?.name ?? r.name,
        look: live?.look ?? r.look,
        online: Boolean(live),
        friendship: this.friendships[id] ?? 0,
        nearby: Boolean(live && Math.hypot(live.x - sim.x, live.y - sim.y) <= SOCIAL_RULES.talkRange),
      };
    });
    // Classmates seen online who joined after the last roster refresh.
    for (const [id, c] of this.classmates) {
      if (!this.rosterNames.has(id)) {
        roster.push({ id, name: c.name, look: c.look, online: true, friendship: this.friendships[id] ?? 0, nearby: false });
      }
    }
    roster.sort((a, b) => Number(b.online) - Number(a.online) || b.friendship - a.friendship || a.name.localeCompare(b.name));

    useLifeStore.getState().patch({
      hud: {
        needs: { ...day.needs },
        mood: mood(day.needs),
        coins: sim.profile.coins,
        savings: sim.profile.savings,
        moneyEarned: day.coinsEarned,
        moneySpent: day.moneySpent,
        shiftsLeft: shiftsLeft(day),
        ledger: sim.profile.ledger.slice(0, 12),
        jobs: jobKeys.map((key) => {
          const def = activities[key];
          return {
            key,
            label: def.label,
            emoji: def.emoji,
            where: def.job?.where ?? "",
            pay: payFor(def, sim, this.classmates.size),
            open: !def.periods || def.periods.includes(time.period.kind),
            hours: def.closedMessage ?? "",
          };
        }),
        xp: sim.profile.xp,
        level: level(sim.profile.xp),
        gradePoints: day.gradePoints,
        grade: gradeLetter(day.gradePoints),
        clockLabel: time.clockLabel,
        periodName: time.period.name,
        periodKind: time.period.kind,
        subject: time.subject,
        secondsLeftInPeriod: time.secondsLeftInPeriod,
        goals: day.goals.map((g) => {
          const def = getGoal(g.id);
          const p = goalProgress(day, g.id);
          return { id: g.id, text: def?.text ?? g.id, value: p.value, target: p.target, done: g.done, reward: def?.reward ?? 0 };
        }),
        activity:
          sim.activity && activityDef
            ? {
                key: activityDef.key,
                label: activityDef.verb,
                emoji: activityDef.emoji,
                progress: Math.min(1, sim.activity.elapsedMs / sim.activity.durationMs),
              }
            : null,
        nearSpot:
          spot && spotDef
            ? {
                id: spot.id,
                label: spotDef.label,
                emoji: spotDef.emoji,
                durationSec: spotDef.durationSec,
                cost: spotDef.cost,
                pay: payFor(spotDef, sim, this.classmates.size),
                opensGames: Boolean(spotDef.opensGames),
                blocker: activityBlocker(sim, spotDef, now),
              }
            : null,
        nearClassmate: nearest ? { id: nearest.id, name: nearest.name } : null,
        onlineCount: this.classmates.size + 1,
      },
      roster,
    });
  }

  // -------------------------------------------------------------------------
  // Player actions
  // -------------------------------------------------------------------------

  doActivity(): void {
    const spot = nearestSpot(this.sim);
    if (!spot) return;
    const def = getActivity(spot.activity);
    if (def?.opensGames && !this.sim.activity) {
      const blocker = activityBlocker(this.sim, def);
      if (blocker) useLifeStore.getState().toast(blocker, "bad");
      else {
        playSound("button-click");
        useLifeStore.getState().patch({ sheetRequest: "games" });
      }
      return;
    }
    const result = startActivity(this.sim, spot.id);
    if (!result.ok) useLifeStore.getState().toast(result.reason, "bad");
    else playSound("button-click");
    this.publishHud(Date.now());
  }

  nearestClassmate(): ClassmateView | null {
    let best: ClassmateView | null = null;
    let bestD: number = SOCIAL_RULES.talkRange;
    for (const c of this.classmates.values()) {
      const d = Math.hypot(c.x - this.sim.x, c.y - this.sim.y);
      if (d <= bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  }

  isNear(id: string): boolean {
    const c = this.classmates.get(id);
    return Boolean(c && Math.hypot(c.x - this.sim.x, c.y - this.sim.y) <= SOCIAL_RULES.talkRange);
  }

  async social(kind: SocialKind, targetId: string, line?: string): Promise<boolean> {
    const store = useLifeStore.getState();
    if (!this.isNear(targetId)) {
      store.toast("Walk closer to them first.", "bad");
      return false;
    }
    if (kind === "hi" && (!line || !GREETINGS.includes(line as (typeof GREETINGS)[number]))) return false;
    const result = sendSocial(this.sim, kind, targetId);
    if (!result.ok) {
      store.toast(result.reason, "bad");
      return false;
    }
    this.handleEvents(result.events);
    const total = result.friendshipPoints > 0 ? await this.addFriendship(targetId, result.friendshipPoints) : null;
    this.send("life_social", { to: targetId, kind, line, friendship: total });
    if (line) this.bubbles.set(this.session.studentId, { text: line, until: Date.now() + BUBBLE_MS });
    const name = this.nameOf(targetId);
    if (kind === "help") store.toast(`📚 You helped ${name} with homework.`, "good");
    if (kind === "share") store.toast(`🍩 You shared a snack with ${name}.`, "good");
    this.publishHud(Date.now());
    return true;
  }

  wear(item: WardrobeItem): boolean {
    const result = buyOrWear(this.sim.profile, item);
    const store = useLifeStore.getState();
    if (!result.ok) {
      store.toast(result.reason, "bad");
      return false;
    }
    store.patch({ look: this.sim.profile.look, owned: [...this.sim.profile.owned] });
    this.sendPresence(true);
    void this.save(true);
    this.publishHud(Date.now());
    return true;
  }

  // -------------------------------------------------------------------------
  // Table games
  // -------------------------------------------------------------------------

  /** Starts a game against the computer. I always go first. */
  playComputer(kind: GameKind): void {
    this.setGame({ id: generateId(), kind, opponent: { kind: "computer" }, me: 0, moves: [], status: "playing" });
  }

  /** Invites a classmate who is at school. The inviter goes first. */
  inviteToGame(kind: GameKind, classmateId: string): void {
    const mate = this.classmates.get(classmateId);
    const store = useLifeStore.getState();
    if (!mate) {
      store.toast("They're not at school right now.", "bad");
      return;
    }
    const id = generateId();
    this.setGame({ id, kind, opponent: { kind: "classmate", id: mate.id, name: mate.name }, me: 0, moves: [], status: "waiting" });
    this.send("life_game", { to: mate.id, gameId: id, action: "invite", game: kind });
    setTimeout(() => {
      const game = useLifeStore.getState().game;
      if (game?.id === id && game.status === "waiting") {
        this.send("life_game", { to: mate.id, gameId: id, action: "quit", game: kind });
        this.setGame({ ...game, status: "cancelled", note: `${mate.name} didn't answer.` });
      }
    }, INVITE_TIMEOUT_MS);
  }

  acceptInvite(): void {
    const store = useLifeStore.getState();
    const invite = store.invite;
    if (!invite) return;
    store.patch({ invite: null });
    if (Date.now() - invite.at > INVITE_TIMEOUT_MS || !this.classmates.has(invite.fromId)) {
      store.toast("That invitation has expired.", "bad");
      return;
    }
    this.leaveGame();
    this.send("life_game", { to: invite.fromId, gameId: invite.id, action: "accept", game: invite.kind });
    this.setGame({
      id: invite.id,
      kind: invite.kind,
      opponent: { kind: "classmate", id: invite.fromId, name: invite.fromName },
      me: 1,
      moves: [],
      status: "playing",
    });
    store.patch({ sheetRequest: "games" });
  }

  declineInvite(): void {
    const store = useLifeStore.getState();
    const invite = store.invite;
    if (!invite) return;
    store.patch({ invite: null });
    this.send("life_game", { to: invite.fromId, gameId: invite.id, action: "decline", game: invite.kind });
  }

  /** Plays my move. Returns false if it isn't my turn or the move isn't allowed. */
  playMove(move: number): boolean {
    const game = useLifeStore.getState().game;
    if (!game || game.status !== "playing") return false;
    const rules = games[game.kind];
    const state = replay(rules, game.moves);
    if (!state || rules.turn(state) !== game.me || !rules.apply(state, move)) return false;
    const seq = game.moves.length;
    this.applyGameMove(game, move);
    if (game.opponent.kind === "classmate") {
      this.send("life_game", { to: game.opponent.id, gameId: game.id, action: "move", game: game.kind, move, seq });
    } else {
      this.scheduleComputer(game.id);
    }
    return true;
  }

  /** Leaves the current game (telling a classmate opponent). */
  leaveGame(): void {
    const game = useLifeStore.getState().game;
    if (!game) return;
    if (game.opponent.kind === "classmate" && (game.status === "playing" || game.status === "waiting")) {
      this.send("life_game", { to: game.opponent.id, gameId: game.id, action: "quit", game: game.kind });
    }
    useLifeStore.getState().patch({ game: null });
    this.sendPresence(true);
  }

  private setGame(game: GameSession | null): void {
    useLifeStore.getState().patch({ game });
    this.sendPresence(true);
  }

  private scheduleComputer(gameId: string): void {
    setTimeout(() => {
      const game = useLifeStore.getState().game;
      if (!game || game.id !== gameId || game.status !== "playing") return;
      const rules = games[game.kind];
      const state = replay(rules, game.moves);
      if (!state || rules.turn(state) === game.me) return;
      this.applyGameMove(game, rules.computerMove(state, Math.random));
    }, COMPUTER_THINK_MS);
  }

  /** Adds a move, then ends the game (with rewards) if it is over. */
  private applyGameMove(game: GameSession, move: number): void {
    const rules = games[game.kind];
    const moves = [...game.moves, move];
    const state = replay(rules, moves);
    if (!state) return;
    const outcome = rules.outcome(state);
    if (outcome === null) {
      this.setGame({ ...game, moves });
      playSound("button-click");
      return;
    }
    const result = outcome === "draw" ? "draw" : outcome === game.me ? "win" : "lose";
    this.setGame({ ...game, moves, status: "over", result });
    const vsClassmate = game.opponent.kind === "classmate";
    const reward = finishGame(this.sim, vsClassmate, result);
    this.handleEvents(reward.events);
    const store = useLifeStore.getState();
    playSound(result === "win" ? "winner" : "powerup");
    vibrate(result === "win" ? [30, 40, 30] : 20);
    store.toast(
      `${result === "win" ? "🏆 You won!" : result === "draw" ? "🤝 It's a draw!" : "🎲 Good game!"} ${reward.summary}`,
      result === "lose" ? "info" : "good",
    );
    if (game.opponent.kind === "classmate" && this.session.studentId < game.opponent.id) {
      void this.addFriendship(game.opponent.id, SOCIAL_RULES.footballTogether.friendship);
    }
    void this.save(true);
  }

  private receiveGame(fromId: string, p: GamePayload): void {
    const store = useLifeStore.getState();
    const game = store.game;
    const name = this.nameOf(fromId);
    if (p.action === "invite") {
      if (game && (game.status === "playing" || game.status === "waiting")) {
        this.send("life_game", { to: fromId, gameId: p.gameId, action: "decline", game: p.game });
        return;
      }
      if (store.muted.includes(fromId)) {
        this.send("life_game", { to: fromId, gameId: p.gameId, action: "decline", game: p.game });
        return;
      }
      store.patch({ invite: { id: p.gameId, kind: p.game, fromId, fromName: name, at: Date.now() } });
      playSound("button-click");
      vibrate([20, 30, 20]);
      return;
    }
    if (p.action === "quit" && store.invite?.id === p.gameId) {
      store.patch({ invite: null });
      return;
    }
    if (!game || game.id !== p.gameId || game.opponent.kind !== "classmate" || game.opponent.id !== fromId) return;
    if (p.action === "accept" && game.status === "waiting") {
      this.setGame({ ...game, status: "playing" });
      store.toast(`🎲 ${name} joined your game!`, "good");
    } else if (p.action === "decline" && game.status === "waiting") {
      this.setGame({ ...game, status: "cancelled", note: `${name} can't play right now.` });
    } else if (p.action === "quit" && (game.status === "playing" || game.status === "waiting")) {
      this.setGame({ ...game, status: "cancelled", note: `${name} left the game.` });
    } else if (p.action === "move" && game.status === "playing" && p.seq === game.moves.length && Number.isInteger(p.move)) {
      const rules = games[game.kind];
      const state = replay(rules, game.moves);
      if (state && rules.turn(state) !== game.me && rules.apply(state, p.move!)) this.applyGameMove(game, p.move!);
    }
  }

  /** Ends a game if the classmate opponent has left school. */
  private checkGameOpponent(now: number): void {
    const store = useLifeStore.getState();
    if (store.invite && (now - store.invite.at > INVITE_TIMEOUT_MS || !this.classmates.has(store.invite.fromId))) {
      store.patch({ invite: null });
    }
    const game = store.game;
    if (!game || game.opponent.kind !== "classmate" || (game.status !== "playing" && game.status !== "waiting")) return;
    if (!this.classmates.has(game.opponent.id)) {
      this.setGame({ ...game, status: "cancelled", note: `${game.opponent.name} left school.` });
    }
  }

  // -------------------------------------------------------------------------
  // Chat
  // -------------------------------------------------------------------------

  /** Sends a message to the whole school (to = null) or to one classmate. */
  async sendChat(to: string | null, rawBody: string): Promise<boolean> {
    const body = rawBody.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!body) return false;
    const store = useLifeStore.getState();
    try {
      const { id, at } = await this.api.sendMessage(this.session.token, to, body);
      const message: ChatMessage = { id, from: this.session.studentId, fromName: this.session.name, to, body, at };
      this.addMessage(message);
      this.send("life_chat", { id, to, body, at, fromName: this.session.name });
      return true;
    } catch (e) {
      store.toast(e instanceof Error ? e.message : "Message not sent.", "bad");
      return false;
    }
  }

  /** Marks a conversation as read and remembers it is on screen. */
  openThread(thread: string | null): void {
    const store = useLifeStore.getState();
    store.patch({ openThread: thread });
    if (thread) this.markRead(thread);
  }

  markRead(thread: string): void {
    const store = useLifeStore.getState();
    const me = this.session.studentId;
    const last = store.messages.filter((m) => threadOf(m, me) === thread).at(-1)?.id ?? 0;
    if ((store.chatRead[thread] ?? 0) >= last) return;
    store.patch({ chatRead: { ...store.chatRead, [thread]: last } });
    this.saveChatPrefs();
  }

  toggleMute(id: string): void {
    const store = useLifeStore.getState();
    const muted = store.muted.includes(id) ? store.muted.filter((m) => m !== id) : [...store.muted, id];
    store.patch({ muted });
    this.saveChatPrefs();
  }

  private addMessage(message: ChatMessage): void {
    const store = useLifeStore.getState();
    if (store.messages.some((m) => m.id === message.id && m.from === message.from)) return;
    const messages = [...store.messages, message].sort((a, b) => a.at - b.at || a.id - b.id).slice(-200);
    store.patch({ messages });
    const me = this.session.studentId;
    const thread = threadOf(message, me);
    if (message.from === me) {
      this.markRead(thread);
      if (message.to === null) this.bubbles.set(me, { text: shortBubble(message.body), until: Date.now() + CHAT_BUBBLE_MS });
      return;
    }
    if (store.muted.includes(message.from)) return;
    if (message.to === null) {
      this.bubbles.set(message.from, { text: shortBubble(maskRudeWords(message.body)), until: Date.now() + CHAT_BUBBLE_MS });
    }
    if (store.openThread === thread) {
      this.markRead(thread);
      return;
    }
    playSound("button-click");
    vibrate(15);
    const text = maskRudeWords(message.body);
    store.toast(message.to === null ? `💬 ${message.fromName}: ${text}` : `💌 ${message.fromName} (to you): ${text}`, "info");
  }

  private async refreshMessages(): Promise<void> {
    try {
      const fromServer = await this.api.messages(this.session.token);
      const store = useLifeStore.getState();
      const first = store.messages.length === 0;
      const fresh = fromServer.filter((m) => !store.messages.some((x) => x.id === m.id && x.from === m.from));
      // The server's list is the record (it also drops anything faked over the live channel).
      store.patch({ messages: fromServer.slice(-200) });
      // Pop-ups only for messages that arrived while we weren't listening (not on first load).
      if (!first) for (const m of fresh) if (m.from !== this.session.studentId) this.notifyLate(m);
    } catch (e) {
      if (e instanceof LifeApiError && e.message.includes("signed in somewhere else")) this.signedOutElsewhere();
    }
  }

  private notifyLate(m: ChatMessage): void {
    const store = useLifeStore.getState();
    if (store.muted.includes(m.from) || store.openThread === threadOf(m, this.session.studentId)) return;
    store.toast(m.to === null ? `💬 ${m.fromName}: ${maskRudeWords(m.body)}` : `💌 ${m.fromName} (to you): ${maskRudeWords(m.body)}`, "info");
  }

  private loadChatPrefs(): { chatRead: Record<string, number>; muted: string[] } {
    try {
      const raw = JSON.parse(window.localStorage.getItem(chatPrefsKey(this.session.studentId)) ?? "{}");
      return {
        chatRead: raw.chatRead && typeof raw.chatRead === "object" ? raw.chatRead : {},
        muted: Array.isArray(raw.muted) ? raw.muted.filter((x: unknown) => typeof x === "string") : [],
      };
    } catch {
      return { chatRead: {}, muted: [] };
    }
  }

  private saveChatPrefs(): void {
    const { chatRead, muted } = useLifeStore.getState();
    try {
      window.localStorage.setItem(chatPrefsKey(this.session.studentId), JSON.stringify({ chatRead, muted }));
    } catch {
      // ignore
    }
  }

  /** Moves money between the wallet and savings. */
  savings(direction: "in" | "out", amount: number): boolean {
    const result = moveSavings(this.sim, direction, amount);
    const store = useLifeStore.getState();
    if (!result.ok) {
      store.toast(result.reason, "bad");
      return false;
    }
    playSound("button-click");
    this.handleEvents(result.events ?? []);
    store.toast(direction === "in" ? `🏦 Saved ${formatMoney(amount)}` : `💵 Took out ${formatMoney(amount)}`, "good");
    void this.save(true);
    this.publishHud(Date.now());
    return true;
  }

  closeReport(): void {
    useLifeStore.getState().patch({ report: null });
  }

  // -------------------------------------------------------------------------
  // Network
  // -------------------------------------------------------------------------

  private send<T extends LifeMessage["type"]>(type: T, payload: Extract<LifeMessage, { type: T }>["payload"]): void {
    if (this.disposed && type !== "life_leave") return;
    this.transport.send({
      type,
      roomCode: this.session.classCode,
      playerId: this.session.studentId,
      payload,
      timestamp: Date.now(),
    } as LifeMessage);
  }

  private sendPresence(force: boolean): void {
    const sim = this.sim;
    const playing = useLifeStore.getState().game?.status === "playing";
    const key = `${Math.round(sim.x)},${Math.round(sim.y)},${sim.facing},${sim.activity?.key ?? ""},${playing}`;
    const now = Date.now();
    const changed = key !== this.lastPresenceKey;
    if (!force && now - this.lastPresence < (changed ? PRESENCE_MOVING_MS : PRESENCE_IDLE_MS)) return;
    this.lastPresence = now;
    this.lastPresenceKey = key;
    this.send("life_state", {
      name: this.session.name,
      look: sim.profile.look,
      x: Math.round(sim.x),
      y: Math.round(sim.y),
      facing: sim.facing,
      activity: sim.activity?.key ?? (useLifeStore.getState().game?.status === "playing" ? "board_games" : null),
      mood: mood(sim.profile.day.needs),
    });
  }

  private receive(m: LifeMessage): void {
    if (this.disposed || m.roomCode !== this.session.classCode || m.playerId === this.session.studentId) return;
    if (m.type === "life_leave") {
      this.classmates.delete(m.playerId);
      return;
    }
    if (m.type === "life_state") {
      const p = m.payload;
      const look = sanitizeLook(p.look);
      if (!look || !Number.isFinite(p.x) || !Number.isFinite(p.y) || typeof p.name !== "string") return;
      const existing = this.classmates.get(m.playerId);
      const isNew = !existing;
      this.classmates.set(m.playerId, {
        id: m.playerId,
        name: Array.from(p.name).slice(0, 20).join(""),
        look,
        x: p.x,
        y: p.y,
        facing: (["up", "down", "left", "right"] as const).includes(p.facing) ? p.facing : "down",
        activity: getActivity(p.activity) ? p.activity : null,
        mood: Number(p.mood) || 0,
        lastSeen: Date.now(),
        display: existing?.display ?? { x: p.x, y: p.y },
      });
      if (isNew) {
        // Reply so the newcomer sees us straight away.
        this.sendPresence(true);
        if (!this.rosterNames.has(m.playerId)) void this.refreshRoster();
      }
      return;
    }
    if (m.type === "life_game") {
      if (m.payload.to === this.session.studentId && isGameKind(m.payload.game)) this.receiveGame(m.playerId, m.payload);
      return;
    }
    if (m.type === "life_chat") {
      const p = m.payload;
      if (!Number.isFinite(p.id) || typeof p.body !== "string" || (p.to !== null && p.to !== this.session.studentId)) return;
      this.addMessage({
        id: p.id,
        from: m.playerId,
        fromName: typeof p.fromName === "string" ? Array.from(p.fromName).slice(0, 20).join("") : this.nameOf(m.playerId),
        to: p.to,
        body: p.body.slice(0, MAX_MESSAGE_LENGTH),
        at: Number(p.at) || Date.now(),
      });
      return;
    }
    if (m.type === "life_social") {
      const p = m.payload;
      if (p.to !== this.session.studentId || !["hi", "help", "share"].includes(p.kind)) return;
      const name = this.nameOf(m.playerId);
      if (typeof p.friendship === "number") this.friendships[m.playerId] = p.friendship;
      this.handleEvents(receiveSocial(this.sim, p.kind));
      const store = useLifeStore.getState();
      playSound("button-click");
      vibrate(15);
      if (p.kind === "hi" && p.line && GREETINGS.includes(p.line as (typeof GREETINGS)[number])) {
        this.bubbles.set(m.playerId, { text: p.line, until: Date.now() + BUBBLE_MS });
        store.toast(`💬 ${name}: “${p.line}”`, "info");
      }
      if (p.kind === "help") store.toast(`📚 ${name} helped you with homework (+${SOCIAL_RULES.help.theirGrades} grades)`, "good");
      if (p.kind === "share") store.toast(`🍩 ${name} shared a snack with you!`, "good");
    }
  }

  private nameOf(id: string): string {
    return this.classmates.get(id)?.name ?? this.rosterNames.get(id)?.name ?? "A classmate";
  }

  private async addFriendship(otherId: string, points: number): Promise<number | null> {
    try {
      const total = await this.api.addFriendship(this.session.token, otherId, points);
      if (typeof total === "number") this.friendships[otherId] = total;
      return total;
    } catch (e) {
      console.warn("[life] friendship not saved", e);
      return null;
    }
  }

  private async refreshRoster(): Promise<void> {
    try {
      const roster = await this.api.roster(this.session.token);
      this.rosterNames = new Map(roster.students.map((s) => [s.id, { name: s.name, look: sanitizeLook(s.look) }]));
      this.friendships = { ...this.friendships, ...roster.friendships };
    } catch (e) {
      if (e instanceof LifeApiError && e.message.includes("signed in somewhere else")) this.signedOutElsewhere();
    }
  }

  private async save(force: boolean): Promise<void> {
    if (this.saving && !force) return;
    this.saving = true;
    this.lastSave = Date.now();
    const profile: LifeProfile = JSON.parse(JSON.stringify(this.sim.profile));
    this.session.profile = profile;
    storeSession(this.session);
    try {
      const ok = await this.api.save(this.session.token, profile);
      if (!ok) this.signedOutElsewhere();
    } catch (e) {
      console.warn("[life] save failed, will retry", e);
    } finally {
      this.saving = false;
    }
  }

  private signedOutElsewhere(): void {
    this.dispose();
    clearStoredSession();
    useLifeStore.getState().patch({ status: "signed_out" });
  }
}

function shortBubble(text: string): string {
  const chars = Array.from(text.replace(/\s+/g, " "));
  return chars.length > 40 ? `${chars.slice(0, 39).join("")}…` : chars.join("");
}
