// Sidebar: collapse to icons with data-collapsed="true".
// <button commandfor="sidebar-id" command="--toggle-collapsed"> (or
// "--collapse" / "--expand") works from anywhere; the API takes the element.
// data-keep-scroll on a .sidebar remembers how far it is scrolled (per tab, by
// its id) and brings it back on the next page load, and scrolls the
// aria-current="page" item into view, so a long menu does not jump to the top
// on every full page load.
// Buttons that drive a sidebar keep aria-expanded in step: the collapse
// buttons say whether it is expanded, the popover buttons whether it is open.
const COLLAPSE_CMDS = ["--collapse", "--expand", "--toggle-collapsed"];
const POPOVER_CMDS = ["toggle-popover", "show-popover", "hide-popover"];

function controls(sidebar) {
  if (!sidebar.id) return [];
  const id = CSS.escape(sidebar.id);
  return document.querySelectorAll(
    `[popovertarget="${id}"], [commandfor="${id}"]`,
  );
}

function sync(sidebar) {
  const open = sidebar.matches(":popover-open");
  const expanded = sidebar.dataset.collapsed !== "true";
  for (const b of controls(sidebar)) {
    const cmd = b.getAttribute("command");
    if (cmd && COLLAPSE_CMDS.includes(cmd))
      b.setAttribute("aria-expanded", String(expanded));
    else if (b.hasAttribute("popovertarget") || POPOVER_CMDS.includes(cmd))
      b.setAttribute("aria-expanded", String(open));
  }
}

function set(sidebar, collapsed) {
  sidebar.dataset.collapsed = String(collapsed);
  sync(sidebar);
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

// An opened drawer takes focus, so Tab continues inside it. Esc and light
// dismiss already hand focus back to the button that opened it.
document.addEventListener(
  "toggle",
  (e) => {
    const el = e.target;
    if (!el.matches?.(".sidebar[popover]")) return;
    sync(el);
    if (e.newState !== "open") return;
    const first = el.querySelector(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (first) first.focus();
    else {
      if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
      el.focus();
    }
  },
  true,
);

const KEEP = ".sidebar[data-keep-scroll]";
const kept = new WeakSet();
const key = (el) => `tsunami:sidebar:${el.id || "sidebar"}`;

function mount(root = document) {
  for (const el of root.querySelectorAll(".sidebar")) sync(el);
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
      if (n.nodeType === 1 && (n.matches(".sidebar") || n.querySelector(".sidebar")))
        return mount();
}).observe(document.documentElement, { childList: true, subtree: true });

(window.tsunami ??= {}).sidebar = { collapse, expand, toggle, mount };
