// Turn the browser test results into a job summary: bun scripts/e2e-summary.ts [results.json]
// Reads Playwright's JSON report (on CI, playwright.config.ts writes it to
// playwright-report/results.json) and appends a headline, a table per spec file
// and the failing and flaky tests to $GITHUB_STEP_SUMMARY. Without that
// variable it prints the summary, so it can be tried locally.
import { appendFileSync, existsSync, readFileSync } from "node:fs";

type Result = { status: string; duration: number; error?: { message?: string } };
type Test = { projectName: string; status: string; results: Result[] };
type Spec = { title: string; line: number; tests: Test[] };
type Suite = { title: string; file: string; specs?: Spec[]; suites?: Suite[] };
type Report = {
  stats: { duration: number; expected: number; unexpected: number; flaky: number; skipped: number };
  suites: Suite[];
};

const file = process.argv[2] ?? "playwright-report/results.json";
if (!existsSync(file)) {
  console.error(`No test results at ${file}: the tests did not get to run.`);
  process.exit(0);
}
const report: Report = JSON.parse(readFileSync(file, "utf8"));

// Every test with the spec file it is in and its describe titles.
type Row = { file: string; title: string; project: string; status: string; ms: number; error: string };
const rows: Row[] = [];
function walk(suite: Suite, path: string[], top: string) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests) {
      const last = test.results.at(-1);
      rows.push({
        file: top,
        title: [...path, spec.title].join(" › "),
        project: test.projectName,
        status: test.status,
        ms: test.results.reduce((n, r) => n + r.duration, 0),
        error: (last?.error?.message ?? "").replace(/\x1b\[[0-9;]*m/g, "").split("\n")[0],
      });
    }
  for (const child of suite.suites ?? []) walk(child, [...path, child.title], top);
}
for (const suite of report.suites) walk(suite, [], suite.file ?? suite.title);

// Test titles hold markup such as <html lang>; show it as text.
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "\\|");

const time = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};
const name = (p: string) => (p ? p[0].toUpperCase() + p.slice(1) : "Browser");
const projects = [...new Set(rows.map((r) => r.project))];
const { expected, unexpected, flaky, skipped, duration } = report.stats;

const lines: string[] = [];
lines.push(`### ${unexpected ? "❌" : "✅"} Browser tests: ${projects.map(name).join(", ")}`, "");
lines.push(
  [
    `**${expected}** passed`,
    `**${unexpected}** failed`,
    flaky ? `**${flaky}** flaky` : "",
    skipped ? `**${skipped}** skipped` : "",
    `⏱ ${time(duration)}`,
  ]
    .filter(Boolean)
    .join(" · "),
  "",
);

// One row per spec file, slowest first.
const files = new Map<string, Row[]>();
for (const r of rows) files.set(r.file, [...(files.get(r.file) ?? []), r]);
const count = (list: Row[], status: string) => list.filter((r) => r.status === status).length;
lines.push("| | Spec | Passed | Failed | Flaky | Time |", "|---|---|---:|---:|---:|---:|");
for (const [spec, list] of [...files].sort(
  (a, b) => b[1].reduce((n, r) => n + r.ms, 0) - a[1].reduce((n, r) => n + r.ms, 0),
)) {
  const failed = count(list, "unexpected");
  const shaky = count(list, "flaky");
  const mark = failed ? "❌" : shaky ? "⚠️" : "✅";
  lines.push(
    `| ${mark} | \`${spec}\` | ${count(list, "expected")} | ${failed || ""} | ${shaky || ""} | ${time(list.reduce((n, r) => n + r.ms, 0))} |`,
  );
}

const listOf = (status: string, heading: string, open: boolean) => {
  const hits = rows.filter((r) => r.status === status);
  if (!hits.length) return;
  lines.push("", `<details${open ? " open" : ""}><summary><b>${heading} (${hits.length})</b></summary>`, "");
  for (const r of hits)
    lines.push(`- \`${r.file}\` ${esc(r.title)}${r.error ? `<br><sub>${esc(r.error)}</sub>` : ""}`);
  lines.push("", "</details>");
};
listOf("unexpected", "❌ Failed", true);
listOf("flaky", "⚠️ Flaky: failed, then passed on a retry", false);

const slow = [...rows].sort((a, b) => b.ms - a.ms).slice(0, 5);
lines.push("", "<details><summary><b>🐢 Slowest tests</b></summary>", "");
for (const r of slow) lines.push(`- ${time(r.ms)}: \`${r.file}\` ${esc(r.title)}`);
lines.push("", "</details>", "");

const text = lines.join("\n");
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, `${text}\n`);
else console.log(text);
