// Reads site/content at build time: pages.json (title and library scripts per
// page), nav.json (the sidebar and the search palette) and <name>.html (the
// inner HTML of <main>, the source to edit).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "content");
const json = (name) => JSON.parse(readFileSync(join(dir, name), "utf8"));

export const pages = json("pages.json");
export const nav = json("nav.json");

export const html = (slug) => readFileSync(join(dir, `${slug}.html`), "utf8");

// Pages rendered inside the docs shell, without a page of their own in app/.
export const plainSlugs = Object.keys(pages).filter(
  (slug) =>
    slug !== "index" &&
    !pages[slug].bare &&
    !pages[slug].libs.length,
);
