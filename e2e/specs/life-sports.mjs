// Every sport against the computer, played to a result: ten-ten, 100 m race, basketball,
// football and table tennis.
import { TIME, check, newContext, newPage, resultText, run, shot, startSchool, walkToSign } from "../lib.mjs";

await run(async (browser) => {
  const ctx = await newContext(browser, { secondsIntoDay: TIME.afterSchool });
  const a = await newPage(ctx, "Sporty");
  await startSchool(a, { name: "Sporty" });

  const play = {
    async tenten() {
      await a.keyboard.press("ArrowLeft");
      for (let i = 0; i < 6; i++) {
        await a.waitForFunction(() => /Partner shows/.test(document.querySelector("p.sr-only")?.textContent ?? ""), null, { timeout: 4000 }).catch(() => {});
        const call = (await a.evaluate(() => document.querySelector("p.sr-only")?.textContent)) ?? "";
        await a.keyboard.press(call.includes("left") ? "ArrowLeft" : "ArrowRight");
        await a.waitForFunction((prev) => document.querySelector("p.sr-only")?.textContent !== prev || /out|Perfect/.test(document.body.innerText), call, { timeout: 3000 }).catch(() => {});
      }
    },
    async race() {
      await a.waitForTimeout(2600); // countdown
      for (let i = 0; i < 52; i++) {
        await a.keyboard.press(i % 2 ? "ArrowRight" : "ArrowLeft");
        await a.waitForTimeout(60);
      }
    },
    async basketball() {
      for (let i = 0; i < 10; i++) {
        await a.waitForTimeout(300 + ((i * 137) % 500));
        await a.keyboard.press("Space");
        await a.waitForTimeout(950);
      }
    },
    async football() {
      for (let i = 0; i < 5; i++) {
        await a.getByRole("button", { name: i % 2 ? "Aim high left" : "Aim low right" }).click();
        await a.waitForTimeout(400 + i * 120);
        await a.keyboard.press("Space");
        await a.waitForTimeout(1400);
      }
    },
    async tabletennis() {
      for (let i = 0; i < 120 && !(await resultText(a).count()); i++) {
        await a.keyboard.press("Space");
        await a.waitForTimeout(150);
      }
    },
  };
  const venues = [
    ["tenten", "👣", /Play ten-ten/],
    ["race", "🏃", /Run a race/],
    ["basketball", "🏀", /Play basketball/],
    ["football", "⚽", /Play football/],
    ["tabletennis", "🏓", /Play table tennis/],
  ];
  for (const [sport, emoji, label] of venues) {
    try {
      const venue = await walkToSign(a, emoji, label);
      await venue.click();
      await a.getByRole("button", { name: /The computer/ }).click();
      await a.getByRole("button", { name: "Start!" }).click();
      await play[sport]();
      await resultText(a).waitFor({ timeout: 60_000 });
      const scores = (await a.locator(".text-xl.font-black.text-ink").allInnerTexts()).join(" vs ");
      check(true, `${sport} plays to a result`, `${await resultText(a).innerText()} · ${scores}`);
      await shot(a, `sport-${sport}`);
      await a.getByRole("button", { name: "Done", exact: true }).click();
      await a.getByRole("button", { name: "Close" }).last().click().catch(() => {});
    } catch (e) {
      await shot(a, `sport-${sport}-failed`);
      check(false, `${sport} plays to a result`, e instanceof Error ? e.message.split("\n")[0] : String(e));
      await a.keyboard.press("Escape");
    }
  }
});
