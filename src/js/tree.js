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

(window.tsunami ??= {}).tree = { filter };
