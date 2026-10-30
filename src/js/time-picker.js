// Time picker: .time-picker is built by this script into separate segments
// (hour, minute, optional second, optional AM/PM), each a small
// input[role="spinbutton"], plus a hidden input that holds the time as
// HH:MM (or HH:MM:SS) and is what a form sends.
// Options on .time-picker: data-name (name of the hidden input; or write your
// own input[type=hidden] inside), value (the starting time, HH:MM or HH:MM:SS;
// an own hidden input's value wins), data-seconds (adds seconds),
// data-hour12 (1-12 and AM/PM; the value is still 24 hour), data-min /
// data-max (HH:MM, the limits), data-step (minutes, for the arrow keys on the
// minute segment), disabled (dims it and turns the segments off).
// Segments: ArrowUp / ArrowDown change the value and wrap, Home / End jump to
// the lowest / highest, digits are typed (the segment moves on once it cannot
// take another digit), Backspace / Delete empty it, ArrowLeft / ArrowRight and
// ":" move between segments, A / P set AM / PM. The first change in an empty
// field fills the other segments with 00 (and AM). A typed time outside
// min / max is moved to the nearest limit when focus leaves the field.
// Pasting "HH:MM" fills the whole field.
// Events: a bubbling `input` and `change` from the hidden input, and a
// bubbling `tsunami:timechange` (detail { value }) from .time-picker, each
// when the value changes. The value is "" while any segment is empty.
// API: window.tsunami.timePicker = { mount(el), get(el), set(el, value) };
// the element also gets value (read and set; "" clears; an invalid time
// clears) and data-time-picker-initialized="true".

const ROOT = ".time-picker";
const SEGMENT = `${ROOT} > input[role="spinbutton"]`;
const states = new WeakMap(); // root -> state
const TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const pad = (n) => String(n).padStart(2, "0");

// "09:30" or "09:30:15" -> [9, 30, 15], or null.
function parse(text) {
  const m = TIME.exec(String(text ?? "").trim());
  if (!m) return null;
  const t = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  return t[0] < 24 && t[1] < 60 && t[2] < 60 ? t : null;
}
const seconds = (t) => t[0] * 3600 + t[1] * 60 + t[2];

function mount(root) {
  if (states.has(root)) return;
  const withSeconds = root.hasAttribute("data-seconds");
  const hour12 = root.hasAttribute("data-hour12");
  const hidden =
    root.querySelector(':scope > input[type="hidden"]') ??
    root.appendChild(Object.assign(document.createElement("input"), {
      type: "hidden",
      name: root.dataset.name ?? "",
    }));
  const start = hidden.defaultValue || root.getAttribute("value") || "";

  const keys = ["h", "m", ...(withSeconds ? ["s"] : []), ...(hour12 ? ["p"] : [])];
  const spec = {
    h: { label: "Hour", min: hour12 ? 1 : 0, max: hour12 ? 12 : 23 },
    m: { label: "Minute", min: 0, max: 59 },
    s: { label: "Second", min: 0, max: 59 },
    p: { label: "AM or PM", min: 0, max: 1 },
  };
  const state = {
    root,
    hidden,
    start,
    withSeconds,
    hour12,
    keys,
    spec,
    f: { h: null, m: null, s: null, p: null }, // p: true is PM
    buf: "", // digits typed into the current segment
    last: "",
    segs: {},
  };
  states.set(root, state);

  root.setAttribute("role", "group");
  if (!root.hasAttribute("aria-label")) root.setAttribute("aria-label", "Time");
  const parts = [];
  for (const key of keys) {
    const el = document.createElement("input");
    el.type = "text";
    el.autocomplete = "off";
    el.spellcheck = false;
    el.setAttribute("role", "spinbutton");
    el.setAttribute("aria-label", spec[key].label);
    el.setAttribute("aria-valuemin", spec[key].min);
    el.setAttribute("aria-valuemax", spec[key].max);
    el.dataset.segment = key;
    if (key === "p") el.readOnly = true;
    else el.inputMode = "numeric";
    state.segs[key] = el;
    if (key === "m" || key === "s")
      parts.push(
        Object.assign(document.createElement("span"), { textContent: ":" }),
      );
    if (key === "p")
      parts.push(
        Object.assign(document.createElement("span"), { textContent: " " }),
      );
    parts.push(el);
  }
  for (const span of parts) if (span.localName === "span") span.setAttribute("aria-hidden", "true");
  root.prepend(...parts);
  root.setAttribute("data-time-picker-initialized", "true");

  Object.defineProperty(root, "value", {
    configurable: true,
    get: () => state.last,
    set(v) {
      assign(state, parse(v));
    },
  });
  assign(state, parse(start), true);
  disable(state);
}

