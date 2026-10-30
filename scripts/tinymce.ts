// Vendor a TinyMCE release (npm tarball, unpacked) into vendor/tinymce.
// Usage: bun scripts/tinymce.ts <unpacked-package-dir> <version>
// Keeps only the files the editor needs: core, DOM model, silver theme, default
// icons, the plugins listed below and the oxide skins (light and dark). The
// skin .js files register their CSS with tinymce.Resource, so the build can
// join everything into one dist/tinymce.min.js (scripts/bundle-tinymce.ts).
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";

const [dir, version] = process.argv.slice(2);
if (!dir || !version)
  throw new Error("usage: bun scripts/tinymce.ts <package-dir> <version>");

const root = new URL("..", import.meta.url).pathname;
const out = `${root}vendor/tinymce`;
const plugins = [
  "autoresize",
  "code",
  "fullscreen",
  "image",
  "link",
  "lists",
  "media",
];
const keep = [
  "tinymce.min.js",
  "models/dom/model.min.js",
  "themes/silver/theme.min.js",
  "icons/default/icons.min.js",
  ...plugins.map((p) => `plugins/${p}/plugin.min.js`),
  ...["oxide", "oxide-dark"].flatMap((s) => [
    `skins/ui/${s}/skin.js`,
    `skins/ui/${s}/content.js`,
  ]),
  "skins/content/default/content.js",
  "skins/content/dark/content.js",
];

// Start clean but keep SOURCE.txt, which is written by hand.
for (const name of existsSync(out) ? readdirSync(out) : [])
  if (name !== "SOURCE.txt")
    rmSync(`${out}/${name}`, { recursive: true, force: true });
for (const file of keep) {
  if (!existsSync(`${dir}/${file}`)) throw new Error(`missing ${file}`);
  mkdirSync(`${out}/${file.split("/").slice(0, -1).join("/")}`, {
    recursive: true,
  });
  cpSync(`${dir}/${file}`, `${out}/${file}`);
}
cpSync(`${dir}/license.md`, `${out}/LICENSE.md`);
cpSync(`${dir}/notices.txt`, `${out}/NOTICES.txt`);
console.log(`${keep.length} files from TinyMCE ${version}`);
