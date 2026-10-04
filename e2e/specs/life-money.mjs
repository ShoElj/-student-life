// Sending money to a classmate: it leaves one wallet, arrives in the other, and isn't paid twice.
import { check, joinSchool, newContext, newPage, run, startSchool, wallet } from "../lib.mjs";

await run(async (browser) => {
  const ctx = await newContext(browser);
  const a = await newPage(ctx, "Ada");
  const code = await startSchool(a, { name: "Ada" });
  const b = await newPage(ctx, "Bayo");
  await joinSchool(b, code, { name: "Bayo" });
  const aBefore = await wallet(a);
  const bBefore = await wallet(b);

  await a.bringToFront();
  await a.getByRole("button", { name: /^Wallet:/ }).click();
  await a.getByRole("tab", { name: /Send/ }).click();
  const bayo = a.getByRole("dialog").getByRole("button", { name: /Bayo/ }).first();
  await bayo.waitFor({ timeout: 15_000 });
  await bayo.click();
  await a.getByRole("button", { name: "₦500" }).click();
  await a.getByLabel("Note (optional)").fill("for lunch 🍛");
  await a.getByRole("button", { name: /Send ₦500/ }).click();
  await a.waitForTimeout(600);
  check((await wallet(a)) === aBefore - 500, "₦500 leaves the sender's wallet", `${aBefore} → ${await wallet(a)}`);

  // Usually instant; if the "money sent" message is missed, the classmate's game checks again
  // every 30 seconds, so allow for that.
  await b.bringToFront();
  await b.waitForFunction((want) => document.querySelector("[aria-label^='Wallet:']")?.getAttribute("aria-label")?.replace(/\D/g, "") === String(want), bBefore + 500, { timeout: 40_000 }).catch(() => {});
  check((await wallet(b)) === bBefore + 500, "₦500 arrives in the classmate's wallet", `${bBefore} → ${await wallet(b)}`);

  await b.reload();
  await b.getByRole("button", { name: "Map" }).waitFor();
  await b.waitForTimeout(2500);
  check((await wallet(b)) === bBefore + 500, "the money is still there after a reload, and only paid once", String(await wallet(b)));
});
