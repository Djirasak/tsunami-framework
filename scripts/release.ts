// Prepare a release: bun scripts/release.ts <version | patch | minor | major> [--dry]
// Sets the version in package.json, points the jsDelivr links in README.md at
// the new tag, turns "## [Unreleased]" in CHANGELOG.md into the new version,
// builds dist/, commits it all as "Release X.Y.Z" and prints the release notes
// (the changelog text for this version). It stops if the Unreleased section is empty. It does not push or tag; the "Release" workflow runs this and
// then tags, pushes and publishes (Actions > Release > Run workflow). Locally it
// is only for a preview: bun scripts/release.ts patch --dry.
// With --dry nothing is written; it only shows what would happen.
// With --notes=<file> the release notes are also written to that file.
import { $ } from "bun";
import { stamp, unreleased } from "./changelog";

const args = Bun.argv.slice(2);
const dry = args.includes("--dry");
const input = args.find((a) => !a.startsWith("--"));
const notesFile = args.find((a) => a.startsWith("--notes="))?.slice(8);

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) =>
  color ? `\x1b[${code}m${text}\x1b[0m` : text;
const [bold, dim, red, green] = [1, 2, 31, 32].map(paint);
const fail = (message: string): never => {
  console.error(`\n  ${red("✗")}  ${message}\n`);
  process.exit(1);
};

const pkgFile = Bun.file("package.json");
const pkg = await pkgFile.json();
const old: string = pkg.version;

function next(): string {
  if (!input) return fail("Say the version: bun scripts/release.ts 0.1.3 (or patch, minor, major)");
  const [major, minor, patch] = old.split(".").map(Number);
  if (input === "patch") return `${major}.${minor}.${patch + 1}`;
  if (input === "minor") return `${major}.${minor + 1}.0`;
  if (input === "major") return `${major + 1}.0.0`;
  if (!/^\d+\.\d+\.\d+$/.test(input))
    return fail(`"${input}" is not a version like 1.2.3`);
  return input;
}
const version = next();
if (version === old) fail(`package.json is already at ${old}`);

const git = async (...a: string[]) =>
  (await $`git ${a}`.quiet().text()).trim();
if (!dry) {
  if ((await git("branch", "--show-current")) !== "main")
    fail("Release from the main branch");
  if (await git("status", "--porcelain"))
    fail("The working tree has changes: commit or stash them first");
}
if ((await $`git tag -l v${version}`.quiet().text()).trim())
  fail(`The tag v${version} already exists`);

const changelog = Bun.file("CHANGELOG.md");
const changes = unreleased(await changelog.text());
if (!changes)
  fail('Nothing under "## [Unreleased]" in CHANGELOG.md: write what changed first');

console.log(`\n  ${bold("tsunami")} ${dim(old)} → ${green(version)}${dry ? dim("  (dry run)") : ""}\n`);

if (!dry) {
  await Bun.write(
    pkgFile,
    (await pkgFile.text()).replace(
      /("version": ")[^"]+(")/,
      `$1${version}$2`,
    ),
  );
  const readme = Bun.file("README.md");
  await Bun.write(
    readme,
    (await readme.text()).replaceAll(
      /(tsunami-framework@v)\d+\.\d+\.\d+/g,
      `$1${version}`,
    ),
  );
  console.log(`  ${green("✓")}  package.json and the README links`);
  const lastTag = (await $`git describe --tags --abbrev=0`.quiet().nothrow().text()).trim();
  const slug = (await $`git remote get-url origin`.quiet().text())
    .trim()
    .replace(/^.*github\.com[:/]/, "")
    .replace(/\.git$/, "");
  await Bun.write(
    changelog,
    stamp(
      await changelog.text(),
      version,
      lastTag,
      slug,
      new Date().toISOString().slice(0, 10),
    ),
  );
  console.log(`  ${green("✓")}  CHANGELOG.md: Unreleased is now ${version}`);
  await $`bun run build`.quiet();
  console.log(`  ${green("✓")}  dist/ built`);
}

// Release notes: the commits since the last tag, then how to load it.
const last = (await $`git describe --tags --abbrev=0`.quiet().nothrow().text()).trim();
const range = last ? `${last}..HEAD` : "HEAD";
const subjects = (await git("log", range, "--no-merges", "--format=%s"))
  .split("\n")
  .filter((s) => s && !/^Release \d/.test(s) && s !== "Build dist");
const repo = (await git("remote", "get-url", "origin"))
  .replace(/^.*github\.com[:/]/, "")
  .replace(/\.git$/, "");

if (!dry) {
  await $`git add package.json README.md CHANGELOG.md dist`.quiet();
  await $`git commit -m ${`Release ${version}`}`.quiet();
  console.log(`  ${green("✓")}  committed ${dim(`Release ${version}`)}`);
}

const notes = [
  changes,
  ``,
  `### Load from jsDelivr`,
  "```html",
  `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/${repo}@v${version}/dist/tsunami.min.css">`,
  `<script src="https://cdn.jsdelivr.net/gh/${repo}@v${version}/dist/tsunami.min.js"></script>`,
  "```",
].join("\n");

if (notesFile && !dry) await Bun.write(notesFile, notes + "\n");

console.log(`\n  ${bold("Release notes")} ${dim(`(from CHANGELOG.md; ${subjects.length} commits since ${last || "the start"})`)}\n`);
console.log(notes.replace(/^/gm, "  "));
console.log(`
  ${bold("Next")}
  Run the "Release" workflow (Actions > Release) to do this on CI, or by hand:
  1. git push origin main
  2. git tag v${version} && git push origin v${version}
  3. create the release on GitHub and paste the notes
  ${dim('Then run "Deploy Docs" and "Clear CDN Cache" for v' + version + ".")}
`);