function destroy(root) {
  const state = states.get(root);
  if (!state) return;
  for (const el of root.querySelectorAll(':scope > [role="spinbutton"], :scope > span'))
    el.remove();
  delete root.value;
  root.removeAttribute("data-time-picker-initialized");
  states.delete(root);
}

const disable = (state) => {
  for (const el of Object.values(state.segs))
    el.disabled = state.root.hasAttribute("disabled");
};

// Put a [h, m, s] time (24 hour) into the segments, or empty them.
function assign(state, t, quiet = false) {
  const { f, hour12 } = state;
  if (!t) Object.assign(f, { h: null, m: null, s: null, p: null });
  else {
    f.h = hour12 ? t[0] % 12 || 12 : t[0];
    f.m = t[1];
    f.s = t[2];
    f.p = hour12 ? t[0] >= 12 : null;
  }
  state.buf = "";
  write(state, quiet);
}

// The whole time from the segments, or null while any is empty.
function time(state) {
  const { f, hour12, withSeconds, keys } = state;
  if (keys.some((k) => f[k] === null)) return null;
  const h = hour12 ? (f.h % 12) + (f.p ? 12 : 0) : f.h;
  return [h, f.m, withSeconds ? f.s : 0];
}

// An empty segment next to a filled one gets its first value.
function fill(state) {
  const { f, hour12, keys } = state;
  if (keys.every((k) => f[k] === null)) return;
  for (const k of keys)
    if (f[k] === null) f[k] = k === "h" ? (hour12 ? 12 : 0) : k === "p" ? false : 0;
}

function limits(state) {
  const { min, max } = state.root.dataset;
  return [min && parse(min), max && parse(max)];
}

// Move a complete time inside data-min / data-max.
function clamp(state) {
  const t = time(state);
  if (!t) return;
  const [lo, hi] = limits(state);
  if (lo && seconds(t) < seconds(lo)) assign(state, lo);
  else if (hi && seconds(t) > seconds(hi)) assign(state, hi);
}

// Show the segments and, when the time changed, send the events.
function write(state, quiet) {
  const { root, hidden, f, keys, segs, spec } = state;
  for (const key of keys) {
    const el = segs[key];
    const v = f[key];
    const empty = v === null;
    const text = key === "p" ? (v ? "PM" : "AM") : pad(v ?? 0);
    el.value = empty ? "--" : text;
    el.setAttribute("aria-valuetext", empty ? "Empty" : text);
    if (empty) el.removeAttribute("aria-valuenow");
    else el.setAttribute("aria-valuenow", key === "p" ? Number(v) : v);
    el.setAttribute("aria-valuemin", spec[key].min);
    el.setAttribute("aria-valuemax", spec[key].max);
  }
  const t = time(state);
  const value = t
    ? `${pad(t[0])}:${pad(t[1])}${state.withSeconds ? `:${pad(t[2])}` : ""}`
    : "";
  if (value === state.last) return;
  state.last = value;
  hidden.value = value;
  if (quiet) return;
  hidden.dispatchEvent(new Event("input", { bubbles: true }));
  hidden.dispatchEvent(new Event("change", { bubbles: true }));
  root.dispatchEvent(
    new CustomEvent("tsunami:timechange", { bubbles: true, detail: { value } }),
  );
}

// ArrowUp / ArrowDown: the next value, wrapping; minutes follow data-step.
function bump(state, key, dir) {
  const { f, spec } = state;
  if (key === "p") f.p = f.p === null ? dir < 0 : !f.p;
  else {
    const { min, max } = spec[key];
    const step =
      key === "m" ? Math.max(1, Number(state.root.dataset.step) || 1) : 1;
    const top = Math.floor((max - min) / step) * step + min;
    let v = f[key];
    if (v === null) v = dir > 0 ? min : top;
    else {
      v = dir > 0 ? (Math.floor((v - min) / step) + 1) * step + min
        : (Math.ceil((v - min) / step) - 1) * step + min;
      if (v > top) v = min;
      else if (v < min) v = top;
    }
    f[key] = v;
  }
  fill(state);
  state.buf = "";
  clamp(state);
  write(state);
}

function set(state, key, v) {
  state.f[key] = v;
  fill(state);
  state.buf = "";
  write(state);
}

