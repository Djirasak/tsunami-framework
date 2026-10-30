// Full-page examples: content/examples.json (title, description and library
// scripts per example) and content/examples/<slug>.html, the whole body of the
// page, with no docs chrome. Each example is in its own route group so it can
// load its library scripts in <head>, as the docs pages do.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExampleBar from "../_components/ExampleBar";
import { version } from "./content";
import { exampleMetadata as metadataOf } from "./seo";

const dir = join(process.cwd(), "content");
export const examples = JSON.parse(
  readFileSync(join(dir, "examples.json"), "utf8"),
);

export const exampleHtml = (slug) =>
  readFileSync(join(dir, "examples", `${slug}.html`), "utf8").replaceAll(
    "{{version}}",
    version(),
  );

// The page file of an example: its metadata and its component.
export function examplePage(slug) {
  return {
    metadata: metadataOf(slug, examples[slug]),
    Page: () => (
      <div
        style={{ display: "contents" }}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: exampleHtml(slug) }}
      />
    ),
  };
}

// The group layout of an example: its library scripts, then the content and
// the small bar that leads back to the docs and to the source.
export function exampleLayout(slug, Root) {
  return function Layout({ children }) {
    return (
      <Root docs={false} libs={examples[slug].libs}>
        {children}
        <ExampleBar slug={slug} />
      </Root>
    );
  };
}
