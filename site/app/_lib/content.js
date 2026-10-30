// Reads site/content at build time: pages.json (title and library scripts per
// page), nav.json (the sidebar and the search palette) and <name>.html (the
// inner HTML of <main>, the source to edit).
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "content");
const json = (name) => JSON.parse(readFileSync(join(dir, name), "utf8"));

export const pages = json("pages.json");
export const nav = json("nav.json");

// The framework's version, from the root package.json: content writes it as
// {{version}} (the badge and the CDN links). It is read on every call, so a
// bump shows in `bun run docs` without a restart.
export const version = () =>
  JSON.parse(readFileSync(join(process.cwd(), "..", "package.json"), "utf8"))
    .version;

export const html = (slug) =>
  readFileSync(join(dir, `${slug}.html`), "utf8").replaceAll(
    "{{version}}",
    version(),
  );

// The date of the last commit that touched a page's HTML, for the sitemap.
// Falls back to the page's file time when git is not available (for example
// in a build from an exported tarball).
export function lastModified(slug) {
  const file = join(dir, `${slug}.html`);
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out) return new Date(out);
  } catch {}
  return statSync(file).mtime;
}

// Pages rendered inside the docs shell, without a page of their own in app/.
export const plainSlugs = Object.keys(pages).filter(
  (slug) =>
    slug !== "index" &&
    !pages[slug].bare &&
    !pages[slug].libs.length,
);
