#!/usr/bin/env node
// Creates the labels and issues defined in ./issues.mjs with the gh CLI.
//
//   node scripts/backlog/create-issues.mjs            # dry run: prints the plan
//   node scripts/backlog/create-issues.mjs --apply    # creates labels and issues
//   node scripts/backlog/create-issues.mjs --repo owner/name [--apply]
//
// Idempotent: a label that already exists is left alone, and an issue whose
// exact title already exists (open or closed) is skipped. Uses the REST API
// through `gh api`, so it needs `gh auth login` with repo scope.
import { execFileSync } from "node:child_process";
import { issues, labels } from "./issues.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const repo = args.includes("--repo") ? args[args.indexOf("--repo") + 1] : detectRepo();

function gh(ghArgs, input) {
  return execFileSync("gh", ghArgs, { encoding: "utf8", input, stdio: ["pipe", "pipe", "inherit"] });
}

function detectRepo() {
  const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!m) throw new Error(`Cannot infer the repository from "${url}"; pass --repo owner/name`);
  return m[1];
}

function paginate(endpoint) {
  const out = [];
  for (let page = 1; ; page++) {
    const sep = endpoint.includes("?") ? "&" : "?";
    const batch = JSON.parse(gh(["api", `${endpoint}${sep}per_page=100&page=${page}`]));
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

const existingLabels = new Set(paginate(`repos/${repo}/labels`).map((l) => l.name));
const knownLabels = new Set([...existingLabels, ...labels.map((l) => l.name)]);
const existingTitles = new Set(paginate(`repos/${repo}/issues?state=all`).map((i) => i.title.trim()));

console.log(`${apply ? "Applying to" : "Dry run against"} ${repo}\n`);

console.log("Labels");
for (const label of labels) {
  if (existingLabels.has(label.name)) {
    console.log(`  exists   ${label.name}`);
    continue;
  }
  console.log(`  ${apply ? "create " : "would   "} ${label.name}`);
  if (apply) {
    gh(["api", "-X", "POST", `repos/${repo}/labels`, "--input", "-"], JSON.stringify(label));
    existingLabels.add(label.name);
  }
}

console.log("\nIssues");
let created = 0;
for (const issue of issues) {
  const missing = issue.labels.filter((l) => !knownLabels.has(l));
  if (missing.length) console.log(`  warning  "${issue.title}" references labels that do not exist: ${missing.join(", ")}`);
  if (existingTitles.has(issue.title.trim())) {
    console.log(`  exists   ${issue.title}`);
    continue;
  }
  console.log(`  ${apply ? "create " : "would   "} ${issue.title}  [${issue.labels.join(", ")}]`);
  if (apply) {
    const res = JSON.parse(
      gh(["api", "-X", "POST", `repos/${repo}/issues`, "--input", "-"], JSON.stringify({ title: issue.title, body: issue.body, labels: issue.labels.filter((l) => knownLabels.has(l)) })),
    );
    console.log(`           ${res.html_url}`);
    created++;
  }
}

console.log(apply ? `\nCreated ${created} issue(s).` : "\nDry run only. Re-run with --apply to create.");
