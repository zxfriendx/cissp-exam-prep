#!/usr/bin/env node
/**
 * `npm run test:browser`: start `next dev` on a free port, run the rendered
 * tests in e2e/ against it in headless Chrome, then stop the server.
 *
 * Env: PORT (default 3917), CHROME_PATH (default /usr/bin/google-chrome),
 * BASE_URL (skip starting a server and test that URL instead).
 * The dev server's log goes to .next-test-browser.log in the repo root.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tests = fs.readdirSync(path.join(root, "e2e")).filter((f) => f.endsWith(".e2e.mjs")).map((f) => path.join("e2e", f));

const portFree = (port) => new Promise((resolve) => {
  const s = net.createServer().once("error", () => resolve(false)).once("listening", () => s.close(() => resolve(true)));
  s.listen(port, "127.0.0.1");
});

async function waitFor(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`server did not answer ${url} within ${ms / 1000}s`);
}

let server;
function stop() {
  if (server && server.exitCode === null) {
    try { process.kill(-server.pid, "SIGTERM"); } catch { /* gone */ }
  }
}
process.on("SIGINT", () => { stop(); process.exit(130); });
process.on("SIGTERM", () => { stop(); process.exit(143); });

let baseUrl = process.env.BASE_URL;
let code = 1;
try {
  if (!baseUrl) {
    const port = Number(process.env.PORT || 3917);
    if (!(await portFree(port))) throw new Error(`port ${port} is in use; set PORT to a free one`);
    const logPath = path.join(root, ".next-test-browser.log");
    const log = fs.openSync(logPath, "w");
    server = spawn(path.join(root, "node_modules", ".bin", "next"), ["dev", "-p", String(port), "-H", "127.0.0.1"], {
      cwd: root, detached: true, stdio: ["ignore", log, log], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`next dev on ${baseUrl} (log: ${logPath})`);
    // The first request compiles the route, so warm the quiz page here.
    await waitFor(`${baseUrl}/quiz/domain_1/`, 180_000);
  }
  const run = spawn(process.execPath, ["--test", "--test-timeout=180000", ...tests], {
    cwd: root, stdio: "inherit", env: { ...process.env, BASE_URL: baseUrl },
  });
  code = await new Promise((r) => run.on("exit", (c) => r(c ?? 1)));
} catch (e) {
  console.error(e.message);
} finally {
  stop();
}
process.exit(code);
