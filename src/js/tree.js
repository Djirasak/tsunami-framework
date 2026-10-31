// Tree: filter(tree, query) shows only the files (leaf <li>) whose text holds
// the query, any letter case, and opens their folders. An empty query shows
// every file and puts the folders back as they were. An input[type=search]
// inside the .tree filters as it is typed in. A direct <p> child is the
// "no match" line, shown only when nothing matches.
function filter(tree, query) {
  const q = query.trim().toLowerCase();
  const folders = [...tree.querySelectorAll("details")];
  const empty = tree.querySelector(":scope > p");
  if (!q) {
    for (const li of tree.querySelectorAll("li")) li.hidden = false;
    for (const d of folders) {
      if (d.dataset.treeOpen) d.open = d.dataset.treeOpen === "true";
      delete d.dataset.treeOpen;
    }
    if (empty) empty.hidden = true;
    refresh(tree);
    return;
  }
  // Remember how the folders were before the first search.
  for (const d of folders) d.dataset.treeOpen ??= String(d.open);
  let any = false;
  for (const li of tree.querySelectorAll("li:not(:has(> details))")) {
    li.hidden = !li.textContent.toLowerCase().includes(q);
    any ||= !li.hidden;
  }
  // Deepest folders first, so a parent sees its children's result.
  for (const d of folders.reverse()) {
    const hit = !!d.querySelector("li:not([hidden])");
    d.open = hit;
    if (d.parentElement.matches("li")) d.parentElement.hidden = !hit;
  }
  if (empty) empty.hidden = any;
  refresh(tree);
}

// The "no match" line becomes a live region once the search field is in use.
document.addEventListener("focusin", (e) => {
  if (e.target.matches('.tree input[type="search"]'))
    e.target.closest(".tree").querySelector(":scope > p")?.setAttribute("role", "status");
});
document.addEventListener("input", (e) => {
  if (e.target.matches('.tree input[type="search"]'))
    filter(e.target.closest(".tree"), e.target.value);
});

// WAI-ARIA tree, applied here so the markup works without JS. The list is
// role=tree, nested lists are groups, and the focusable summary / a / span is
// the treeitem (folders carry aria-expanded, kept in step with details.open).
// One item is the tab stop; the arrow keys, Home and End move the rest.
const ITEM = ":scope > details > summary, :scope > a, :scope > span";
const listOf = (tree) =>
  tree.matches("ul") ? tree : tree.querySelector(":scope > ul");
const itemOf = (li) => li.querySelector(ITEM);
const items = (tree) =>
  [...tree.querySelectorAll('[role="treeitem"]')].filter((el) => {
    const li = el.closest("li");
    for (let n = li; n && tree.contains(n); n = n.parentElement.closest("li"))
      if (n.hidden) return false;
    for (
      let d = li.parentElement.closest("details");
      d && tree.contains(d);
      d = d.parentElement.closest("details")
    )
      if (!d.open) return false;
    return true;
  });

function refresh(tree) {
  const root = listOf(tree);
  if (!root) return;
  root.setAttribute("role", "tree");
  for (const ul of root.querySelectorAll("ul")) ul.setAttribute("role", "group");
  for (const li of root.querySelectorAll("li")) {
    li.setAttribute("role", "none");
    const d = li.querySelector(":scope > details");
    d?.setAttribute("role", "none");
    const item = (d && d.querySelector(":scope > summary")) || itemOf(li);
    if (!item) continue;
    item.setAttribute("role", "treeitem");
    if (d) item.setAttribute("aria-expanded", String(d.open));
    else item.removeAttribute("aria-expanded");
    if (!item.hasAttribute("tabindex")) item.tabIndex = -1;
  }
  const visible = items(root);
  const current =
    visible.find((el) => el.tabIndex === 0) ??
    visible.find((el) => el.matches('[aria-current="page"]')) ??
    visible[0];
  setStop(root, current);
}

function setStop(root, el) {
  for (const it of root.querySelectorAll('[role="treeitem"]'))
    it.tabIndex = it === el ? 0 : -1;
}

const upgrade = (tree) => {
  if (!listOf(tree)) return;
  refresh(tree);
};
const scan = (node) => {
  if (node.matches?.(".tree")) upgrade(node);
  node.querySelectorAll?.(".tree").forEach(upgrade);
  const parent = node.parentElement?.closest(".tree");
  if (parent) upgrade(parent);
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => scan(document), {
    once: true,
  });
else scan(document);
new MutationObserver((list) => {
  if (document.readyState === "loading") return;
  for (const m of list)
    for (const n of m.addedNodes) if (n.nodeType === 1) scan(n);
}).observe(document.documentElement, { childList: true, subtree: true });

// toggle does not bubble, so listen in the capture phase.
document.addEventListener(
  "toggle",
  (e) => {
    const d = e.target;
    if (!d.matches?.("details")) return;
    const tree = d.closest(".tree");
    if (!tree) return;
    d.querySelector(":scope > summary")?.setAttribute(
      "aria-expanded",
      String(d.open),
    );
    refresh(tree);
  },
  true,
);

document.addEventListener("focusin", (e) => {
  const it = e.target.closest?.('.tree [role="treeitem"]');
  if (it) setStop(it.closest('[role="tree"]'), it);
});

document.addEventListener("keydown", (e) => {
  const it = e.target.closest?.('.tree [role="treeitem"]');
  if (!it || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const root = it.closest('[role="tree"]');
  const visible = items(root);
  const i = visible.indexOf(it);
  const d = it.matches("summary") ? it.parentElement : null;
  let to;
  switch (e.key) {
    case "ArrowDown":
      to = visible[i + 1];
      break;
    case "ArrowUp":
      to = visible[i - 1];
      break;
    case "Home":
      to = visible[0];
      break;
    case "End":
      to = visible.at(-1);
      break;
    case "ArrowRight":
      if (!d) break;
      if (!d.open) {
        d.open = true;
        it.setAttribute("aria-expanded", "true");
      } else to = items(root).find((el) => d.contains(el) && el !== it);
      break;
    case "ArrowLeft":
      if (d?.open) {
        d.open = false;
        it.setAttribute("aria-expanded", "false");
      } else {
        const up = it.closest("li").parentElement.closest("li");
        to = up?.querySelector(":scope > details > summary");
      }
      break;
    default:
      return;
  }
  e.preventDefault();
  if (!to) return;
  to.focus();
  // A folder that just opened is not focusable until its next frame.
  if (document.activeElement !== to)
    requestAnimationFrame(() => requestAnimationFrame(() => to.focus()));
});

(window.tsunami ??= {}).tree = { filter };
