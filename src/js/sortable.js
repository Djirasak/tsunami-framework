// Sortable: the children of .sortable are dragged into a new order. The drag
// is SortableJS, which is not in tsunami.js: load dist/sortable.min.js with its
// own <script> before the Tsunami script on a page that has a .sortable.
// Rows are the children (li, tr in a tbody, .item, a grid cell). A
// .sortable-handle inside the rows (a button with an aria-label) is the only
// place that drags; with none, the whole row drags. A control marked
// [data-sortable-ignore] never starts a drag. Options: data-disabled, and
// data-options (JSON) for any SortableJS option; functions go through
// window.tsunami.sortable.mount(el, options), which wins over data-options.
// Defaults: animation 150 (0 under prefers-reduced-motion), forceFallback,
// filter "[data-sortable-ignore]". Rows may carry data-id for toArray().
// ArrowUp / ArrowDown (and Left / Right in a grid) on a handle move its row one
// place, and a live region says "<label>, moved to position N of M".
// A bubbling tsunami:reorder (detail { item, id, oldIndex, newIndex }) fires
// from the list after a move by pointer or by key. It sends no `input` event:
// the order is not a form value, so a page that wants the save bar to see it
// writes the order to a hidden input and calls tsunami.saveBar.check(form).
// The element gets toArray(), sort(order), disabled and sortable (the
// SortableJS instance). API: window.tsunami.sortable = { mount(el, options?),
// get(el), destroy(el), toArray(el), sort(el, order), disabled(el, value?) }.

const states = new WeakMap(); // list -> { sortable }
const mounted = new Set(); // lists with a state, for removals
let status = null;

const MEMBERS = ["toArray", "sort", "disabled", "sortable"];

const defaults = (el) => ({
  animation: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150,
  forceFallback: true,
  handle: [...el.querySelectorAll(".sortable-handle")].some(
    (h) => h.closest(".sortable") === el,
  )
    ? ".sortable-handle"
    : null,
  filter: "[data-sortable-ignore]",
  preventOnFilter: false,
  disabled: el.hasAttribute("data-disabled"),
});

const fromData = (el) => {
  if (!el.dataset.options) return {};
  try {
    return JSON.parse(el.dataset.options);
  } catch (error) {
    console.error("Tsunami sortable: data-options is not valid JSON.", error);
    return {};
  }
};

function destroy(el) {
  const state = states.get(el);
  if (!state) return;
  states.delete(el);
  mounted.delete(el);
  for (const name of MEMBERS) delete el[name];
  state.sortable.destroy();
}

function mount(el, options = {}) {
  if (!window.Sortable)
    throw new Error(
      "A .sortable needs SortableJS: load dist/sortable.min.js with its own <script> before the Tsunami script.",
    );
  destroy(el);
  const sortable = new window.Sortable(el, {
    ...defaults(el),
    ...fromData(el),
    ...options,
  });
  states.set(el, { sortable });
  mounted.add(el);
  Object.defineProperties(el, {
    toArray: { configurable: true, value: () => sortable.toArray() },
    sort: { configurable: true, value: (order) => sortable.sort(order, true) },
    disabled: {
      configurable: true,
      get: () => sortable.option("disabled"),
      set(value) {
        sortable.option("disabled", Boolean(value));
        el.toggleAttribute("data-disabled", Boolean(value));
      },
    },
    sortable: { configurable: true, get: () => sortable },
  });
}

const upgrade = (el) => {
  // The picture of a row under the pointer is a copy: leave it alone.
  if (states.has(el) || el.closest(".sortable-fallback")) return;
  try {
    mount(el);
  } catch (error) {
    console.error(error.message, el);
  }
};
const all = (root) => root.querySelectorAll?.(".sortable").forEach(upgrade);

const scan = () => {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => all(document), {
      once: true,
    });
  else all(document);
};
scan();
new MutationObserver((list) =>
  list.forEach((m) => {
    if (document.readyState === "loading") return;
    if (m.type === "attributes") {
      const state = states.get(m.target);
      if (state)
        state.sortable.option(
          "disabled",
          m.target.hasAttribute("data-disabled"),
        );
      return;
    }
    m.addedNodes.forEach((n) => {
      if (n.matches?.(".sortable")) upgrade(n);
      all(n);
    });
    m.removedNodes.forEach((n) => {
      if (n.isConnected) return;
      for (const el of mounted) if (!el.isConnected) destroy(el);
    });
  }),
).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-disabled"],
});

const reorder = (el, item, oldIndex, newIndex) =>
  el.dispatchEvent(
    new CustomEvent("tsunami:reorder", {
      bubbles: true,
      detail: {
        item,
        id: item.getAttribute(states.get(el).sortable.option("dataIdAttr")),
        oldIndex,
        newIndex,
      },
    }),
  );

// SortableJS sends update, choose and unchoose as bubbling DOM events from the
// list; `from` is the list the row belongs to, so a nested list is not mixed up.
document.addEventListener("update", (e) => {
  if (e.from && e.target === e.from && states.has(e.from))
    reorder(e.from, e.item, e.oldDraggableIndex, e.newDraggableIndex);
});

// A table row dragged as a copy keeps the widths of its cells.
document.addEventListener("choose", (e) => {
  if (!states.has(e.target)) return;
  for (const cell of e.item.cells ?? [])
    cell.style.width = `${cell.getBoundingClientRect().width}px`;
});
document.addEventListener("unchoose", (e) => {
  if (!states.has(e.target)) return;
  for (const cell of e.item.cells ?? []) {
    cell.style.width = "";
    if (cell.getAttribute("style") === "") cell.removeAttribute("style");
  }
});

const STEP = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };

document.addEventListener("keydown", (e) => {
  const step = STEP[e.key];
  const handle = step && e.target.closest?.(".sortable-handle");
  const list = handle?.closest(".sortable");
  const state = list && states.get(list);
  if (!state || state.sortable.option("disabled")) return;
  const rows = [...list.children].filter(
    (c) =>
      window.Sortable.utils.closest(
        c,
        state.sortable.option("draggable"),
        list,
        false,
      ) === c,
  );
  const row = rows.find((c) => c.contains(handle));
  const from = rows.indexOf(row);
  const to = from + step;
  if (!row || to < 0 || to >= rows.length) return;
  e.preventDefault();
  if (to < from) rows[to].before(row);
  else rows[to].after(row);
  handle.focus();
  if (!status) {
    status = document.createElement("div");
    status.className = "sortable-status";
    status.setAttribute("aria-live", "polite");
    document.body.append(status);
  }
  status.textContent = `${handle.getAttribute("aria-label") || row.textContent.trim()}, moved to position ${to + 1} of ${rows.length}`;
  reorder(list, row, from, to);
});

// The API works on a list the observer has not reached yet.
const ready = (el) => {
  if (!states.has(el)) mount(el);
  return el;
};

(window.tsunami ??= {}).sortable = {
  mount,
  get: (el) => states.get(el)?.sortable ?? null,
  destroy,
  toArray: (el) => ready(el).toArray(),
  sort: (el, order) => ready(el).sort(order),
  disabled(el, value) {
    if (value !== undefined) ready(el).disabled = value;
    return Boolean(ready(el).disabled);
  },
};
