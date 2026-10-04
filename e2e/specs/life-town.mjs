// The town: bus there, eat at the Food Court, buy a desk, study at home, and the homes ladder.
import { TIME, check, doActivity, newContext, newPage, run, shot, startSchool, walkToSign, wallet } from "../lib.mjs";

await run(async (browser) => {
  const ctx = await newContext(browser, { secondsIntoDay: TIME.afterSchool, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const a = await newPage(ctx, "Tolu");
  await startSchool(a, { name: "Tolu" });

  const bus = await walkToSign(a, "🚌", /Catch the bus to town/);
  await bus.click();
  check(await a.getByText(/Welcome to town/).waitFor({ timeout: 15_000 }).then(() => true, () => false), "the bus goes to town");

  // Food Court: search, order, eat.
  const food = await walkToSign(a, "🍽️", /Order food/);
  await food.click();
  await a.getByLabel("Search restaurants or food").fill("puff");
  check((await a.getByText("Mama's Bukka").count()) > 0, "searching 'puff' finds Mama's Bukka");
  const before = await wallet(a);
  await a.getByRole("button", { name: "₦150" }).first().click();
  check((await wallet(a)) === before - 150, "ordering puff-puff costs ₦150", `${before} → ${await wallet(a)}`);
  check(await a.getByText(/You are eating/).first().waitFor({ timeout: 5000 }).then(() => true, () => false), "you sit and eat");
  check(await a.getByText(/Done/).first().waitFor({ timeout: 15_000 }).then(() => true, () => false), "eating finishes");
  await shot(a, "town-food-court");

  // Furniture shop: a study desk.
  const shop = await walkToSign(a, "🛋️", /Shop for furniture/);
  await shop.click();
  const coins = await wallet(a);
  await a.getByRole("tab", { name: "Desk" }).click();
  await a.getByRole("button", { name: /Study desk/ }).click();
  check((await wallet(a)) === coins - 1200, "buying a study desk", `${coins} → ${await wallet(a)}`);
  await a.getByRole("button", { name: "Close" }).last().click();

  // Study at the desk at home.
  const desk = await walkToSign(a, "📖", /Study at your desk/);
  const studied = await doActivity(a, desk);
  check(/grades/.test(studied), "studying at home gives grades", studied);

  // Homes ladder.
  const room = await walkToSign(a, "🏠", /Go to your room/);
  await room.click();
  await a.getByRole("tab", { name: /Homes/ }).click();
  check((await a.getByText("You live here").count()) === 1, "you start in the family house");
  check((await a.getByRole("button", { name: /Lv 2/ }).count()) === 1, "the self-contain needs level 2");
  await shot(a, "town-homes");
});
