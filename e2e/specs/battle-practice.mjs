// Breaktime Battle practice mode on desktop and on phones, tablets and landscape screens.
import { BASE, check, newContext, newPage, noSideScroll, run, shot } from "../lib.mjs";

await run(async (browser) => {
  const desk = await newPage(await newContext(browser, { viewport: { width: 1366, height: 860 } }), "desktop");
  await desk.goto(BASE);
  await desk.getByRole("link", { name: /Practice alone/ }).click();
  await desk.getByLabel("Host name").fill("Amaka");
  await desk.getByRole("button", { name: "Create Practice Room" }).click();
  await desk.waitForURL(/\/room\/\d{4}$/);
  await desk.getByRole("button", { name: "Select Snack Lover" }).click();
  await desk.getByRole("button", { name: "Start Break Time" }).click();
  await desk.waitForURL(/\/game$/);
  await desk.waitForTimeout(3500);
  await desk.keyboard.down("ArrowRight");
  await desk.waitForTimeout(2000);
  await desk.keyboard.up("ArrowRight");
  await desk.getByRole("button", { name: "I am winning" }).last().click();
  await desk.getByRole("button", { name: "End Match" }).click();
  await desk.getByRole("button", { name: "Tap again to end" }).click();
  await desk.waitForURL(/\/results$/, { timeout: 8000 });
  check((await desk.locator("table").innerText()).includes("Amaka"), "practice match ends with results");
  await desk.getByRole("button", { name: "Play Again" }).click();
  await desk.waitForURL(/\/room\/\d{4}$/);

  for (const [name, viewport] of [
    ["portrait", { width: 390, height: 844 }],
    ["landscape", { width: 844, height: 390 }],
    ["tablet", { width: 820, height: 1180 }],
  ]) {
    const ctx = await newContext(browser, { viewport, hasTouch: true, isMobile: true });
    const p = await newPage(ctx, name);
    await p.goto(`${BASE}/create?practice=1`);
    await p.getByLabel("Host name").fill("Bola");
    await p.getByRole("button", { name: "Create Practice Room" }).click();
    await p.waitForURL(/\/room\/\d{4}$/);
    await p.getByRole("button", { name: "Start Break Time" }).click();
    await p.waitForURL(/\/game$/);
    await p.waitForTimeout(3800);
    // Thumb on the joystick zone, push right.
    const x = viewport.width * 0.2;
    const y = viewport.height * 0.75;
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x + 60, y + 10, { steps: 8 });
    await p.waitForTimeout(1500);
    await p.mouse.up();
    await p.getByRole("button", { name: "Send a reaction" }).click();
    await p.getByRole("button", { name: "Good move" }).click();
    await p.getByRole("button", { name: "Game menu" }).click();
    await p.getByRole("button", { name: "End Match" }).click();
    await p.getByRole("button", { name: /Tap again/ }).click();
    await p.waitForURL(/\/results$/, { timeout: 8000 });
    await shot(p, `battle-${name}`);
    check(await noSideScroll(p), `${name}: plays to the results with no sideways scrolling`);
    await ctx.close();
  }
});
