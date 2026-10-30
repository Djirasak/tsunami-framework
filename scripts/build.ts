// Build dist/: CSS and JS (plain and minified), the vendored scripts, then the version banner.
// Run with `bun run build`; the sass binary comes from node_modules/.bin.
import { $ } from "bun";

const steps: [string, () => Promise<unknown>][] = [
  ["css", () => $`sass --no-source-map src/index.scss dist/tsunami.css`],
  [
    "css (min)",
    () =>
      $`sass --style=compressed --no-source-map src/index.scss dist/tsunami.min.css`,
  ],
  ["js", () => $`bun build src/js/index.js --outfile dist/tsunami.js`],
  [
    "js (min)",
    () => $`bun build src/js/index.js --minify --outfile dist/tsunami.min.js`,
  ],
  ["vendor", () => $`bun scripts/build-vendor.ts`],
  ["version", () => $`bun scripts/stamp-version.ts`],
];

for (const [name, run] of steps) {
  console.log(`\n> ${name}`);
  await run();
}
