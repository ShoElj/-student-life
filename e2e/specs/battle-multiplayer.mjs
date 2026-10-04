// Breaktime Battle with a host and a student: joining rules (wrong code, a name already taken), a match, results, play again, remove.
import { BASE, check, newContext, newPage, run } from "../lib.mjs";

await run(async (browser) => {
  const ctx = await newContext(browser, { viewport: { width: 1280, height: 820 } });
  const host = await newPage(ctx, "host");
  const kid = await newPage(ctx, "kid");
  await host.goto(`${BASE}/create`);
  await host.getByLabel("Host name").fill("Mrs Adeyemi");
  await host.getByLabel("Practice bots").selectOption("0");
  await host.getByRole("button", { name: "Create Game Room" }).click();
  await host.waitForURL(/\/room\/\d{4}$/);
  const code = host.url().slice(-4);

  const alertText = async () => (await kid.getByRole("alert").filter({ hasText: /\w/ }).allInnerTexts()).join(" ");
  await kid.goto(`${BASE}/join`);
  await kid.getByRole("button", { name: "Join Room" }).click();
  check((await alertText()).length > 0, "joining with nothing filled in shows an error");
  await kid.getByLabel("Room code").fill("0000");
  await kid.getByLabel("Your name").fill("Tunde");
  await kid.getByRole("button", { name: "Join Room" }).click();
  await kid.waitForTimeout(500);
  check(/not found/i.test(await alertText()), "a wrong room code is refused", await alertText());
  // (Names themselves aren't filtered on purpose; rude words are masked in chat instead.)
  await kid.getByLabel("Room code").fill(code);
  await kid.getByLabel("Your name").fill("mrs adeyemi");
  await kid.getByRole("button", { name: "Join Room" }).click();
  await kid.waitForTimeout(1500);
  check(/\/join/.test(kid.url()), "someone else's name in the room is refused", await alertText());
  await kid.getByLabel("Your name").fill("Tunde");
  await kid.getByRole("button", { name: "Join Room" }).click();
  await kid.waitForURL(/\/room\/\d{4}$/);
  await kid.getByRole("button", { name: "Select Fast Runner" }).click();
  await host.waitForTimeout(800);
  check((await host.locator("li").filter({ hasText: "Tunde" }).count()) > 0, "the host sees the student in the lobby");
  check((await kid.getByRole("button", { name: "Start Break Time" }).count()) === 0, "only the host can start");

  await host.getByRole("button", { name: "Start Break Time" }).click();
  await Promise.all([host.waitForURL(/\/game$/), kid.waitForURL(/\/game$/)]);
  await kid.waitForTimeout(3600);
  await kid.bringToFront();
  await kid.keyboard.down("ArrowRight");
  await kid.waitForTimeout(1500);
  await kid.keyboard.up("ArrowRight");
  check((await host.locator("#live-leaderboard + ol").innerText()).includes("Tunde"), "the live leaderboard shows the student");

  await host.getByRole("button", { name: "End Match" }).click();
  await host.getByRole("button", { name: "Tap again to end" }).click();
  await Promise.all([host.waitForURL(/\/results$/, { timeout: 8000 }), kid.waitForURL(/\/results$/, { timeout: 8000 })]);
  check((await kid.locator("table").innerText()).includes("Tunde"), "results show the student");
  await kid.getByRole("button", { name: "Play Again" }).click();
  await host.getByRole("button", { name: "Play Again" }).click();
  await Promise.all([host.waitForURL(/\/room\/\d{4}$/), kid.waitForURL(/\/room\/\d{4}$/)]);
  check(true, "both go back to the lobby to play again");

  await host.getByRole("button", { name: "Remove Tunde" }).click();
  await kid.waitForTimeout(800);
  check((await kid.locator("h1").allInnerTexts()).join(" ").includes("removed"), "the host can remove a student");
});
