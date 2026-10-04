/**
 * Runs the browser tests one after another and prints a summary.
 *
 *   npm run build && npm run e2e            all tests
 *   npm run e2e -- life-town battle         only tests whose names contain these words
 *
 * If nothing is answering at E2E_BASE_URL (default http://localhost:3100), this starts the built
 * site with `next start` for the run and stops it afterwards.
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const base = (process.env.E2E_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const filters = process.argv.slice(2);
const specs = readdirSync(join(here, "specs"))
  .filter((f) => f.endsWith(".mjs"))
  .filter((f) => filters.length === 0 || filters.some((w) => f.includes(w)))
  .sort();

const up = () =>
  fetch(base).then(
    (r) => r.ok,
    () => false,
  );

let server = null;
if (!(await up())) {
  const port = new URL(base).port || "3100";
  console.log(`Starting the site on port ${port} (run "npm run build" first if it isn't built)…`);
  server = spawn("npx", ["next", "start", "-p", port], { cwd: join(here, ".."), stdio: "ignore", detached: true });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await up())) {
    console.error(`The site didn't start at ${base}.`);
    process.kill(-server.pid);
    process.exit(1);
  }
}

function runSpec(spec) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, "specs", spec)], { stdio: "inherit", env: { ...process.env, E2E_BASE_URL: base } });
    // A test that hangs counts as a failure.
    const timer = setTimeout(() => child.kill("SIGKILL"), 8 * 60_000);
    child.on("exit", (c) => {
      clearTimeout(timer);
      resolve(c ?? 1);
    });
  });
}

// Two or three game tabs at once can starve a small test machine, so a failed test gets one more
// try. The summary says when that happened, so a flaky test doesn't go unnoticed.
const results = [];
for (const spec of specs) {
  const started = Date.now();
  console.log(`\n▶ ${spec}`);
  let ok = (await runSpec(spec)) === 0;
  let retried = false;
  if (!ok) {
    console.log(`\n↻ ${spec} failed; trying once more`);
    retried = true;
    ok = (await runSpec(spec)) === 0;
  }
  results.push({ spec, ok, retried, seconds: Math.round((Date.now() - started) / 1000) });
}

if (server) process.kill(-server.pid);

console.log("\nSummary");
for (const r of results) console.log(`  ${r.ok ? "✓" : "✗"} ${r.spec} (${r.seconds}s)${r.ok && r.retried ? " — passed on the second try" : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} of ${results.length} failed. Screenshots are in e2e/.out` : `\nAll ${results.length} passed.`);
process.exit(failed ? 1 : 0);
