// University: pick a course, see today's lecture, the "My studies" page, and that the Office
// Complex in town only hires graduates.
import { TIME, check, doActivity, newContext, newPage, run, shot, startSchool, walkToSign } from "../lib.mjs";

await run(async (browser) => {
  const ctx = await newContext(browser, { secondsIntoDay: TIME.lesson + 5, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const a = await newPage(ctx, "Fresher");
  await startSchool(a, { name: "Fresher", course: "Mass Communication" });
  check(await a.getByText(/Welcome to Mass Communication/).first().waitFor({ timeout: 5000 }).then(() => true, () => false), "picking a course welcomes you to it");

  // The period pill shows today's lecture for my course and level.
  check((await a.getByText(/MCM 101 · Introduction to Mass Communication/).count()) > 0, "the first lecture is MCM 101");
  const lecture = await walkToSign(a, "📝", /Attend lecture/);
  const done = await doActivity(a, lecture);
  check(/grades/.test(done), "attending a lecture gives grades", done);

  // My studies.
  await a.getByRole("button", { name: /My studies/ }).click();
  const sheet = a.getByRole("dialog", { name: "My studies" });
  check((await sheet.getByText("100 Level").count()) > 0 || (await sheet.getByText(/100 Level/).count()) > 0, "My studies shows 100 Level");
  check((await sheet.getByText(/0\/3/).count()) > 0, "no days passed yet at 100 Level");
  await shot(a, "uni-studies");
  await a.getByRole("button", { name: "Close" }).last().click();

  // The leaderboard has a university tab.
  await a.getByRole("button", { name: "Menu" }).click();
  await a.getByRole("button", { name: /Leaderboard/ }).click();
  await a.getByRole("tab", { name: /Uni/ }).click();
  check((await a.locator("ol li").first().innerText()).includes("MCM · 100L"), "the university leaderboard shows course and level");
  await a.getByRole("button", { name: "Close" }).last().click();

  // Graduate jobs aren't open to students.
  const bus = await walkToSign(a, "🚌", /Catch the bus to town/);
  await bus.click();
  await a.getByText(/Welcome to town/).waitFor({ timeout: 15_000 });
  const office = await walkToSign(a, "👔", /Go to work/);
  check(/graduates/i.test(await office.innerText()), "the Office Complex only hires graduates", (await office.innerText()).replace(/\s+/g, " "));
  await shot(a, "uni-office");
});
