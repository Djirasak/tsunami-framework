// Build the vendored scripts into dist/.
// TinyMCE: join the vendored files into one script, dist/tinymce.min.js.
// Core first, then icons, model, theme, plugins and skins, which register
// themselves with the core, so the editor never loads anything else.
import { mkdirSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const vendor = `${root}vendor/tinymce`;
const files = [...new Bun.Glob("**/*.js").scanSync(vendor)].sort(
  (a, b) => rank(a) - rank(b) || a.localeCompare(b),
);

function rank(file: string) {
  if (file === "tinymce.min.js") return 0;
  if (file.startsWith("icons/")) return 1;
  if (file.startsWith("models/")) return 2;
  if (file.startsWith("themes/")) return 3;
  if (file.startsWith("plugins/")) return 4;
  return 5;
}

const version =
  (await Bun.file(`${vendor}/SOURCE.txt`).text()).match(
    /TinyMCE ([\d.]+)/,
  )?.[1] ?? "?";
let out = `/* TinyMCE ${version} bundle (core, silver theme, DOM model, icons, plugins, oxide skins). GPL-2.0-or-later or the Tiny Self-Hosted License: see vendor/tinymce/LICENSE.md. */\n`;
for (const file of files)
  out += `${await Bun.file(`${vendor}/${file}`).text()}\n;\n`;

mkdirSync(`${root}dist`, { recursive: true });
await Bun.write(`${root}dist/tinymce.min.js`, out);
console.log(
  `dist/tinymce.min.js: ${files.length} files, ${(out.length / 1024).toFixed(0)} KB`,
);

// SortableJS ships as one minified file: copied as dist/sortable.min.js.
await Bun.write(
  `${root}dist/sortable.min.js`,
  Bun.file(`${root}vendor/sortable/Sortable.min.js`),
);
console.log("dist/sortable.min.js");
