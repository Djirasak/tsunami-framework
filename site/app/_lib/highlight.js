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

// JavaScript, just enough for an import line: comments, strings and a few keywords.
export function highlightJs(src) {
  return src.replace(
    /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\b(import|export|from|const|let|await|return|default)\b|([\s\S])/g,
    (m, c, str, key) =>
      c ? span("tok-c", c) : str ? span("tok-s", str) : key ? span("tok-t", key) : esc(m),
  );
}

// A shell command: the command name, its flags and # comments.
export function highlightSh(src) {
  return src
    .split("\n")
    .map((line) => {
      if (/^\s*#/.test(line)) return span("tok-c", line);
      const m = /^(\s*)(\S+)([\s\S]*)$/.exec(line);
      if (!m) return esc(line);
      const rest = m[3].replace(
        /(\s)(--?[\w-]+)|(\S+|\s+)/g,
        (x, w, flag, other) => (flag ? esc(w) + span("tok-a", flag) : esc(other ?? x)),
      );
      return esc(m[1]) + span("tok-t", m[2]) + rest;
    })
    .join("\n");
}

export const highlightCode = (src, lang = "html") =>
  lang === "js" ? highlightJs(src) : lang === "sh" ? highlightSh(src) : highlightHtml(src);
