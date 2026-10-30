import Shell from "../_components/Shell";
import { pages } from "./content";

// A docs page: its metadata and its component, for the page file of a slug.
export function docsPage(slug) {
  return {
    metadata: { title: `${pages[slug].title} | Tsunami` },
    Page: () => <Shell slug={slug} />,
  };
}

// A group layout for a page with library scripts, read from pages.json.
export function libsLayout(slug, Root) {
  return function Layout({ children }) {
    return <Root libs={pages[slug].libs}>{children}</Root>;
  };
}
