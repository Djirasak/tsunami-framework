// Check the docs and the example pages for accessibility problems with axe-core,
// in light and dark: bun run check:a11y
// It needs the docs running (bun run docs) and Chromium (bunx playwright install
// chromium); set CHROMIUM_PATH to use a browser you already have.
//   --url=<origin>   where the docs run (default http://localhost:5477)
//   --page=<text>    only pages whose path contains the text (end it with $ to match one page exactly, like --page=/$)
//   --all            also report moderate and minor problems (default: serious
//                    and critical only, which fail the check)
// axe skips what Tsunami does not own or cannot get wrong: Monaco and TinyMCE draw
// their own UI, and a disabled control is exempt from contrast.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const origin = (arg("url") ?? "http://localhost:5477").replace(/\/$/, "");
const only = arg("page");
const all = process.argv.includes("--all");
const FAILS = all
  ? new Set(["critical", "serious", "moderate", "minor"])
  : new Set(["critical", "serious"]);
const SKIP = [
  ".monaco-editor",
  ".tox-tinymce",
  ".tox-tinymce-aux",
  ".dropzone:has(input:disabled)",
];

const root = join(import.meta.dir, "..");
const content = join(root, "site", "content");
const read = (f: string) => JSON.parse(readFileSync(join(content, f), "utf8"));
const paths = [
  "/",
  ...Object.keys(read("pages.json")).map((s) =>
    s === "index" ? "/docs" : `/docs/${s}`,
  ),
  ...Object.keys(read("examples.json")).map((s) => `/examples/${s}`),
].filter(
  (p) =>
    !only || (only.endsWith("$") ? p === only.slice(0, -1) : p.includes(only)),
);

const axe = readFileSync(
  join(root, "node_modules", "axe-core", "axe.min.js"),
  "utf8",
);

type Hit = { scheme: string; path: string; target: string; html: string };
const found = new Map<string, { impact: string; help: string; hits: Hit[] }>();

try {
  await fetch(origin, { method: "HEAD" });
} catch {
  console.error(`Nothing answers at ${origin}. Start the docs: bun run docs`);
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
for (const scheme of ["light", "dark"] as const) {
  const page = await (
    await browser.newContext({
      colorScheme: scheme,
      viewport: { width: 1280, height: 900 },
    })
  ).newPage();
  for (const path of paths) {
    await page.goto(origin + path, { waitUntil: "load" });
    // Let the entrance animations finish, or axe reads half-faded colours.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      ),
    );
    await page.waitForTimeout(300);
    await page.evaluate(axe);
    const result = await page.evaluate(
      (skip) =>
        // @ts-expect-error axe is injected into the page
        axe.run({ exclude: skip.map((s: string) => [s]) }, {
          resultTypes: ["violations"],
        }),
      SKIP,
    );
    for (const v of result.violations) {
      if (!FAILS.has(v.impact ?? "")) continue;
      const entry = found.get(v.id) ?? {
        impact: v.impact,
        help: v.help,
        hits: [],
      };
      for (const n of v.nodes)
        entry.hits.push({
          scheme,
          path,
          target: n.target.join(" "),
          html: n.html.replace(/\s+/g, " ").slice(0, 120),
        });
      found.set(v.id, entry);
    }
  }
}
await browser.close();

let total = 0;
for (const [id, { impact, help, hits }] of found) {
  total += hits.length;
  console.log(`\n${impact} ${id}: ${help} (${hits.length})`);
  const seen = new Set<string>();
  for (const h of hits) {
    const key = h.path + h.target;
    if (seen.has(key)) continue;
    seen.add(key);
    if (seen.size > 5) {
      console.log("  ...");
      break;
    }
    console.log(`  ${h.path} [${h.scheme}] ${h.target}\n    ${h.html}`);
  }
}
console.log(
  total
    ? `\n✗ ${total} problems on ${paths.length} pages`
    : `\n✓ ${paths.length} pages, light and dark: no ${all ? "" : "serious or critical "}problems`,
);
process.exit(total ? 1 : 0);
