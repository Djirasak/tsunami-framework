// Scroll area: a .scroll-area that has no tabindex gets tabindex="0", so a reader
// who uses the keyboard can focus it and scroll it with the arrow keys. A box that
// scrolls sideways on a phone (a table, a code sample) is unreachable without it.
// Put your own tabindex on it (for example -1) and it is left alone.
const BOX = ".scroll-area";

const focusable = (node) => {
  const list = node.matches?.(BOX) ? [node] : [];
  for (const el of [...list, ...(node.querySelectorAll?.(BOX) ?? [])])
    if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
};

const start = () => {
  focusable(document);
  new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach(focusable);
  }).observe(document.documentElement, { childList: true, subtree: true });
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start);
else start();
