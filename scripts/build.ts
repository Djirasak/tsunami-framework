// Build dist/: CSS and JS (plain and minified), the vendored scripts, then the version banner.
// Run with `bun run build`; the sass binary comes from node_modules/.bin.
import { $ } from "bun";

// Each step lists the files it writes; the tools run quietly and only
// their errors are shown.
const steps: [string[], () => Promise<unknown>][] = [
  [
    ["tsunami.css"],
    () => $`sass --no-source-map src/index.scss dist/tsunami.css`,
  ],
  [
    ["tsunami.min.css"],
    () =>
      $`sass --style=compressed --no-source-map src/index.scss dist/tsunami.min.css`,
  ],
  [
    ["tsunami.js"],
    () => $`bun build src/js/index.js --outfile dist/tsunami.js`,
  ],
  [
    ["tsunami.min.js"],
    () => $`bun build src/js/index.js --minify --outfile dist/tsunami.min.js`,
  ],
  [
    ["tinymce.min.js", "sortable.min.js", "vanilla-calendar.min.js"],
    () => $`bun scripts/build-vendor.ts`,
  ],
  [[], () => $`bun scripts/stamp-version.ts`],
];

const size = (file: string) => {
  const kb = Bun.file(`dist/${file}`).size / 1024;
  return kb >= 1000 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
};

for (const [files, run] of steps) {
  const start = performance.now();
  try {
    await run().quiet();
  } catch (error) {
    console.error(`${files.join(", ") || "build"} failed`);
    console.error(String(error.stderr ?? error));
    process.exit(1);
  }
  const ms = (performance.now() - start).toFixed(0);
  for (const file of files)
    console.log(`  dist/${file.padEnd(26)}${size(file).padStart(8)}  ${ms} ms`);
}
