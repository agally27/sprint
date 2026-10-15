// Builds the Sprint API as a self-contained Vercel function using the
// Build Output API (v3): https://vercel.com/docs/build-output-api
//
// Why: Vercel's own TypeScript pass is stricter than ours (ESM + NodeNext
// resolution), and the @sprint/core workspace package is shipped as .ts
// source, which Node cannot load from node_modules at runtime. Bundling to one
// plain JS file removes both problems.
import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".vercel", "output");
const func = path.join(out, "functions", "api", "index.func");

await rm(out, { recursive: true, force: true });
await mkdir(func, { recursive: true });
await mkdir(path.join(out, "static"), { recursive: true });

await build({
  entryPoints: [path.join(root, "src", "vercel.ts")],
  outfile: path.join(func, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  // Some dependencies still call require(); give the ESM bundle a working one.
  banner: { js: "import { createRequire as __sprintCreateRequire } from 'node:module'; const require = __sprintCreateRequire(import.meta.url);" },
  logLevel: "info",
});

await writeFile(path.join(func, "package.json"), JSON.stringify({ type: "module" }));
await writeFile(path.join(func, ".vc-config.json"), JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false }, null, 2));
await writeFile(path.join(out, "config.json"), JSON.stringify({ version: 3, routes: [{ src: "^/api(?:/.*)?$", dest: "/api/index" }] }, null, 2));
console.log("Built Vercel output at", path.relative(process.cwd(), out));
