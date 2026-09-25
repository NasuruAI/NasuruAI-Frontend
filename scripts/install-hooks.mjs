/**
 * Point git at the versioned hooks in .githooks/. Run by npm's `prepare`
 * script, i.e. on every `npm install` and `npm ci`, so a fresh clone or fork
 * checks its commits without a setup step anyone has to remember.
 *
 * Does nothing outside a git checkout (a Docker build, a tarball), in CI, or
 * when the checkout already chose a hooks path of its own.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

if (process.env.CI || !existsSync(".git") || !existsSync(".githooks")) process.exit(0);

try {
  const current = execFileSync("git", ["config", "--get", "core.hooksPath"], {
    encoding: "utf8",
  }).trim();
  if (current) process.exit(0);
} catch {
  // Exit status 1: not set yet.
}
try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"]);
} catch {
  // Never fail an install over hook setup.
}
