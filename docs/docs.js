// Docs sidebar search: Ctrl/Cmd+K focuses it; filters nav links by data-label and data-keywords.
const sidebar = document.getElementById("docs-nav");
const input = sidebar.querySelector('input[type="search"]');
const links = [...sidebar.querySelectorAll("nav a")];
const labels = [...sidebar.querySelectorAll("nav h2")];

function filter() {
  const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  for (const a of links) {
    const text = `${a.dataset.label} ${a.dataset.keywords}`.toLowerCase();
    a.hidden = !terms.every((t) => text.includes(t));
  }
  // Hide a group label when none of its links match.
  for (const h of labels) {
    let el = h.nextElementSibling;
    let any = false;
    while (el && el.tagName === "A") {
      any ||= !el.hidden;
      el = el.nextElementSibling;
    }
    h.hidden = !any;
  }
}

input.addEventListener("input", filter);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // Prefer a link whose label matches over a keyword-only match.
    const q = input.value.trim().toLowerCase();
    const shown = links.filter((a) => !a.hidden);
    (
      shown.find((a) => a.dataset.label.toLowerCase().includes(q)) ?? shown[0]
    )?.click();
  }
  if (e.key === "Escape" && input.value) {
    e.preventDefault();
    input.value = "";
    filter();
  }
});

document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
  e.preventDefault();
  // Below 48rem the sidebar is a closed popover.
  if (!sidebar.checkVisibility()) sidebar.showPopover();
  input.focus();
  input.select();
});

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

for (const pre of document.querySelectorAll(
  ".docs-main > section > pre, [role=tabpanel] > pre",
)) {
  const code = pre.querySelector("code");
  if (!code) continue;
  code.innerHTML = highlight(code.textContent);
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
