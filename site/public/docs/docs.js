// Docs search: the sidebar button opens a command palette built from the nav,
// so every page is listed with its icon and found by label or keyword.
// Ctrl/Cmd+K opens it too (data-hotkey on the dialog, see command.js).
const sidebar = document.getElementById("docs-nav");
const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const palette = document.createElement("dialog");
palette.id = "docs-palette";
palette.className = "command-dialog";
palette.setAttribute("aria-label", "Search docs");
palette.setAttribute("closedby", "any");
palette.dataset.hotkey = "mod+k";
palette.innerHTML = `<div class="command">
  <header>
    <i class="icon icon-search" aria-hidden="true"></i>
    <input type="text" id="docs-palette-input" placeholder="Search docs..." autocomplete="off" autocorrect="off" spellcheck="false" aria-autocomplete="list" role="combobox" aria-expanded="true" aria-controls="docs-palette-menu">
  </header>
  <div role="menu" id="docs-palette-menu" aria-orientation="vertical" data-empty="No results found.">
    ${[...sidebar.querySelectorAll('nav [role="group"]')]
      .map((group, i) => {
        const title = group.querySelector("h3")?.textContent ?? "Get started";
        const rows = [...group.querySelectorAll("a")]
          .map((a) => {
            const icon = a.querySelector(".icon").className;
            return `<a role="menuitem" href="${attr(a.getAttribute("href"))}" data-label="${attr(a.dataset.label)}" data-keywords="${attr(a.dataset.keywords)}"><i class="${icon}" aria-hidden="true"></i><span>${a.dataset.label}</span></a>`;
          })
          .join("");
        return `<div role="group" aria-labelledby="docs-palette-g${i}"><span role="heading" id="docs-palette-g${i}">${title}</span>${rows}</div>`;
      })
      .join("")}
  </div>
</div>`;
document.body.append(palette);

// Code blocks: colour the markup and add a copy button.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const span = (cls, s) => `<span class="${cls}">${esc(s)}</span>`;

function highlight(src) {
  return src.replace(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+|</g, (m) => {
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
  });
}

// JavaScript and shell blocks (code class language-js / language-sh), for the install lines.
function highlightJs(src) {
  return src.replace(
    /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|\b(import|export|from|const|let|await|return|default)\b|([\s\S])/g,
    (m, c, str, key) =>
      c ? span("tok-c", c) : str ? span("tok-s", str) : key ? span("tok-t", key) : esc(m),
  );
}

function highlightSh(src) {
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

for (const pre of document.querySelectorAll(
  ".docs-main > section > pre, [role=tabpanel] > pre",
)) {
  const code = pre.querySelector("code");
  if (!code) continue;
  code.innerHTML = (
    code.classList.contains("language-js")
      ? highlightJs
      : code.classList.contains("language-sh")
        ? highlightSh
        : highlight
  )(code.textContent);
  const box = document.createElement("div");
  box.className = "docs-code";
  pre.replaceWith(box);
  box.append(
    pre,
    Object.assign(document.createElement("button"), {
      type: "button",
      className: "btn docs-copy",
      innerHTML: '<i class="icon icon-copy" aria-hidden="true"></i>',
    }),
  );
  box.lastChild.dataset.variant = "ghost";
  box.lastChild.dataset.size = "icon-sm";
  box.lastChild.setAttribute("aria-label", "Copy code");
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".docs-copy");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.previousElementSibling.textContent);
  } catch {
    return; // Clipboard blocked: nothing to copy to.
  }
  btn.dataset.copied = "";
  btn.firstChild.className = "icon icon-check";
  btn.setAttribute("aria-label", "Copied");
  setTimeout(() => {
    delete btn.dataset.copied;
    btn.firstChild.className = "icon icon-copy";
    btn.setAttribute("aria-label", "Copy code");
  }, 1500);
});
