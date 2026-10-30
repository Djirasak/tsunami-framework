// Stepper: <div class="stepper"> > <ol> of steps (a <button> each) + one <section> per step, in order.
// Steps get data-state="done|current|upcoming" and aria-current="step"; one panel shows at a time.
// On .stepper: data-linear (headers after the current step are disabled), data-validate (the
// current panel's fields must pass reportValidity() before moving forward). On a panel:
// data-optional (not validated). In a panel: [data-next] and [data-prev] buttons; Enter in a
// field acts as Next unless the panel has a submit button.
// Events (bubble from the stepper): tsunami:stepchange { index, step, panel }, tsunami:stepcomplete { index }.
// API: tsunami.stepper.go(el, index) / next(el) / prev(el) / index(el); el is the stepper or a selector.
const FIELD = "input, select, textarea";

const root = (el) =>
  (typeof el === "string" ? document.querySelector(el) : el)?.closest?.(
    ".stepper",
  );
const itemsOf = (s) => [...s.querySelectorAll(":scope > ol > li")];
const panelsOf = (s) => [...s.querySelectorAll(":scope > section")];
const current = new WeakMap();
let uid = 0;

const index = (el) => {
  const s = root(el);
  return s ? (current.get(s) ?? 0) : -1;
};

function render(s, i, focus) {
  const items = itemsOf(s);
  const panels = panelsOf(s);
  const linear = s.hasAttribute("data-linear");
  items.forEach((li, n) => {
    const b = li.querySelector(":scope > button");
    if (!b) return;
    b.dataset.state = n < i ? "done" : n === i ? "current" : "upcoming";
    if (n === i) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
    if (linear && n > i) b.setAttribute("aria-disabled", "true");
    else b.removeAttribute("aria-disabled");
    const p = panels[n];
    if (!p) return;
    p.hidden = n !== i;
    b.id ||= `stepper-${++uid}`;
    p.setAttribute("role", "group");
    p.setAttribute("aria-labelledby", b.id);
  });
  if (!focus) return;
  const p = panels[i];
  const target =
    p?.querySelector("h2, h3, h4, h5, h6") ??
    [...(p?.querySelectorAll(FIELD) ?? [])].find((f) => f.type !== "hidden") ??
    p;
  if (target && !target.matches(FIELD)) target.tabIndex = -1;
  target?.focus();
}

function valid(s) {
  const p = panelsOf(s)[index(s)];
  if (!p || !s.hasAttribute("data-validate") || p.hasAttribute("data-optional"))
    return true;
  for (const f of p.querySelectorAll(FIELD)) {
    if (!f.willValidate) continue;
    if (!f.reportValidity()) return false;
  }
  return true;
}

function show(s, i, focus) {
  touched.add(s);
  current.set(s, i);
  render(s, i, focus);
  s.dispatchEvent(
    new CustomEvent("tsunami:stepchange", {
      bubbles: true,
      detail: { index: i, step: itemsOf(s)[i], panel: panelsOf(s)[i] },
    }),
  );
}

// Moves to a step. Going forward checks the current panel first (every panel on the way when
// linear); going back never does. Returns false when a panel blocked it or the index is out of range.
function go(el, to, focus = true) {
  const s = root(el);
  const last = s ? itemsOf(s).length - 1 : -1;
  if (!s || !Number.isInteger(to) || to < 0 || to > last) return false;
  const from = index(s);
  if (to === from) return true;
  if (to < from) return show(s, to, focus), true;
  if (!s.hasAttribute("data-linear")) {
    if (!valid(s)) return false;
    return show(s, to, focus), true;
  }
  for (let i = from; i < to; i++) {
    if (!valid(s)) return false;
    show(s, i + 1, focus);
  }
  return true;
}

function next(el, focus = true) {
  const s = root(el);
  if (!s) return false;
  const i = index(s);
  if (i < itemsOf(s).length - 1) return go(s, i + 1, focus);
  if (!valid(s)) return false;
  s.dispatchEvent(
    new CustomEvent("tsunami:stepcomplete", { bubbles: true, detail: { index: i } }),
  );
  return true;
}

const prev = (el, focus = true) => {
  const s = root(el);
  return s ? go(s, index(s) - 1, focus) : false;
};

document.addEventListener("click", (e) => {
  const b = e.target.closest?.(
    ".stepper > ol > li > button, .stepper [data-next], .stepper [data-prev]",
  );
  if (!b) return;
  const s = b.closest(".stepper");
  if (b.matches("[data-next]")) {
    if (!next(s) && b.type === "submit") e.preventDefault();
  } else if (b.matches("[data-prev]")) {
    e.preventDefault();
    prev(s);
  } else {
    e.preventDefault();
    if (b.getAttribute("aria-disabled") !== "true")
      go(s, itemsOf(s).indexOf(b.parentElement));
  }
});

document.addEventListener("keydown", (e) => {
  const f = e.target.closest?.(".stepper > section input, .stepper > section select");
  // Enter in a plain field means Next. A field that is part of a component
  // (tag input, phone input, time picker, select or autocomplete search) uses
  // Enter itself, and so does a key press another handler already took.
  const own = f?.closest(
    ".tag-input, .phone-input, .time-picker, .select, .autocomplete, .date-picker",
  );
  if (
    e.key === "Enter" &&
    f &&
    !own &&
    !e.defaultPrevented &&
    /^(?!checkbox|radio|submit|button)/.test(f.type)
  ) {
    const p = f.closest(".stepper > section");
    if (p.querySelector('[type="submit"]')) return;
    e.preventDefault();
    next(p);
    return;
  }
  const b = e.target.closest?.(".stepper > ol > li > button");
  if (!b) return;
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const all = [...b.closest("ol").querySelectorAll(":scope > li > button")].filter(
    (x) => x.getAttribute("aria-disabled") !== "true",
  );
  const n = all.indexOf(b);
  const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
  const rtl = getComputedStyle(b).direction === "rtl";
  const step =
    e.key === "ArrowUp" || e.key === "ArrowDown"
      ? forward ? 1 : -1
      : (e.key === "ArrowRight") !== rtl ? 1 : -1;
  const to =
    e.key === "Home" ? all[0] : e.key === "End" ? all.at(-1) : all[(n + step + all.length) % all.length];
  e.preventDefault();
  to?.focus();
});

// Until the user moves, a stepper is set up again whenever its markup grows (it may still be parsing).
const touched = new WeakSet();
function setup(node) {
  if (node.nodeType !== 1) return;
  for (const s of node.matches(".stepper")
    ? [node]
    : node.querySelectorAll(".stepper")) {
    if (touched.has(s)) continue;
    const i = itemsOf(s).findIndex((li) =>
      li.querySelector(
        ':scope > button:is([data-state="current"], [aria-current="step"])',
      ),
    );
    current.set(s, Math.max(i, 0));
    render(s, Math.max(i, 0), false);
  }
}

function start() {
  setup(document.documentElement);
  new MutationObserver((records) => {
    for (const r of records) {
      const s = r.target.closest?.(".stepper");
      if (s) setup(s);
      r.addedNodes.forEach(setup);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

(window.tsunami ??= {}).stepper = { go, next, prev, index };
