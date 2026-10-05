// Chat to everyone and privately, a tic-tac-toe match between classmates, and Ayọ against the computer.
import { TIME, check, joinSchool, newContext, newPage, run, startSchool, walkToSign } from "../lib.mjs";

await run(async (browser) => {
  const ctx = await newContext(browser, { secondsIntoDay: TIME.break });
  const a = await newPage(ctx, "A");
  // Names can have accents, emoji and any alphabet.
  const code = await startSchool(a, { name: "Ámaka 🌟 Ọlá" });
  const table = await walkToSign(a, "🎲", /Play table games/);
  const b = await newPage(ctx, "B");
  await joinSchool(b, code, { name: "李雷 #1" });

  // A posts to everyone; rude words are hidden.
  await a.bringToFront();
  await a.getByRole("button", { name: /^Chat/ }).click();
  await a.getByRole("button", { name: /Everyone at school/ }).click();
  await a.getByRole("textbox", { name: "Message" }).fill("Hello school! Who wants to play? you idiot");
  await a.getByRole("button", { name: "Send" }).click();
  await a.getByRole("button", { name: "Close" }).last().click();

  await b.bringToFront();
  check(await b.getByRole("button", { name: /Chat, \d+ unread/ }).waitFor({ timeout: 30_000 }).then(() => true, () => false), "classmate gets an unread badge");
  await b.getByRole("button", { name: /^Chat/ }).click();
  await b.getByRole("button", { name: /Everyone at school/ }).click();
  const seen = (await b.locator("li").filter({ hasText: "Hello school" }).allInnerTexts()).join(" ");
  check(seen.includes("Hello school"), "message arrives in the school chat");
  check(!/idiot/i.test(seen), "rude word is hidden", seen.replace(/\s+/g, " "));
  await b.getByRole("button", { name: "← Chats" }).click();
  await b.getByRole("button", { name: /^Ámaka/ }).click();
  await b.getByRole("textbox", { name: "Message" }).fill("Private hi 👋");
  await b.keyboard.press("Enter");
  await b.getByRole("button", { name: "Close" }).last().click();

  await a.bringToFront();
  check(await a.getByRole("button", { name: /Chat, \d+ unread/ }).waitFor({ timeout: 30_000 }).then(() => true, () => false), "private message shows as unread");

  // Tic-tac-toe: A invites B and wins with a row along the top.
  // Each player is a tab here, and Chrome slows down background tabs; after 20 seconds without
  // news a classmate counts as gone. So switch between them often, like two real phones.
  await b.bringToFront();
  await b.waitForTimeout(1500);
  await a.bringToFront();
  await a.waitForTimeout(1500);
  await table.click();
  await a.getByRole("button", { name: "Invite" }).first().click();
  await b.bringToFront();
  await b.getByRole("button", { name: "Let's play" }).click({ timeout: 30_000 });
  const tap = async (p, n) => {
    await p.bringToFront();
    await p.getByRole("gridcell", { name: `Empty square ${n}` }).click();
    await p.waitForTimeout(600);
  };
  await tap(a, 1);
  await tap(b, 4);
  await tap(a, 2);
  await tap(b, 5);
  await tap(a, 3);
  await a.bringToFront();
  await a.waitForTimeout(600);
  const status = (p) => p.getByRole("status").filter({ hasText: /won|turn|draw/ }).first().innerText();
  check(/won/i.test(await status(a)), "the winner sees they won", await status(a));
  check(/won/i.test(await status(b)), "the other player sees who won", await status(b));

  // Ayọ against the computer: a few moves.
  await a.getByRole("button", { name: "Choose another game" }).click();
  await a.getByRole("radio", { name: /Ayọ/ }).click();
  await a.getByRole("button", { name: /The computer/ }).click();
  let sown = 0;
  for (let i = 0; i < 3; i++) {
    // Wait for the computer to finish its turn.
    const pit = a.getByRole("button", { name: /tap to sow/ }).first();
    if (!(await pit.waitFor({ timeout: 8000 }).then(() => true, () => false))) break;
    await pit.click();
    sown++;
    await a.waitForTimeout(500);
  }
  check(sown >= 2, "Ayọ can be played against the computer", `${sown} moves`);
});
