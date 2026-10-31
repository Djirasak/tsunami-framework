// Check the docs content without a browser: bun run check:docs
// 1. Every HTML file in site/content (and content/examples) has balanced tags.
//    The pages go into the document as innerHTML, so a stray or missing closing
//    tag moves content out of <main> and React then fails to hydrate it.
// 2. pages.json, nav.json and examples.json agree with the files on disk.
// Exits 1 and prints file:line for each problem.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const content = join(import.meta.dir, "..", "content");
const problems: string[] = [];
const fail = (message: string) => problems.push(message);

const VOID = new Set(
  "area base br col embed hr img input link meta source track wbr".split(" "),
);
// Elements whose end tag HTML lets you leave out: closing a parent closes them.
const OPTIONAL = new Set(
  "p li dt dd tr td th thead tbody tfoot option optgroup".split(" "),
);

// Blank out what must not be parsed as markup, keeping the line breaks so the
// line numbers stay right: comments, <pre> samples, scripts, styles, templates.
const blank = (text: string) =>
  text.replace(
    /<!--[\s\S]*?-->|<(pre|script|style|template)\b[\s\S]*?<\/\1>/g,
    (m) => m.replace(/[^\n]/g, " "),
  );

function checkBalance(file: string) {
  const text = blank(readFileSync(file, "utf8"));
  const stack: { tag: string; line: number }[] = [];
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;
  const rel = file.slice(content.length + 1);
  let m: RegExpExecArray | null;
  while ((m = tag.exec(text))) {
    const line = text.slice(0, m.index).split("\n").length;
    const [, closing, raw, , selfClosing] = m;
    const name = raw.toLowerCase();
    if (VOID.has(name) || selfClosing) continue;
    if (!closing) {
      stack.push({ tag: name, line });
      continue;
    }
    // Close the nearest matching open tag; tags with an optional end tag
    // between are closed with it, any other open tag in between is an error.
    let i = stack.length - 1;
    while (i >= 0 && stack[i].tag !== name && OPTIONAL.has(stack[i].tag)) i--;
    if (i < 0 || stack[i].tag !== name) {
      const top = stack[stack.length - 1];
      fail(
        `${rel}:${line} </${name}> closes nothing` +
          (top ? ` (the open tag is <${top.tag}> from line ${top.line})` : ""),
      );
      continue;
    }
    stack.length = i;
  }
  for (const open of stack)
    if (!OPTIONAL.has(open.tag))
      fail(`${rel}:${open.line} <${open.tag}> is never closed`);
}

const htmlFiles = (dir: string) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => join(dir, f));
for (const file of [
  ...htmlFiles(content),
  ...htmlFiles(join(content, "examples")),
])
  checkBalance(file);

// The data files against the files on disk.
const json = (name: string) =>
  JSON.parse(readFileSync(join(content, name), "utf8"));
const pages = json("pages.json");
const nav = json("nav.json");
const examples = json("examples.json");

for (const slug of Object.keys(pages))
  if (!existsSync(join(content, `${slug}.html`)))
    fail(`pages.json: "${slug}" has no ${slug}.html`);
const inNav = new Set<string>();
for (const group of nav)
  for (const item of group.items) {
    const slug = item.href === "/docs" ? "index" : item.href.replace("/docs/", "");
    inNav.add(slug);
    if (!pages[slug]) fail(`nav.json: ${item.href} is not in pages.json`);
  }
for (const [slug, page] of Object.entries<any>(pages))
  if (!inNav.has(slug) && !page.bare && !page.noindex)
    fail(`pages.json: "${slug}" is not in nav.json (add it or mark it noindex)`);
for (const slug of Object.keys(examples))
  if (!existsSync(join(content, "examples", `${slug}.html`)))
    fail(`examples.json: "${slug}" has no examples/${slug}.html`);
for (const file of htmlFiles(join(content, "examples"))) {
  const slug = file.split("/").pop()!.replace(".html", "");
  if (!examples[slug]) fail(`examples/${slug}.html is not in examples.json`);
}

const checked = htmlFiles(content).length + htmlFiles(join(content, "examples")).length;
if (problems.length) {
  console.error(`\n${problems.length} problem(s) in the docs content:\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("");
  process.exit(1);
}
console.log(`✓ ${checked} docs files: tags balanced, data files agree`);
