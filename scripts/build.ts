// Build dist/: CSS and JS (plain and minified), the vendored scripts, then the version banner.
// Run with `bun run build`; the sass binary comes from node_modules/.bin.
// On a terminal a small wave runs while a step works; colours follow NO_COLOR.
import { $ } from "bun";
import pkg from "../package.json";

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
    [
      "tinymce.min.js",
      "sortable.min.js",
      "vanilla-calendar.min.js",
      "chart.min.js",
      "monaco/vs/loader.js",
    ],
    () => $`bun scripts/build-vendor.ts`,
  ],
  [[], () => $`bun scripts/stamp-version.ts`],
];

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) =>
  color ? `\x1b[${code}m${text}\x1b[0m` : text;
const [bold, dim, red, green, cyan] = [1, 2, 31, 32, 36].map(paint);

const WAVE = [..."▁▂▃▄▅▆▇█▇▆▅▄▃▂▁"];
const wave = (tick: number) =>
  [0, 1, 2, 3, 4].map((i) => WAVE[(tick + i * 2) % WAVE.length]).join("");

const size = (file: string) => {
  const kb = Bun.file(`dist/${file}`).size / 1024;
  return kb >= 1000 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
};

console.log(
  `\n  ${cyan("津波")} ${bold("tsunami")} ${dim(`v${pkg.version}`)}\n`,
);
const begin = performance.now();

const NAME = 29;
const line = (mark: string, text: string) =>
  process.stdout.write(
    `${color ? "\r" : ""}  ${mark}  ${text}${color ? "\x1b[K" : ""}\n`,
  );

for (const [files, run] of steps) {
  const label =
    files.length === 1
      ? `dist/${files[0]}`
      : files.length
        ? "vendored scripts"
        : "version banner";
  const start = performance.now();
  let tick = 0;
  const spin = color
    ? setInterval(
        () => process.stdout.write(`\r  ${cyan(wave(tick++))}  ${label}\x1b[K`),
        80,
      )
    : undefined;
  try {
    await run().quiet();
  } catch (error) {
    clearInterval(spin);
    line(red("✗"), `${label} failed`);
    console.error(String(error.stderr ?? error));
    process.exit(1);
  }
  clearInterval(spin);
  const ms = dim(`${(performance.now() - start).toFixed(0)} ms`);
  if (files.length === 1)
    line(
      green("✓"),
      `${label.padEnd(NAME)}${dim(size(files[0]).padStart(8))}  ${ms}`,
    );
  else {
    line(green("✓"), `${label.padEnd(NAME)}${" ".repeat(8)}  ${ms}`);
    for (const file of files)
      console.log(
        `     ${dim(`dist/${file}`.padEnd(NAME))}${dim(size(file).padStart(8))}`,
      );
  }
}

console.log(
  `\n  ${green("Done")} ${dim(`in ${((performance.now() - begin) / 1000).toFixed(1)} s`)}\n`,
);
