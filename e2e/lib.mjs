/**
 * Shared helpers for the browser tests: start a browser, create or join a school, walk somewhere
 * using the map, and record pass/fail checks.
 *
 * Settings (all optional):
 *   E2E_BASE_URL   the running site (default http://localhost:3100)
 *   E2E_OUT        where screenshots go (default e2e/.out)
 *   CHROMIUM_PATH  a Chromium to use instead of Playwright's own download
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

export const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
export const OUT = process.env.E2E_OUT ?? join(dirname(fileURLToPath(import.meta.url)), ".out");
mkdirSync(OUT, { recursive: true });

/** One School Life day is 10 minutes. These are seconds into the day. */
export const DAY_MS = 600_000;
export const TIME = { lesson: 50, break: 200, afterSchool: 440, evening: 500 };

const failures = [];
const errors = [];

/** Records a pass or a fail without stopping the test. */
export function check(ok, what, detail = "") {
  console.log(`${ok ? "  ✓" : "  ✗"} ${what}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(what);
}

export async function launch() {
  const fallback = "/opt/pw-browsers/chromium";
  const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(fallback) ? fallback : undefined);
  return chromium.launch({ executablePath });
}

/** A browser context, optionally with the clock set to a time of the school day. */
export async function newContext(browser, { secondsIntoDay, ...options } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  if (secondsIntoDay !== undefined) {
    await ctx.clock.install({ time: Math.floor(Date.now() / DAY_MS) * DAY_MS + secondsIntoDay * 1000 });
    await ctx.clock.resume();
  }
  return ctx;
}

/** A new tab that reports page errors and closes the "welcome back" and report cards whenever they show. */
export async function newPage(ctx, tag = "page") {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
  page.on("console", (m) => {
    // Not failures: realtime can't connect without Supabase keys locally, and Chrome refuses
    // to vibrate a page nobody has tapped yet.
    if (m.type() === "error" && !/supabase|websocket|Failed to load resource|navigator\.vibrate/i.test(m.text())) errors.push(`[${tag}] ${m.text()}`);
  });
  // Both can show at once (a day ends just as a new one starts); the welcome card is on top.
  await page.addLocatorHandler(page.getByRole("button", { name: /^(Let's go!|Nice!)$/ }).first(), async () => {
    for (const name of ["Let's go!", "Nice!"]) {
      const button = page.getByRole("button", { name, exact: true });
      if (await button.isVisible()) await button.click({ timeout: 5000 }).catch(() => {});
    }
  });
  return page;
}

/** Starts a new School Life school. Returns its 6-letter code. */
export async function startSchool(page, { school = "Unity High", name = "Ada", pin = "1234" } = {}) {
  await page.goto(`${BASE}/life`);
  await page.getByRole("tab", { name: "Start a school" }).click();
  await page.getByLabel("School name").fill(school);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Secret PIN (4 numbers)").fill(pin);
  await page.getByRole("button", { name: "Start my school" }).click();
  await page.waitForURL(/\/life\/[A-Z0-9]{6}$/);
  await page.getByRole("button", { name: "Map" }).waitFor();
  await page.waitForTimeout(1200);
  return page.url().slice(-6);
}

/** Joins an existing school as another student. */
export async function joinSchool(page, code, { name = "Bayo", pin = "4321" } = {}) {
  await page.goto(`${BASE}/life?code=${code}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Secret PIN (4 numbers)").fill(pin);
  await page.getByRole("button", { name: "Go to school" }).click();
  await page.waitForURL(new RegExp(`/life/${code}$`));
  await page.getByRole("button", { name: "Map" }).waitFor();
  await page.waitForTimeout(1500);
}

/**
 * Walks to an activity sign by tapping its emoji on the map, until the activity's button shows.
 * Some emojis appear more than once (two lesson signs), so each one is tried in turn.
 */
export async function walkToSign(page, emoji, button) {
  const target = page.getByRole("button", { name: button });
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Map" }).click();
    const signs = page.locator("svg text", { hasText: emoji });
    if (i >= (await signs.count())) {
      await page.getByRole("button", { name: "Close" }).last().click();
      break;
    }
    // The map scrolls sideways on phones, so the sign may be off-screen: fire the tap directly.
    await signs.nth(i).dispatchEvent("click");
    await page.getByText(/Walking to/).waitFor({ state: "detached", timeout: 60_000 });
    await page.waitForTimeout(400);
    if (await target.count()) return target;
  }
  throw new Error(`Couldn't walk to ${emoji} (${button})`);
}

/**
 * Does a timed activity at the sign you're standing at and waits for it to finish.
 * Returns the "Done" message.
 */
export async function doActivity(page, button) {
  const busy = page.getByText(/^You are /).first();
  await button.click();
  if (!(await busy.waitFor({ timeout: 4000 }).then(() => true, () => false))) await page.keyboard.press("KeyE");
  const done = page.getByText(/Done/).first();
  await done.waitFor({ timeout: 30_000 });
  return done.innerText();
}

/** The visible sports or games result ("You won!", "It's a draw!", "Computer won this time"). */
export const resultText = (page) => page.getByText(/You won!|It's a draw!|won this time/).locator("visible=true").first();

export async function noSideScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

export const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });

/** Prints the result and exits: 1 if any check failed or the page threw an error. */
export async function finish(browser) {
  await browser?.close();
  check(errors.length === 0, "no page errors", errors.join(" | "));
  if (failures.length) {
    console.log(`\nFAILED: ${failures.join("; ")}`);
    process.exit(1);
  }
  process.exit(0);
}

/** Runs a test body, turning a thrown error into a failure with a screenshot. */
export async function run(body) {
  const browser = await launch();
  try {
    await body(browser);
  } catch (e) {
    for (const ctx of browser.contexts()) for (const p of ctx.pages()) await p.screenshot({ path: join(OUT, `crash-${Date.now()}.png`) }).catch(() => {});
    // The first line says what failed; Playwright's call log says what it was waiting for.
    const lines = (e instanceof Error ? e.message : String(e)).split("\n").map((l) => l.trim());
    check(false, "test ran to the end", [lines[0], ...lines.filter((l) => /^- waiting for/.test(l)).slice(0, 1)].join(" "));
  }
  await finish(browser);
}

/** Money in the wallet, read from the wallet button (e.g. "Wallet: ₦1,700" → 1700). */
export async function wallet(page) {
  const label = (await page.getByRole("button", { name: /^Wallet:/ }).getAttribute("aria-label")) ?? "";
  return Number(label.replace(/[^\d]/g, ""));
}
