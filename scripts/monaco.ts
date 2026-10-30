// Vendor a Monaco Editor release (npm tarball, unpacked) into vendor/monaco.
// Usage: bun scripts/monaco.ts <unpacked-package-dir> <version>
// Copies min/vs (the AMD build: loader.js, editor/editor.main.js and .css, the
// hashed chunks and the workers) and drops what the code editor never loads:
//   - the languages other than css, scss, html, javascript (and typescript,
//     which the javascript colouring imports); json comes with the core;
//   - the TypeScript/JavaScript language service worker (7 MB). Colouring does
//     not need it; js/code-editor.js turns the service off;
//   - the translations, and the unhashed language/ and editor/editor.worker.js
//     entry points the hashed build does not use.
// Needs nothing but the folder: the loader finds its siblings by itself.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";

const [dir, version] = process.argv.slice(2);
if (!dir || !version)
  throw new Error("usage: bun scripts/monaco.ts <package-dir> <version>");

const root = new URL("..", import.meta.url).pathname;
const out = `${root}vendor/monaco`;
const src = `${dir}/min/vs`;
const languages = ["css", "scss", "html", "javascript", "typescript"];

// Every language chunk, taken from the loader map of the basic languages:
// ["../abap-D-t0cyap"] -> abap-D-t0cyap.js
const map = await Bun.file(
  `${src}/basic-languages/monaco.contribution.js`,
).text();
const chunks = [...map.matchAll(/\["\.\.\/([^"]+)"\]/g)].map((m) => m[1]);
if (chunks.length < 50) throw new Error("language map not found");
const name = (chunk: string) => chunk.replace(/-[\w-]{8}$/, "");
const drop = new Set(
  chunks.filter((c) => !languages.includes(name(c))).map((c) => `${c}.js`),
);
for (const l of languages)
  if (!chunks.some((c) => name(c) === l)) throw new Error(`missing ${l}`);

const skip = (rel: string) =>
  drop.has(rel) ||
  rel.startsWith("nls/lang/") ||
  rel.startsWith("language/") ||
  rel === "editor/editor.worker.js" ||
  /^assets\/ts\.worker-/.test(rel) ||
  rel.endsWith(".d.ts");

// Start clean but keep SOURCE.txt, which is written by hand.
for (const entry of existsSync(out) ? readdirSync(out) : [])
  if (entry !== "SOURCE.txt")
    rmSync(`${out}/${entry}`, { recursive: true, force: true });
let count = 0;
for (const rel of readdirSync(src, { recursive: true }) as string[]) {
  if (!Bun.file(`${src}/${rel}`).size || skip(rel)) continue;
  if (!/\.(js|css|ttf)$/.test(rel)) continue;
  mkdirSync(`${out}/vs/${rel.split("/").slice(0, -1).join("/")}`, {
    recursive: true,
  });
  cpSync(`${src}/${rel}`, `${out}/vs/${rel}`);
  count++;
}
cpSync(`${dir}/LICENSE`, `${out}/LICENSE.txt`);
cpSync(`${dir}/ThirdPartyNotices.txt`, `${out}/ThirdPartyNotices.txt`);
console.log(`${count} files from Monaco ${version}`);
