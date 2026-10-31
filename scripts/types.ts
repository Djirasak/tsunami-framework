// Join types/index.d.ts and types/parts/*.d.ts into dist/tsunami.d.ts, one file
// for the package's "types". The /// <reference> lines are dropped: the parts
// are inlined after the index.
import { readdirSync } from "node:fs";

const dir = new URL("../types/", import.meta.url);
const read = (file: URL) => Bun.file(file).text();

const index = (await read(new URL("index.d.ts", dir))).replace(
  /^\/\/\/ <reference [^\n]*\n/gm,
  "",
);
const parts = readdirSync(new URL("parts/", dir))
  .filter((name) => name.endsWith(".d.ts"))
  .sort();
const bodies = await Promise.all(
  parts.map((name) => read(new URL(`parts/${name}`, dir))),
);

await Bun.write(
  new URL("../dist/tsunami.d.ts", import.meta.url),
  [index, ...bodies].join("\n"),
);
