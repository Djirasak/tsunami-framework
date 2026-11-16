// One summary for a whole CI run: bun scripts/ci-summary.ts [reports-dir]
// The jobs leave small JSON reports (size.json from the check job, e2e-<browser>.json
// from Playwright, a11y.json from the accessibility scan); the last job gathers
// them here and writes one table to $GITHUB_STEP_SUMMARY. CHECK, E2E and A11Y hold
// the job results (success, failure, skipped, cancelled), for the jobs that left
// no report. Without GITHUB_STEP_SUMMARY it prints the summary. It always exits 0:
// a failing job already marks the run.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "reports";
const read = <T>(name: string): T | null => {
  const file = join(dir, name);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
};

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "\\|");
const time = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const mark = (ok: boolean | null) => (ok === null ? "⚪" : ok ? "✅" : "❌");
// A job result from the env, for a row that has no report.
const job = (result = "") =>
  ({
    success: { ok: true, text: "passed" },
    failure: { ok: false, text: "failed" },
    cancelled: { ok: null, text: "cancelled" },
    skipped: { ok: null, text: "skipped" },
  })[result] ?? { ok: null, text: "no report" };

type Row = { ok: boolean | null; name: string; result: string; time: string };
const rows: Row[] = [];

// The fast checks: one row from the job result, then the bundle sizes.
const check = job(process.env.CHECK);
rows.push({ ok: check.ok, name: "Lint, unit tests, docs, types, build, audit", result: check.text, time: "" });
const size = read<{ name: string; gzip: number; limit: number }[]>("size.json");
if (size)
  rows.push({
    ok: size.every((f) => f.gzip <= f.limit),
    name: "Bundle size (gzip)",
    result: size
      .map((f) => `${f.name.replace("tsunami.min.", "").toUpperCase()} ${kb(f.gzip)} of ${kb(f.limit)} (${Math.round((f.gzip / f.limit) * 100)}%)`)
      .join(" · "),
    time: "",
  });

// The browser tests, one row per browser, from Playwright's JSON report.
type Result = { duration: number; error?: { message?: string } };
type Test = { status: string; results: Result[] };
type Spec = { title: string; tests: Test[] };
type Suite = { title: string; file?: string; specs?: Spec[]; suites?: Suite[] };
type Report = {
  stats: { duration: number; expected: number; unexpected: number; flaky: number; skipped: number };
  suites: Suite[];
};
type Hit = { browser: string; file: string; title: string; status: string; ms: number; error: string };

const browsers = ["chromium", "firefox", "webkit"];
const name = (b: string) => ({ chromium: "Chromium", firefox: "Firefox", webkit: "WebKit" })[b] ?? b;
const hits: Hit[] = [];
const e2e = job(process.env.E2E);
for (const browser of browsers) {
  const report = read<Report>(`e2e-${browser}.json`);
  if (!report) {
    // The matrix shares one result: without a report this browser never got to its tests.
    rows.push({ ok: e2e.ok === null ? null : false, name: name(browser), result: e2e.ok === null ? e2e.text : "no report", time: "" });
    continue;
  }
  const walk = (suite: Suite, path: string[], file: string) => {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests)
        hits.push({
          browser,
          file,
          title: [...path, spec.title].join(" › "),
          status: test.status,
          ms: test.results.reduce((n, r) => n + r.duration, 0),
          error: (test.results.at(-1)?.error?.message ?? "").replace(/\x1b\[[0-9;]*m/g, "").split("\n")[0],
        });
    for (const child of suite.suites ?? []) walk(child, [...path, child.title], file);
  };
  for (const suite of report.suites) walk(suite, [], suite.file ?? suite.title);
  const { expected, unexpected, flaky, skipped, duration } = report.stats;
  rows.push({
    ok: unexpected === 0,
    name: name(browser),
    result: [
      `${expected} passed`,
      unexpected ? `**${unexpected} failed**` : "",
      flaky ? `${flaky} flaky` : "",
      skipped ? `${skipped} skipped` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    time: time(duration),
  });
}

// The accessibility scan.
type A11y = {
  pages: number;
  views: number;
  total: number;
  ms: number;
  rules: { id: string; impact: string; help: string; count: number; pages: string[] }[];
};
const a11y = read<A11y>("a11y.json");
if (a11y)
  rows.push({
    ok: a11y.total === 0,
    name: "Accessibility",
    result: `${a11y.pages} pages × ${a11y.views} views · ${a11y.total ? `**${a11y.total} problems**` : "no serious problems"}`,
    time: time(a11y.ms),
  });
else {
  const r = job(process.env.A11Y);
  rows.push({ ok: r.ok === null ? null : false, name: "Accessibility", result: r.ok === null ? r.text : "no report", time: "" });
}

// ---- Write it ----
const failed = rows.filter((r) => r.ok === false).length;
const lines = [
  failed ? `## ❌ ${failed} of ${rows.length} checks failed` : `## ✅ All ${rows.length} checks passed`,
  "",
  "| | Check | Result | Time |",
  "|:-:|---|---|--:|",
  ...rows.map((r) => `| ${mark(r.ok)} | ${r.name} | ${r.result} | ${r.time} |`),
];

const failing = hits.filter((h) => h.status === "unexpected");
if (failing.length) {
  lines.push("", "### Failed tests", "");
  for (const h of failing)
    lines.push(`- **${name(h.browser)}** \`${h.file}\` ${esc(h.title)}${h.error ? `<br><sub>${esc(h.error)}</sub>` : ""}`);
}
if (a11y?.rules.length) {
  lines.push("", "### Accessibility problems", "", "| Impact | Rule | Count | Pages |", "|---|---|--:|---|");
  for (const r of a11y.rules)
    lines.push(
      `| ${r.impact} | \`${r.id}\` ${esc(r.help)} | ${r.count} | ${r.pages.slice(0, 3).map((p) => `\`${p}\``).join(", ")}${r.pages.length > 3 ? ` +${r.pages.length - 3}` : ""} |`,
    );
}
const shaky = hits.filter((h) => h.status === "flaky");
if (shaky.length) {
  lines.push("", `<details><summary>⚠️ Flaky: failed, then passed on a retry (${shaky.length})</summary>`, "");
  for (const h of shaky) lines.push(`- **${name(h.browser)}** \`${h.file}\` ${esc(h.title)}`);
  lines.push("", "</details>");
}

// Time per spec file, a column per browser.
const seen = browsers.filter((b) => hits.some((h) => h.browser === b));
if (seen.length) {
  const files = [...new Set(hits.map((h) => h.file))];
  const spent = (file: string, b: string) =>
    hits.filter((h) => h.file === file && h.browser === b).reduce((n, h) => n + h.ms, 0);
  files.sort((a, b) => seen.reduce((n, x) => n + spent(b, x), 0) - seen.reduce((n, x) => n + spent(a, x), 0));
  lines.push(
    "",
    "<details><summary>Time per spec file</summary>",
    "",
    `| Spec | Tests | ${seen.map(name).join(" | ")} |`,
    `|---|--:|${seen.map(() => "--:").join("|")}|`,
    ...files.map(
      (f) =>
        `| \`${f}\` | ${hits.filter((h) => h.file === f && h.browser === seen[0]).length} | ${seen.map((b) => time(spent(f, b))).join(" | ")} |`,
    ),
    "",
    "</details>",
  );
}

const text = `${lines.join("\n")}\n`;
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, text);
else console.log(text);
