// Publish a release to npm from this machine: bun run publish:npm [tag] [--dry] [--yes]
// It publishes the newest release tag (or the tag you name, such as v1.3.0): checks
// out the tag, runs `npm publish --access public`, and goes back to your branch, even
// if the publish fails. The package's prepublishOnly (scripts/check-publish.ts) builds
// and checks it again at the tag. --dry rehearses with `npm publish --dry-run`;
// --yes skips the question. npm may then hold the version until you approve it
// (npmjs.com > the package > Staged Packages, or `npm stage approve`).
import { $ } from "bun";
import { createInterface } from "node:readline/promises";

const args = Bun.argv.slice(2);
const dry = args.includes("--dry");
const yes = args.includes("--yes");
const named = args.find((a) => !a.startsWith("--"));

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const [bold, dim, red, green] = [1, 2, 31, 32].map(paint);
const fail = (message: string): never => {
  console.error(`\n  ${red("✗")}  ${message}\n`);
  process.exit(1);
};
const out = async (...cmd: string[]) => (await $`${cmd}`.quiet().nothrow().text()).trim();

// A clean tree, so what is published is what is tagged.
if (await out("git", "status", "--porcelain"))
  fail("The working tree has changes: commit or stash them first.");

await $`git fetch --tags --quiet`.quiet().nothrow();

// The tag: the one you named, else the highest version.
const tag = named ?? (await out("git", "tag", "--sort=-v:refname")).split("\n")[0];
if (!tag || !(await out("git", "rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`)))
  fail(`There is no tag ${named ?? "yet"}: run the Release workflow, then git pull.`);

// What that tag holds: a scoped, public package whose version is the tag.
let pkg: { name?: string; version?: string; private?: boolean };
try {
  pkg = JSON.parse(await out("git", "show", `${tag}:package.json`));
} catch {
  fail(`${tag} has no readable package.json.`);
  throw new Error("unreachable");
}
if (pkg.private || !pkg.name?.startsWith("@"))
  fail(`${tag} is from before the npm package (its name is "${pkg.name}", private ${pkg.private}). Use a newer tag.`);
if (`v${pkg.version}` !== tag) fail(`${tag} holds version ${pkg.version}, not ${tag.replace(/^v/, "")}.`);

// Is it already on npm?
const published: string[] = JSON.parse((await out("npm", "view", pkg.name!, "versions", "--json")) || "[]");
const onNpm = Array.isArray(published) && published.includes(pkg.version!);
if (onNpm && !dry) fail(`${pkg.name}@${pkg.version} is already on npm. A version cannot be published twice.`);

// Logged in? (a dry run needs no login)
const who = await out("npm", "whoami");
if (!who && !dry) fail("You are not logged in to npm: run npm login first.");

console.log(`
  ${bold(pkg.name!)} ${dim(onNpm ? `(${pkg.version} is on npm; rehearsal only)` : "")}
  version  ${green(pkg.version!)}  from tag ${tag}
  npm user ${who || dim("not logged in (dry run)")}
  mode     ${dry ? "dry run: nothing is uploaded" : bold("PUBLISH: this cannot be undone")}
`);

if (!dry && !yes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`  Publish ${pkg.name}@${pkg.version}? (y/N) `)).trim().toLowerCase();
  rl.close();
  if (answer !== "y" && answer !== "yes") fail("Cancelled. Nothing was published.");
}

// Go back to where you were, whatever happens next.
const branch = await out("git", "symbolic-ref", "--short", "-q", "HEAD");
const back = branch || (await out("git", "rev-parse", "HEAD"));
let code = 1;
try {
  await $`git checkout --quiet ${tag}`;
  const cmd = ["npm", "publish", "--access", "public", ...(dry ? ["--dry-run"] : [])];
  const proc = Bun.spawn(cmd, { stdio: ["inherit", "inherit", "inherit"] });
  code = await proc.exited;
} finally {
  // The build in prepublishOnly rewrites files in dist/: drop that before leaving the tag.
  await $`git checkout --quiet -- dist`.quiet().nothrow();
  await $`git clean -fdq dist`.quiet().nothrow();
  await $`git checkout --quiet ${back}`.quiet().nothrow();
}

if (code !== 0) fail(`npm publish failed (exit ${code}). You are back on ${branch || back.slice(0, 7)}.`);
console.log(
  dry
    ? `\n  ${green("✓")}  dry run passed, back on ${branch || back.slice(0, 7)}\n`
    : `\n  ${green("✓")}  sent ${pkg.name}@${pkg.version} to npm, back on ${branch || back.slice(0, 7)}.\n  If npm holds it for approval: npmjs.com > the package > Staged Packages, or npm stage approve.\n`,
);
