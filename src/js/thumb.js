// Sliding thumb: the white pill behind the selected tab or segmented option
// slides to the next one. This script measures the selected item and sets
// --thumb-x, --thumb-y, --thumb-w and --thumb-h on its group; the CSS draws the
// pill and animates it. A group with no JS, or one that is hidden, keeps the
// plain selected style, which switches at once.
const GROUP = '.tabs [role="tablist"], .segmented';

const selected = (group) =>
  group.matches(".segmented")
    ? group.querySelector(":scope > label:has(> input:checked)")
    : [...group.querySelectorAll('[role="tab"][aria-selected="true"]')].find(
        (t) => t.closest('[role="tablist"]') === group,
      );

const resizer = new ResizeObserver((entries) => {
  for (const e of entries) place(e.target);
});

function place(group) {
  const item = selected(group);
  // Hidden (display: none) or nothing selected: fall back to the plain style.
  if (!item || !item.offsetWidth) {
    delete group.dataset.thumb;
    return;
  }
  const s = group.style;
  s.setProperty("--thumb-x", `${item.offsetLeft}px`);
  s.setProperty("--thumb-y", `${item.offsetTop}px`);
  s.setProperty("--thumb-w", `${item.offsetWidth}px`);
  s.setProperty("--thumb-h", `${item.offsetHeight}px`);
  // The first placement jumps; later ones slide.
  if (!group.dataset.thumb) {
    group.dataset.thumb = "set";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (group.dataset.thumb === "set") group.dataset.thumb = "slide";
      }),
    );
  }
}

const groupOf = (node) => node.closest?.(GROUP);

const scan = (node) => {
  const list = node.matches?.(GROUP) ? [node] : [];
  for (const g of [...list, ...(node.querySelectorAll?.(GROUP) ?? [])]) {
    place(g);
    resizer.observe(g);
  }
};

const start = () => {
  scan(document);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") {
        const g = groupOf(r.target);
        if (g) place(g);
      } else {
        r.addedNodes.forEach((n) => {
          scan(n);
          if (n.nodeType === 1 && groupOf(n)) place(groupOf(n));
        });
        if (groupOf(r.target)) place(groupOf(r.target));
      }
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-selected"],
  });
  document.addEventListener("change", (e) => {
    const g = e.target.closest?.(".segmented");
    if (g) place(g);
  });
  document.addEventListener("reset", (e) =>
    setTimeout(() => e.target.querySelectorAll(".segmented").forEach(place)),
  );
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start);
else start();
