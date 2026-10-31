// Colours HTML for the code blocks on the landing page, on the server, so React
// renders the same markup the browser gets. The docs pages do the same in
// docs.js after load; keep the two in step (tag, attribute, string, comment).
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const span = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;

export function highlightHtml(src) {
  return src.replace(
    /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+|</g,
    (m) => {
      if (m.startsWith("<!--")) return span("tok-c", m);
      const tag = /^(<\/?)([\w-]+)([\s\S]*?)(\/?>)$/.exec(m);
      if (!tag) return esc(m);
      const [, open, name, rest, close] = tag;
      const attrs = rest.replace(
        /("[^"]*"|'[^']*')|([^\s="'<>/]+)|([^"'\w]+)/g,
        (_, str, attr, other) =>
          str ? span("tok-s", str) : attr ? span("tok-a", attr) : esc(other),
      );
      return `${esc(open)}${span("tok-t", name)}${attrs}${esc(close)}`;
    },
  );
}
