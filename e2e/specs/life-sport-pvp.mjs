// Ten-ten between two classmates: a challenge, both play, both see the same result.
import { TIME, check, joinSchool, newContext, newPage, resultText, run, setTimeOfDay, startSchool, walkToSign } from "../lib.mjs";

await run(async (browser) => {
  // Set up during break (ten-ten is open then too), then jump to after school for the match.
  const ctx = await newContext(browser, { secondsIntoDay: TIME.break });
  const a = await newPage(ctx, "A");
  const code = await startSchool(a, { name: "Ada" });
  const venue = await walkToSign(a, "👣", /Play ten-ten/);
  const b = await newPage(ctx, "B");
  await joinSchool(b, code, { name: "Bayo" });

  await setTimeOfDay(ctx, TIME.afterSchool);
  await a.bringToFront();
  await venue.click();
  await a.getByRole("button", { name: "Challenge" }).click();
  await b.bringToFront();
  await b.getByRole("button", { name: "Let's play" }).click({ timeout: 30_000 });

  // B goes first and deliberately picks the wrong foot after one clap.
  await b.getByRole("button", { name: "Start!" }).click();
  await b.keyboard.press("ArrowLeft");
  await b.waitForTimeout(800);
  const callB = (await b.evaluate(() => document.querySelector("p.sr-only")?.textContent)) ?? "";
  await b.keyboard.press(callB.includes("left") ? "ArrowRight" : "ArrowLeft");
  const waiting = b.getByRole("status").filter({ hasText: /Waiting for .* to finish/ });
  check(await waiting.waitFor({ timeout: 30_000 }).then(() => true, () => false), "the first player waits for the other");

  // A gets one right, then is out.
  await a.bringToFront();
  await a.getByRole("button", { name: "Start!" }).click();
  await a.keyboard.press("ArrowLeft");
  await a.waitForTimeout(800);
  const callA = (await a.evaluate(() => document.querySelector("p.sr-only")?.textContent)) ?? "";
  await a.keyboard.press(callA.includes("left") ? "ArrowLeft" : "ArrowRight");
  await resultText(a).waitFor({ timeout: 30_000 });
  await b.bringToFront();
  await resultText(b).waitFor({ timeout: 30_000 });
  const scores = async (p) => (await p.locator(".text-xl.font-black.text-ink").allInnerTexts()).join(" vs ");
  check(true, "both players see a result", `${await resultText(a).innerText()} | ${await resultText(b).innerText()}`);
  const [sa, sb] = [await scores(a), await scores(b)];
  check(sa.split(" vs ").reverse().join(" vs ") === sb || sa === sb, "both see the same scores", `${sa} / ${sb}`);
});
