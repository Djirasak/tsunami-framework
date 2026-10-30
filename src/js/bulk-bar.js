// Bulk bar: .bulk-bar[data-table="table-id"] shows while rows of that table are
// selected (the checkboxes of js/table.js). Without data-table it uses the
// first .table in the bar's parent. It sets data-active="true|false" and
// writes the number into [data-bulk-count]. [data-bulk-clear] unselects all.
// API: window.tsunami.bulkBar.update(bar), .clear(bar).
import "./table.js";

const BAR = ".bulk-bar";

function tableOf(bar) {
  const id = bar.getAttribute("data-table");
  if (id) return document.getElementById(id);
  return bar.parentElement?.querySelector(".table") ?? null;
}

const rowsOf = (table) =>
  window.tsunami?.table?.selected(table) ??
  [...table.querySelectorAll('tbody td:first-child > input[type="checkbox"]')]
    .filter((box) => box.checked)
    .map((box) => box.closest("tr"));

function paint(bar, count) {
  bar.dataset.active = String(count > 0);
  for (const el of bar.querySelectorAll("[data-bulk-count]"))
    el.textContent = String(count);
}

// Counts the selected rows of the bar's table and updates the bar.
function update(bar) {
  const table = tableOf(bar);
  if (table) paint(bar, rowsOf(table).length);
}

// Unselects every row of the bar's table.
function clear(bar) {
  const table = tableOf(bar);
  if (table) window.tsunami.table.select(table, rowsOf(table), false);
}

// tsunami:select bubbles from the table, so the bars read it from there.
document.addEventListener("tsunami:select", (e) => {
  for (const bar of document.querySelectorAll(BAR)) {
    const table = tableOf(bar);
    if (table && table === e.target) paint(bar, e.detail.count);
  }
});

document.addEventListener("click", (e) => {
  const button = e.target.closest?.("[data-bulk-clear]");
  const bar = button?.closest(BAR);
  if (bar) clear(bar);
});

const init = (root) => {
  if (root.matches?.(BAR)) update(root);
  for (const bar of root.querySelectorAll(BAR)) update(bar);
};

// The script may run in <head>, before the bars are parsed; bars added later
// are picked up by the observer.
const start = () => {
  init(document);
  new MutationObserver((records) => {
    for (const r of records)
      for (const node of r.addedNodes) if (node.nodeType === 1) init(node);
  }).observe(document.body, { childList: true, subtree: true });
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start);
else start();

(window.tsunami ??= {}).bulkBar = { update, clear };