// A typed digit: two digits, or one that cannot take a second, end the segment.
function type(state, key, digit) {
  const { min, max } = state.spec[key];
  const buf = state.bufKey === key && state.buf.length < 2 ? state.buf + digit : digit;
  const n = Math.min(max, Math.max(min, Number(buf)));
  const done = buf.length === 2 || Number(buf) * 10 > max;
  state.f[key] = n;
  fill(state);
  write(state);
  state.buf = done ? "" : buf;
  state.bufKey = key;
  if (done) move(state, key, 1);
}

function move(state, key, by) {
  const next = state.keys[state.keys.indexOf(key) + by];
  if (next) state.segs[next].focus();
}

const of = (el) => {
  const root = el?.closest?.(ROOT);
  return root && states.get(root);
};

document.addEventListener("focusin", (e) => {
  if (!e.target.matches?.(SEGMENT)) return;
  const state = of(e.target);
  if (state) {
    state.buf = "";
    e.target.select();
  }
});
document.addEventListener("click", (e) => {
  if (e.target.matches?.(SEGMENT)) e.target.select();
  else if (e.target.matches?.(ROOT)) states.get(e.target)?.segs.h.focus();
});
document.addEventListener("focusout", (e) => {
  const state = of(e.target);
  if (!state || !e.target.matches(SEGMENT)) return;
  state.buf = "";
  if (!state.root.contains(e.relatedTarget)) clamp(state);
});

document.addEventListener("keydown", (e) => {
  if (!e.target.matches?.(SEGMENT) || e.ctrlKey || e.metaKey || e.altKey) return;
  const state = of(e.target);
  if (!state) return;
  const key = e.target.dataset.segment;
  const { min, max } = state.spec[key];
  const handled = (fn) => {
    e.preventDefault();
    fn();
  };
  switch (e.key) {
    case "ArrowUp": return handled(() => bump(state, key, 1));
    case "ArrowDown": return handled(() => bump(state, key, -1));
    case "ArrowLeft": return handled(() => move(state, key, -1));
    case "ArrowRight": return handled(() => move(state, key, 1));
    case "Home": return handled(() => (key === "p" ? set(state, key, false) : set(state, key, min)));
    case "End": return handled(() => (key === "p" ? set(state, key, true) : set(state, key, max)));
    case "Backspace":
    case "Delete":
      return handled(() => {
        state.f[key] = null;
        state.buf = "";
        write(state);
      });
    case ":":
    case ".":
    case ",":
    case " ":
      return handled(() => move(state, key, 1));
    case "a": case "A": case "p": case "P":
      if (key === "p") handled(() => set(state, key, e.key.toLowerCase() === "p"));
      else e.preventDefault();
  }
});

// Typed text arrives here, so a phone keyboard works too.
document.addEventListener("beforeinput", (e) => {
  if (!e.target.matches?.(SEGMENT)) return;
  const state = of(e.target);
  if (!state || e.inputType.startsWith("insertFromPaste")) return;
  e.preventDefault();
  const key = e.target.dataset.segment;
  if (e.inputType.startsWith("delete")) {
    state.f[key] = null;
    write(state);
  } else
    for (const ch of e.data ?? "") if (/\d/.test(ch)) type(state, key, ch);
});

document.addEventListener("paste", (e) => {
  if (!e.target.matches?.(SEGMENT)) return;
  const state = of(e.target);
  const text = (e.clipboardData?.getData("text") ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(text);
  if (!state || !m) return e.preventDefault();
  e.preventDefault();
  let h = Number(m[1]);
  if (m[4]) h = (h % 12) + (m[4].toLowerCase() === "pm" ? 12 : 0);
  const t = parse(`${h}:${m[2]}:${m[3] ?? "00"}`);
  if (t) {
    assign(state, t);
    clamp(state);
  }
});

// A form reset puts the starting time back (it runs before fields restore).
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    for (const root of e.target.querySelectorAll(ROOT)) {
      const state = states.get(root);
      if (state) assign(state, parse(state.start));
    }
  });
});

const mountAll = (scope = document) => {
  if (scope.matches?.(ROOT)) mount(scope);
  for (const root of scope.querySelectorAll(ROOT)) mount(root);
};

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mountAll());
else mountAll();

new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === "attributes") {
      const state = states.get(r.target);
      if (state) disable(state);
      continue;
    }
    for (const n of r.addedNodes) if (n.nodeType === 1) mountAll(n);
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["disabled"],
});

(window.tsunami ??= {}).timePicker = {
  mount,
  destroy,
  get: (el) => states.get(el)?.last ?? null,
  set: (el, value) => {
    const state = states.get(el);
    if (state) assign(state, parse(value));
  },
};
