const SOURCE =
  "https://github.com/Djirasak/tsunami-framework/blob/main/site/content/examples";

// A small floating bar on every full-page example: back to the docs, and the
// HTML of the page on GitHub. It uses Tsunami's own classes and variables.
export default function ExampleBar({ slug }) {
  return (
    <nav
      aria-label="Example"
      style={{
        position: "fixed",
        right: "var(--space-3)",
        bottom: "var(--space-3)",
        zIndex: 40,
        display: "flex",
        gap: "var(--space-1)",
        padding: "var(--space-1)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
      }}
    >
      <a className="btn" data-variant="ghost" data-size="sm" href="/docs">
        <i className="icon icon-arrow-left" aria-hidden="true"></i>
        Docs
      </a>
      <a
        className="btn"
        data-variant="ghost"
        data-size="sm"
        href={`${SOURCE}/${slug}.html`}
      >
        <i className="icon icon-code" aria-hidden="true"></i>
        Source
      </a>
    </nav>
  );
}
