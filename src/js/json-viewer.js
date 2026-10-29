// JSON viewer: .json-viewer > textarea holds the JSON (the form sends it).
// The script adds .json-viewer-toolbar (Show raw / Collapse all / Expand all)
// and ul.json-viewer-tree; data-view="parsed|raw" and data-collapsed set the start.
// API: window.tsunami.jsonViewer = { expand(el), collapse(el), view(el, v?), value(el, v?) }.
const h = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const kind = (v) =>
  v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

// One li per value: `key: value,`; objects and lists are a details whose
// summary is `key: {` and whose close bracket follows the details.
function node(value, key, comma) {
  const li = h("li");
  if (key !== undefined) li.append(h("span", "json-viewer-key", key), ": ");
  const type = kind(value);
  const entries =
    type === "array"
      ? value.map((v) => [undefined, v])
      : type === "object"
        ? Object.entries(value)
        : null;
  const [open, close] = type === "array" ? ["[", "]"] : ["{", "}"];
  if (!entries) {
    li.append(h("span", `json-viewer-${type}`, JSON.stringify(value)));
  } else if (!entries.length) {
    li.append(open + close);
  } else {
    const details = h("details");
    details.open = true;
    details.dataset.kind = type;
    const summary = h("summary");
    summary.append(...li.childNodes, open);
    const list = h("ul");
    entries.forEach(([k, v], i) =>
      list.append(node(v, k, i < entries.length - 1)),
    );
    details.append(summary, list);
    li.append(details, h("span", "json-viewer-close", close));
  }
  if (comma) li.append(",");
  return li;
}

const parts = (viewer) => {
  const bar = viewer.querySelector(":scope > .json-viewer-toolbar");
  return {
    area: viewer.querySelector(":scope > textarea"),
    tree: viewer.querySelector(":scope > .json-viewer-tree"),
    toggle: bar.querySelector("[data-json-viewer='toggle']"),
    folds: bar.querySelectorAll(
      "[data-json-viewer='collapse'], [data-json-viewer='expand']",
    ),
  };
};

const parse = (text) => {
  try {
    return { value: JSON.parse(text) };
  } catch {
    return undefined;
  }
};

// Folded: every details except the outermost one is closed.
function fold(viewer, folded) {
  const { tree } = parts(viewer);
  tree.querySelectorAll("details").forEach((d) => {
    d.open = !folded || d.parentElement.parentElement === tree;
  });
}

function showRaw(viewer) {
  const { area, tree, toggle, folds } = parts(viewer);
  const parsed = parse(area.value);
  if (parsed) area.value = JSON.stringify(parsed.value, null, 2);
  viewer.dataset.view = "raw";
  area.hidden = false;
  tree.hidden = true;
  folds.forEach((b) => (b.hidden = true));
  toggle.textContent = "Show parsed";
}

function showParsed(viewer) {
  const { area, tree, toggle, folds } = parts(viewer);
  const parsed = parse(area.value);
  if (!parsed) {
    area.setAttribute("aria-invalid", "true");
    showRaw(viewer);
    return;
  }
  area.removeAttribute("aria-invalid");
  tree.replaceChildren(node(parsed.value, undefined, false));
  if (viewer.hasAttribute("data-collapsed")) fold(viewer, true);
  viewer.dataset.view = "parsed";
  area.hidden = true;
  tree.hidden = false;
  folds.forEach((b) => (b.hidden = false));
  toggle.textContent = "Show raw";
}

const show = (viewer, view) =>
  view === "raw" ? showRaw(viewer) : showParsed(viewer);

function upgrade(viewer) {
  if (viewer.querySelector(":scope > .json-viewer-tree")) return;
  if (!viewer.querySelector(":scope > textarea")) return;
  const bar = h("div", "json-viewer-toolbar");
  for (const [action, label] of [
    ["toggle", "Show raw"],
    ["collapse", "Collapse all"],
    ["expand", "Expand all"],
  ]) {
    const b = h("button", "btn", label);
    b.type = "button";
    b.dataset.size = "sm";
    b.dataset.jsonViewer = action;
    bar.append(b);
  }
  viewer.prepend(bar);
  viewer.append(h("ul", "json-viewer-tree"));
  show(viewer, viewer.dataset.view);
}

const all = (root) => root.querySelectorAll?.(".json-viewer").forEach(upgrade);
all(document);
new MutationObserver((list) =>
  list.forEach((m) =>
    m.addedNodes.forEach((n) =>
      n.matches?.(".json-viewer") ? upgrade(n) : all(n),
    ),
  ),
).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".json-viewer-toolbar [data-json-viewer]");
  if (!btn) return;
  const viewer = btn.closest(".json-viewer");
  const action = btn.dataset.jsonViewer;
  if (action === "toggle")
    show(viewer, viewer.dataset.view === "raw" ? "parsed" : "raw");
  else fold(viewer, action === "collapse");
});

document.addEventListener("input", (e) => {
  if (e.target.matches(".json-viewer > textarea"))
    e.target.removeAttribute("aria-invalid");
});

// The API upgrades a viewer first, so it works before the observer has run.
const ready = (viewer) => (upgrade(viewer), viewer);

(window.tsunami ??= {}).jsonViewer = {
  expand: (viewer) => fold(ready(viewer), false),
  collapse: (viewer) => fold(ready(viewer), true),
  view(viewer, v) {
    if (v !== undefined) show(ready(viewer), v);
    return viewer.dataset.view;
  },
  value(viewer, v) {
    const { area } = parts(ready(viewer));
    if (v !== undefined) {
      area.value = typeof v === "string" ? v : JSON.stringify(v);
      show(viewer, viewer.dataset.view);
    }
    return area.value;
  },
};
