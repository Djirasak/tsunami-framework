// Fail when something users can see has changed since the last release but
// CHANGELOG.md has nothing under "## [Unreleased]": bun run check:changelog
// The Release workflow stops on an empty Unreleased too, so this finds it on the
// push instead of in the middle of a release. It looks at src/, types/, vendor/,
// fonts/, flags/ and package.json (not its version, scripts or devDependencies).
import { $ } from "bun";
import { unreleased } from "./changelog";

const git = async (...a: string[]) =>
  (await $`git ${a}`.quiet().nothrow().text()).trim();

const last = await git("describe", "--tags", "--abbrev=0");
if (!last) {
  console.log("✓ no release tag yet, nothing to compare with");
  process.exit(0);
}

const changed = (await git("diff", "--name-only", `${last}..HEAD`))
  .split("\n")
  .filter(Boolean);
const visible = changed.filter((f) => /^(src|types|vendor|fonts|flags)\//.test(f));

// package.json: only what ships (exports, files, name, ...), not release or dev bookkeeping.
const shipped = (text: string) => {
  const { version, scripts, devDependencies, ...rest } = JSON.parse(text || "{}");
  return JSON.stringify(rest);
};
if (changed.includes("package.json")) {
  const before = await git("show", `${last}:package.json`);
  const now = await Bun.file("package.json").text();
  if (shipped(before) !== shipped(now)) visible.push("package.json");
}

if (!visible.length) {
  console.log(`✓ nothing user-visible changed since ${last}`);
  process.exit(0);
}
if (unreleased(await Bun.file("CHANGELOG.md").text())) {
  console.log(`✓ CHANGELOG.md describes the changes since ${last}`);
  process.exit(0);
}
console.error(`
  ✗ These changed since ${last}, but "## [Unreleased]" in CHANGELOG.md is empty:
${visible.slice(0, 8).map((f) => `      ${f}`).join("\n")}${visible.length > 8 ? `\n      and ${visible.length - 8} more` : ""}

  Say what changed for the people who use Tsunami, then run again.
`);
process.exit(1);
