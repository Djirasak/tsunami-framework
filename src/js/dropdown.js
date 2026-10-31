// Dropdown and popover keyboard and ARIA: a button with popovertarget gets
// aria-expanded and aria-controls that follow the panel, ArrowDown on the button
// moves into an open dropdown, and Up, Down, Home and End move between a
// dropdown's items. Escape and light dismiss are native.
const PANEL = ".dropdown, .popover";
const ITEM = "a[href], button:not(:disabled), input:not(:disabled)";

const triggers = (panel) =>
  document.querySelectorAll(`[popovertarget="${CSS.escape(panel.id)}"]`);

const items = (panel) =>
  [...panel.querySelectorAll(ITEM)].filter(
    (el) => el.getAttribute("aria-disabled") !== "true" && !el.hidden,
  );

function sync(panel) {
  const open = panel.matches(":popover-open");
  for (const t of triggers(panel)) {
    t.setAttribute("aria-controls", panel.id);
    t.setAttribute("aria-expanded", String(open));
  }
}

function upgrade(panel) {
  if (!panel.id || panel.dataset.dropdownInitialized) return;
  if (!panel.hasAttribute("popover")) return;
  panel.dataset.dropdownInitialized = "true";
  sync(panel);
  panel.addEventListener("toggle", () => sync(panel));
}

const scan = (node) => {
  if (node.matches?.(PANEL)) upgrade(node);
  node.querySelectorAll?.(PANEL).forEach(upgrade);
};
const start = () => {
  scan(document);
  new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach(scan);
  }).observe(document.documentElement, { childList: true, subtree: true });
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start);
else start();

document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const trigger = e.target.closest?.("[popovertarget]");
  if (trigger && !trigger.closest(".dropdown") && e.key === "ArrowDown") {
    const panel = document.getElementById(trigger.getAttribute("popovertarget"));
    if (panel?.matches(".dropdown:popover-open")) {
      e.preventDefault();
      items(panel)[0]?.focus();
    }
    return;
  }
  const panel = e.target.closest?.(".dropdown");
  if (!panel || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  if (e.target.matches('input[type="radio"]')) return; // the radio group moves itself
  const all = items(panel);
  const at = all.indexOf(e.target);
  if (at < 0) return;
  e.preventDefault();
  const to =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? all.length - 1
        : (at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length;
  all[to].focus();
});
