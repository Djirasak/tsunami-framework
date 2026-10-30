// Sidebar: collapse to icons with data-collapsed="true".
// <button commandfor="sidebar-id" command="--toggle-collapsed"> (or
// "--collapse" / "--expand") works from anywhere; the API takes the element.
// data-keep-scroll on a .sidebar remembers how far it is scrolled (per tab, by
// its id) and brings it back on the next page load, and scrolls the
// aria-current="page" item into view, so a long menu does not jump to the top
// on every full page load.
function set(sidebar, collapsed) {
  sidebar.dataset.collapsed = String(collapsed);
}

const collapse = (sidebar) => set(sidebar, true);
const expand = (sidebar) => set(sidebar, false);
const toggle = (sidebar) => set(sidebar, sidebar.dataset.collapsed !== "true");

const commands = {
  "--collapse": collapse,
  "--expand": expand,
  "--toggle-collapsed": toggle,
};

// command events do not bubble: listen in the capture phase.
document.addEventListener(
  "command",
  (e) => {
    if (e.target.matches?.(".sidebar")) commands[e.command]?.(e.target);
  },
  true,
);

const KEEP = ".sidebar[data-keep-scroll]";
const kept = new WeakSet();
const key = (el) => `tsunami:sidebar:${el.id || "sidebar"}`;

function mount(root = document) {
  for (const el of root.querySelectorAll(KEEP)) {
    if (kept.has(el)) continue;
    kept.add(el);
    try {
      el.scrollTop = Number(sessionStorage.getItem(key(el))) || 0;
    } catch {
      // Storage is blocked: the sidebar just starts at the top.
    }
    el.querySelector('[aria-current="page"]')?.scrollIntoView({
      block: "nearest",
    });
    el.addEventListener(
      "scroll",
      () => {
        try {
          sessionStorage.setItem(key(el), String(el.scrollTop));
        } catch {
          // Nothing to keep it in.
        }
      },
      { passive: true },
    );
  }
}

// The script may run before the sidebar is parsed; one added later is started too.
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
else mount();
new MutationObserver((records) => {
  if (document.readyState === "loading") return;
  for (const r of records)
    for (const n of r.addedNodes)
      if (n.nodeType === 1 && (n.matches(KEEP) || n.querySelector(KEEP)))
        return mount();
}).observe(document.documentElement, { childList: true, subtree: true });

(window.tsunami ??= {}).sidebar = { collapse, expand, toggle, mount };
