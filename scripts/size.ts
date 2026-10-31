// Report the size of the files a page loads: bun run size
// Raw, gzip and brotli bytes of dist/tsunami.min.js and dist/tsunami.min.css,
// against the gzip budget in size-budget.json. Exits 1 when a file is over its
// budget, so a change that grows the bundle is noticed. Run `bun run build` first.
// On GitHub Actions the table also goes to the job summary.
import { appendFileSync } from "node:fs";
import { brotliCompressSync, gzipSync } from "node:zlib";

const budget: Record<string, number> = await Bun.file("size-budget.json").json();
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

const rows: string[][] = [];
let over = 0;
for (const [name, limit] of Object.entries(budget)) {
  const file = Bun.file(`dist/${name}`);
  if (!(await file.exists())) {
    console.error(`dist/${name} is missing: run bun run build first`);
    process.exit(2);
  }
  const raw = new Uint8Array(await file.arrayBuffer());
  const gzip = gzipSync(raw, { level: 9 }).length;
  const brotli = brotliCompressSync(raw).length;
  const used = Math.round((gzip / limit) * 100);
  if (gzip > limit) over++;
  rows.push([name, kb(raw.length), kb(gzip), kb(brotli), `${kb(limit)} (${used}%)`, gzip > limit ? "over" : "ok"]);
}

const head = ["File", "Raw", "Gzip", "Brotli", "Gzip budget", ""];
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (r: string[]) => "  " + r.map((c, i) => c.padEnd(widths[i])).join("  ");
console.log("\n" + line(head) + "\n" + rows.map(line).join("\n") + "\n");

const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary)
  appendFileSync(
    summary,
    `### Bundle size\n\n| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`,
  );

if (over) {
  console.error(`✗ ${over} file(s) over the budget. Shrink them, or raise size-budget.json on purpose.`);
  process.exit(1);
}
console.log("✓ within budget");
