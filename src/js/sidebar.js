// Sidebar: collapse to icons with data-collapsed="true".
// <button commandfor="sidebar-id" command="--toggle-collapsed"> (or
// "--collapse" / "--expand") works from anywhere; the API takes the element.
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

(window.tsunami ??= {}).sidebar = { collapse, expand, toggle };
