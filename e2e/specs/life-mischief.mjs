// Breaking a rule: skipping class either gets away with it or gets caught (detention).
import { TIME, check, newContext, newPage, run, startSchool, walkToSign } from "../lib.mjs";

await run(async (browser) => {
  const ctx = await newContext(browser, { secondsIntoDay: TIME.lesson });
  const a = await newPage(ctx, "Naughty");
  await startSchool(a, { name: "Naughty" });
  const shed = await walkToSign(a, "🙈", /Skip class/);
  check((await shed.innerText()).includes("might get caught"), "the sign warns you might get caught");
  await shed.click();
  const outcome = a.getByText(/Got away with it|Campus security found you/).first();
  check(await outcome.waitFor({ timeout: 30_000 }).then(() => true, () => false), "skipping class ends in getting away with it or getting caught");
  const caught = /security/i.test(await outcome.innerText().catch(() => ""));
  if (caught) check((await a.getByText("🚨 Detention").count()) > 0, "getting caught shows detention");
});
