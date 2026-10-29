// Prepend "/* tsunami vX.Y.Z */" to built dist files (idempotent).
import pkg from "../package.json";

const banner = `/* tsunami v${pkg.version} */\n`;

for (const name of ["tsunami.min.css", "tsunami.min.js"]) {
  const file = Bun.file(new URL(`../dist/${name}`, import.meta.url));
  if (!(await file.exists())) continue;
  const text = await file.text();
  // Keep a leading BOM first so the stylesheet still parses.
  const bom = text.startsWith("﻿") ? "﻿" : "";
  const body = text.slice(bom.length).replace(/^\/\* tsunami v[^*]*\*\/\n/, "");
  await Bun.write(file, bom + banner + body);
}
