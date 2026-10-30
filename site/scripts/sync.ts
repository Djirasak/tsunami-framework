// Copy the framework's built files into public/, so the docs load the same
// /dist, /fonts and /flags paths as before. The copies are not committed.
// `bun scripts/sync.ts --build` runs the root build first (predev and
// prebuild use it); without the flag dist/ must already exist.
import { $ } from "bun";
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const site = resolve(import.meta.dir, "..");
const root = resolve(site, "..");

// dist/ is committed and only the Release workflow changes it, so a build for
// the docs must not leave it modified: when it was clean, put it back after
// the copy (public/dist keeps the fresh build).
const tidy = process.argv.includes("--build")
  ? !(await $`git status --porcelain dist`.cwd(root).text()).trim()
  : false;
if (process.argv.includes("--build")) await $`bun run build`.cwd(root);

if (!existsSync(`${root}/dist/tsunami.min.css`)) {
  console.error("dist/ is missing: run `bun run build` in the repo root first.");
  process.exit(1);
}

await mkdir(`${site}/public`, { recursive: true });
for (const dir of ["dist", "fonts", "flags"]) {
  await rm(`${site}/public/${dir}`, { recursive: true, force: true });
  await cp(`${root}/${dir}`, `${site}/public/${dir}`, { recursive: true });
}
if (tidy) {
  await $`git checkout -- dist`.cwd(root).quiet();
  await $`git clean -fdq dist`.cwd(root).quiet();
}
console.log("synced dist, fonts, flags into site/public");
