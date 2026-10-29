// JSON viewer: .json-viewer > textarea holds the JSON (the form sends it).
// The script adds a toolbar and a foldable tree; data-view="parsed|raw", data-collapsed.
// API: window.tsunami.jsonViewer = { expand(el), collapse(el), view(el, v?), value(el, v?) }.
const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};

function part(t, text) {
  const s = el("span", { textContent: text });
  s.dataset.t = t;
  return s;
}

function render(value, key, depth, collapsed) {
  const label =
    key === undefined
      ? []
      : [part("key", JSON.stringify(key)), part("punct", ": ")];
  if (value === null || typeof value !== "object") {
    const type = value === null ? "null" : typeof value;
    return el("div", {}, ...label, part(type, JSON.stringify(value)));
  }
  const list = Array.isArray(value);
  const entries = list
    ? value.map((v) => [undefined, v])
    : Object.entries(value);
  const count = `${entries.length} ${list ? "items" : "keys"}`;
  const [open, close] = list ? ["[", "]"] : ["{", "}"];
  const details = el(
    "details",
    { open: !(collapsed && depth > 0) },
    el(
      "summary",
      {},
      ...label,
      part("punct", open),
      part("count", ` ${count} ${close}`),
    ),
    el(
      "ul",
      {},
      ...entries.map(([k, v]) =>
        el("li", {}, render(v, k, depth + 1, collapsed)),
      ),
    ),
    part("punct", close),
  );
  return details;
}

function draw(viewer, collapsed = viewer.hasAttribute("data-collapsed")) {
  const area = viewer.querySelector(":scope > textarea");
  const tree = viewer.querySelector(":scope > [data-tree]");
  let data;
  try {
    data = JSON.parse(area.value);
  } catch {
    return false;
  }
  tree.replaceChildren(render(data, undefined, 0, collapsed));
  return true;
}

function setView(viewer, view) {
  const area = viewer.querySelector(":scope > textarea");
  const tree = viewer.querySelector(":scope > [data-tree]");
  const btn = viewer.querySelector(":scope > header [data-json-toggle]");
  if (view === "raw") {
    try {
      area.value = JSON.stringify(JSON.parse(area.value), null, 2);
    } catch {
      // Not JSON: leave the text as typed.
    }
  } else if (!draw(viewer)) {
    area.setAttribute("aria-invalid", "true");
    view = "raw";
  }
  viewer.dataset.view = view;
  area.hidden = view !== "raw";
  tree.hidden = view === "raw";
  btn.textContent =
    view === "raw" ? "แสดงแบบ tree Show parsed" : "แสดง raw Show raw";
}

function upgrade(viewer) {
  if (viewer.querySelector(":scope > [data-tree]")) return;
  const toggle = el("button", { type: "button", className: "btn" });
  toggle.dataset.jsonToggle = "";
  toggle.dataset.variant = "ghost";
  toggle.dataset.size = "sm";
  viewer.prepend(el("header", {}, toggle));
  viewer.querySelector(":scope > textarea").before(el("div", { hidden: true }));
  viewer.querySelector(":scope > div").dataset.tree = "";
  setView(viewer, viewer.dataset.view === "raw" ? "raw" : "parsed");
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
  const btn = e.target.closest(".json-viewer > header [data-json-toggle]");
  if (!btn) return;
  const viewer = btn.closest(".json-viewer");
  setView(viewer, viewer.dataset.view === "raw" ? "parsed" : "raw");
});

document.addEventListener("input", (e) => {
  if (e.target.matches(".json-viewer > textarea"))
    e.target.removeAttribute("aria-invalid");
});

const fold = (viewer, open) =>
  viewer
    .querySelectorAll(":scope > [data-tree] details")
    .forEach((d, i) => (d.open = open || i === 0));

(window.tsunami ??= {}).jsonViewer = {
  expand: (viewer) => fold(viewer, true),
  collapse: (viewer) => fold(viewer, false),
  view(viewer, v) {
    if (v !== undefined) setView(viewer, v === "raw" ? "raw" : "parsed");
    return viewer.dataset.view;
  },
  value(viewer, v) {
    const area = viewer.querySelector(":scope > textarea");
    if (v !== undefined) {
      area.value = typeof v === "string" ? v : JSON.stringify(v);
      setView(viewer, viewer.dataset.view === "raw" ? "raw" : "parsed");
    }
    return area.value;
  },
};
