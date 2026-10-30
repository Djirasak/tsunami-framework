// Command: .command is a search field (header input) over a [role="menu"] of
// items (links or buttons). The script filters the items as you type, keeps one
// item .active (arrows move it, Enter clicks it) and, in a dialog.command-dialog,
// closes the dialog when an item is chosen. Items: [role="menuitem"], matched by
// data-label and data-keywords; aria-disabled skips one; the script sets
// aria-hidden on the ones filtered out.
// Filters: data-results groups, data-filter keys, a [data-filters] button row,
// a data-filter-list group listed after "/", a header [data-filter-badge],
// data-limit with a data-more item, aria-busy on a results group, data-tab-filter.
// No methods or events: listen for the click on an item. See docs/command.html.
const ITEM = '[role="menuitem"]';
const limits = new WeakMap();
let uid = 0;

const input = (root) => root.querySelector(":scope > header input");
const menu = (root) => root.querySelector(':scope > [role="menu"]');
const all = (root) => [...menu(root).querySelectorAll(ITEM)];
const off = (item) =>
  item.hasAttribute("disabled") ||
  item.getAttribute("aria-disabled") === "true";
const hidden = (item) => item.getAttribute("aria-hidden") === "true";
const items = (root) => all(root).filter((i) => !off(i) && !hidden(i));
const active = (root) =>
  all(root).find((i) => i.classList.contains("active")) || null;
const more = (root) => menu(root).querySelector(`${ITEM}[data-more]`);
const step = (root) => Number(menu(root).dataset.limit) || Infinity;

function setActive(root, item) {
  active(root)?.classList.remove("active");
  input(root).removeAttribute("aria-activedescendant");
  if (!item) return;
  item.classList.add("active");
  item.id ||= `command-item-${++uid}`;
  input(root).setAttribute("aria-activedescendant", item.id);
}

// Hide what the typed text does not match.
function search(root, text) {
  const q = text.trim().toLowerCase();
  for (const item of all(root)) {
    const name = (item.dataset.label || item.textContent).trim().toLowerCase();
    const words = (item.dataset.keywords || "").toLowerCase();
    item.setAttribute(
      "aria-hidden",
      String(!name.includes(q) && !words.includes(q)),
    );
  }
}

// Show what the field and the chosen filter allow, then pick the first item.
function refresh(root) {
  const box = input(root);
  const list = menu(root);
  const slash = box.value.startsWith("/");
  const text = slash ? box.value.slice(1) : box.value;
  const typed = text.trim() !== "";
  const chosen = root.dataset.filter || "";
  const showMore = more(root);
  const limit = limits.get(root) ?? step(root);
  const counts = {};
  const shown = [];
  search(root, text);
  for (const item of all(root)) {
    const group = item.closest('[role="group"]');
    let show = !hidden(item) && !slash && !chosen;
    if (group?.hasAttribute("data-filter-list")) show = !hidden(item) && slash;
    if (group?.hasAttribute("data-results")) {
      show =
        !hidden(item) &&
        !slash &&
        (typed || chosen !== "") &&
        (chosen === "" || group.dataset.filter === chosen);
    }
    if (group?.getAttribute("aria-busy") === "true") show = false;
    if (item === showMore) show = false;
    if (show && group?.hasAttribute("data-results")) {
      counts[group.dataset.filter] = (counts[group.dataset.filter] || 0) + 1;
      shown.push(item);
      if (shown.length > limit) show = false;
    }
    item.setAttribute("aria-hidden", String(!show));
  }
  const busy =
    !slash &&
    (typed || chosen !== "") &&
    [...list.querySelectorAll('[data-results][aria-busy="true"]')].some(
      (g) => chosen === "" || g.dataset.filter === chosen,
    );
  if (busy) list.setAttribute("aria-busy", "true");
  else list.removeAttribute("aria-busy");
  if (showMore) {
    const left = shown.length - limit;
    showMore.setAttribute("aria-hidden", String(left <= 0));
    showMore.querySelector("[data-count]").textContent = Math.min(
      left,
      Number(showMore.dataset.more),
    );
  }
  const filters = root.querySelector(":scope > [data-filters]");
  if (filters) {
    filters.hidden = slash || chosen !== "";
    for (const button of filters.querySelectorAll("[data-filter]")) {
      const n = counts[button.dataset.filter] || 0;
      button.hidden = typed ? n === 0 : !button.hasAttribute("data-suggested");
      button.querySelector("[data-count]").textContent = typed ? n : "";
    }
  }
  setActive(root, items(root)[0] || null);
}

