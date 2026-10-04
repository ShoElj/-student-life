// School Life basics: start a school, a classmate joins, wrong PIN, shop, bank, an activity,
// the star leaderboard and the phone layout.
import { BASE, TIME, check, doActivity, joinSchool, newContext, newPage, noSideScroll, run, shot, startSchool, walkToSign, wallet } from "../lib.mjs";

await run(async (browser) => {
  const ctx = await newContext(browser, { secondsIntoDay: TIME.break });
  const a = await newPage(ctx, "Amaka");
  const code = await startSchool(a, { name: "Amaka" });
  check(/^[A-Z0-9]{6}$/.test(code), "school gets a 6-letter code", code);

  const t = await newPage(ctx, "Tunde");
  await joinSchool(t, code, { name: "Tunde" });
  await a.bringToFront();
  const online = (p) => p.getByRole("button", { name: /👥/ }).filter({ hasText: "2" }).waitFor({ timeout: 30_000 }).then(() => true, () => false);
  check(await online(a), "Amaka sees 2 students online");
  check(await online(t), "Tunde sees 2 students online");

  // Someone else can't log in as Amaka with the wrong PIN.
  const intruder = await newPage(ctx, "intruder");
  await intruder.goto(`${BASE}/life?code=${code}`);
  await intruder.getByLabel("Your name").fill("amaka");
  await intruder.getByLabel("Secret PIN (4 numbers)").fill("0000");
  await intruder.getByRole("button", { name: "Go to school" }).click();
  // (Next.js has its own empty alert for page changes, so look for the one with words in it.)
  const alert = intruder.getByRole("alert").filter({ hasText: /\w/ });
  await alert.waitFor();
  check(intruder.url().includes("?code="), "wrong PIN is refused", await alert.innerText());
  await intruder.close();

  // A quick activity: drink water.
  await a.bringToFront();
  const water = await walkToSign(a, "🚰", /Drink water/);
  check(/Done/.test(await doActivity(a, water)), "drinking water finishes with a Done message");

  // Bank: save ₦500 (only works at the bank). The wallet can also go up here: saving
  // completes the "put money in savings" goal on some days.
  const bank = await walkToSign(a, "🏦", /Use the School Bank/);
  await bank.click();
  await a.getByRole("button", { name: "₦500" }).first().click();
  await a.waitForTimeout(400);
  const savings = await a.getByText("Savings", { exact: false }).first().locator("..").innerText();
  check(savings.includes("₦500"), "saving ₦500 at the bank", savings.replace(/\s+/g, " "));
  await shot(a, "school-bank");
  await a.getByRole("button", { name: "Close" }).last().click();

  // Shop: buy a red top.
  const shop = await walkToSign(a, "🛍️", /Shop for clothes/);
  await shop.click();
  const coins = await wallet(a);
  // Tap once to see the price, again to buy.
  await a.getByRole("tab", { name: /Extras/ }).click();
  const headband = a.getByRole("button", { name: /Headband/ });
  await headband.click();
  await headband.click();
  await a.waitForTimeout(300);
  check((await wallet(a)) === coins - 500, "buying a ₦500 headband at the shop", `${coins} → ${await wallet(a)}`);
  await a.getByRole("button", { name: "Close" }).last().click();

  // Leaderboard opens on this week's stars.
  await a.getByRole("button", { name: "Menu" }).click();
  await a.getByRole("button", { name: /Leaderboard/ }).click();
  check((await a.getByRole("tab", { selected: true }).innerText()).includes("This week"), "leaderboard opens on this week's stars");
  check(/★/.test(await a.locator("ol li").first().innerText()), "leaderboard shows star points");
  await a.getByRole("button", { name: "Close" }).last().click();

  // Phone layout.
  // Same browser (locally, without Supabase, schools are kept in this browser's storage).
  // Three game tabs at once is too much for a test machine, so close the others first.
  await t.close();
  await a.close();
  const m = await newPage(ctx, "phone");
  await m.setViewportSize({ width: 390, height: 844 });
  await joinSchool(m, code, { name: "Chioma", pin: "5555" });
  await shot(m, "school-phone");
  check(await noSideScroll(m), "phone layout has no sideways scrolling");
});
