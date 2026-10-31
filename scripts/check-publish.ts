// Runs first in prepublishOnly: npm publish only goes ahead from a clean checkout of
// the release tag, so the package holds the dist/ the Release workflow built and
// tagged. Publish by hand after a release:
//   git pull && git checkout v<version> && npm publish --access public
import { $ } from "bun";
import pkg from "../package.json";

const tag = `v${pkg.version}`;
const out = async (...cmd: string[]) => (await $`git ${cmd}`.quiet().nothrow().text()).trim();

const problems: string[] = [];
if (await out("status", "--porcelain"))
  problems.push("The working tree has changes: commit or stash them first.");
const tagged = await out("rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`);
if (!tagged)
  problems.push(`There is no tag ${tag}: run the Release workflow first, then git pull.`);
else if (tagged !== (await out("rev-parse", "HEAD")))
  problems.push(`HEAD is not ${tag}: run git checkout ${tag} first.`);

if (problems.length) {
  console.error(`\n  Not publishing ${pkg.name}@${pkg.version}:\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("");
  process.exit(1);
}
console.log(`✓ ${tag} is checked out and clean`);