// Choose a filter ("" removes it): the badge names it, the field starts over.
function choose(root, key) {
  const box = input(root);
  if (key) root.dataset.filter = key;
  else delete root.dataset.filter;
  if (box.value.startsWith("/")) box.value = "";
  const badge = root.querySelector(":scope > header [data-filter-badge]");
  if (badge) {
    badge.hidden = !key;
    const name = root.querySelector(
      `[data-filters] [data-filter="${key}"] [data-name]`,
    );
    badge.querySelector("[data-name]").textContent = name
      ? name.textContent
      : "";
  }
  limits.set(root, step(root));
  refresh(root);
  box.focus();
}

function upgrade(root) {
  if (root.dataset.commandInitialized || !input(root) || !menu(root)) return;
  root.dataset.commandInitialized = "true";
  limits.set(root, step(root));
  refresh(root);
}

const scan = (node) => {
  if (node.matches?.(".command")) upgrade(node);
  node.querySelectorAll?.(".command").forEach(upgrade);
};
scan(document);
new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === "childList") r.addedNodes.forEach(scan);
    // A results group went busy or idle: show or hide "Searching...".
    else {
      const root = r.target.closest?.(".command");
      if (root?.dataset.commandInitialized && r.target !== menu(root))
        refresh(root);
    }
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["aria-busy"],
});

const rootOf = (el) => {
  const root = el.closest?.(".command");
  return root?.dataset.commandInitialized ? root : null;
};

document.addEventListener("input", (e) => {
  const root =
    e.target.matches?.(".command > header input") && rootOf(e.target);
  if (!root) return;
  limits.set(root, step(root));
  refresh(root);
});

document.addEventListener("keydown", (e) => {
  const root =
    e.target.matches?.(".command > header input") && rootOf(e.target);
  if (!root) return;
  const list = items(root);
  const i = list.indexOf(active(root));
  let next;
  if (e.key === "ArrowDown") next = list[Math.min(i + 1, list.length - 1)];
  if (e.key === "ArrowUp")
    next = list[i === -1 ? list.length - 1 : Math.max(i - 1, 0)];
  if (next) {
    e.preventDefault();
    setActive(root, next);
    next.scrollIntoView({ block: "nearest" });
    return;
  }
  if (e.key === "Backspace" && e.target.value === "" && root.dataset.filter) {
    e.preventDefault();
    choose(root, "");
    return;
  }
  const tab = active(root)?.dataset.tabFilter;
  if (e.key === "Tab" && !e.shiftKey && tab) {
    e.preventDefault();
    e.target.value = "";
    choose(root, tab);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    active(root)?.click();
  }
});

// The pointer moves the active item too.
document.addEventListener("mousemove", (e) => {
  const item = e.target.closest?.(`.command > [role="menu"] ${ITEM}`);
  const root = item && rootOf(item);
  if (root && item !== active(root) && items(root).includes(item))
    setActive(root, item);
});

document.addEventListener("click", (e) => {
  const button = e.target.closest?.(".command > [data-filters] [data-filter]");
  if (button && rootOf(button))
    return choose(rootOf(button), button.dataset.filter);
  const remove = e.target.closest?.(
    ".command > header [data-filter-badge] button",
  );
  if (remove && rootOf(remove)) return choose(rootOf(remove), "");
  const item = e.target.closest?.(`.command > [role="menu"] ${ITEM}`);
  const root = item && rootOf(item);
  if (!root || !items(root).includes(item)) return;
  if (item.dataset.filter) return choose(root, item.dataset.filter);
  if (item === more(root)) {
    const from = limits.get(root);
    limits.set(root, from + Number(item.dataset.more));
    refresh(root);
    const results = items(root).filter((i) => i.closest("[data-results]"));
    setActive(root, results[from] || null);
    results[from]?.scrollIntoView({ block: "nearest" });
    input(root).focus();
    return;
  }
  root.closest("dialog.command-dialog")?.close();
});

// A command dialog opens with the field focused.
document.addEventListener(
  "toggle",
  (e) => {
    if (e.newState === "open" && e.target.matches?.("dialog.command-dialog"))
      e.target.querySelector(".command > header input")?.focus();
  },
  true,
);
