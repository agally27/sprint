// Serves the built Vercel function through a plain Node HTTP server (the way
// Vercel's launcher calls it) and checks the key routes. Run after build:vercel.
import http from "node:http";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, ".vercel", "output", "functions", "api", "index.func", "index.mjs");
const { default: handler } = await import(pathToFileURL(file).href);

const server = http.createServer((req, res) => handler(req, res));
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const failures = [];
async function check(label, pathname, init, expectStatus, expectBody) {
  const res = await fetch(base + pathname, init);
  const text = await res.text();
  const ok = res.status === expectStatus && (!expectBody || text.includes(expectBody));
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: ${res.status}`);
  if (!ok) failures.push(`${label}: expected ${expectStatus}${expectBody ? ` containing "${expectBody}"` : ""}, got ${res.status} ${text.slice(0, 120)}`);
}
const json = { "content-type": "application/json" };

await check("health", "/api/health", undefined, 200, '"ok":true');
await check("plan", "/api/plan", { method: "POST", headers: json, body: JSON.stringify({ goalText: "Launch my website by Christmas", now: Date.now() }) }, 200, "Launch My Website");
await check("bad input", "/api/plan", { method: "POST", headers: json, body: "{" }, 400);
await check("voice without a key", "/api/tts", { method: "POST", headers: json, body: JSON.stringify({ text: "Go." }) }, 503);
await check("unknown route", "/api/nope", undefined, 404);

server.close();
if (failures.length) {
  console.error("\n" + failures.join("\n"));
  process.exit(1);
}
