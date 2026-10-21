// Vercel's clean-URL handling does not resolve a rewrite to a bracketed
// file name, so a direct visit to /mission/<id> 404s. Publish the dynamic
// route's HTML under a plain name that the rewrite in vercel.json targets.
import { copyFileSync, existsSync } from "node:fs";

const source = "dist/mission/[id].html";
if (!existsSync(source)) {
  console.error(`postbuild-web: ${source} not found`);
  process.exit(1);
}
copyFileSync(source, "dist/mission-shell.html");
console.log("postbuild-web: wrote dist/mission-shell.html");
