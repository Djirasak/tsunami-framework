import DocsScript from "./DocsScript";

// The root layout shared by every page. Next.js allows one root layout per
// route group, so pages that need a library script (TinyMCE, Monaco, ...) sit
// in their own group: the libraries go in <head> as plain blocking scripts,
// in order and before tsunami.min.js, which also applies the theme before the
// first paint. Pages are plain HTML with full page loads (plain <a> links, no
// client router), so inline <script> blocks in the content run in the browser's
// HTML parser, in order, exactly as in a static page.
export default function Root({ libs = [], docs = true, children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/dist/tsunami.min.css" />
        <link rel="icon" href="/docs/favicon.svg" type="image/svg+xml" />
        {docs && <link rel="stylesheet" href="/docs/docs.css" />}
        {libs.map((src) => (
          <script src={src} key={src}></script>
        ))}
        <script src="/dist/tsunami.min.js"></script>
      </head>
      <body>
        {children}
        {docs && <DocsScript />}
      </body>
    </html>
  );
}
