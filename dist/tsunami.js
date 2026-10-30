/* tsunami v0.1.1 */
// src/js/theme.js
var KEY = "tsunami-theme";
var root = document.documentElement;
var prefersDark = matchMedia("(prefers-color-scheme: dark)");
var get = () => root.dataset.theme === "dark" || root.dataset.theme !== "light" && prefersDark.matches ? "dark" : "light";
var choice = () => root.dataset.theme === "dark" || root.dataset.theme === "light" ? root.dataset.theme : "system";
function announce() {
  document.dispatchEvent(new CustomEvent("tsunami:themechange", {
    bubbles: true,
    detail: { theme: get(), choice: choice() }
  }));
}
function sync() {
  const chosen = choice();
  for (const btn of document.querySelectorAll("[data-theme-toggle]")) {
    const value = btn.dataset.themeToggle;
    if (value)
      btn.setAttribute("aria-pressed", String(value === chosen));
  }
}
function set(name) {
  const next = name === "light" || name === "dark" ? name : null;
  if (next)
    root.dataset.theme = next;
  else
    delete root.dataset.theme;
  try {
    if (next)
      localStorage.setItem(KEY, next);
    else
      localStorage.removeItem(KEY);
  } catch {}
  sync();
  announce();
}
var toggle = () => set(get() === "dark" ? "light" : "dark");
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-theme-toggle]");
  if (!btn)
    return;
  if (btn.dataset.themeToggle)
    set(btn.dataset.themeToggle);
  else
    toggle();
});
prefersDark.addEventListener("change", () => {
  if (choice() === "system")
    announce();
});
(window.tsunami ??= {}).theme = { get, set, toggle };
try {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark")
    root.dataset.theme = saved;
} catch {}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", sync);
else
  sync();

// src/js/pressed.js
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[aria-pressed]:not([data-theme-toggle])");
  const group = btn?.closest("[data-pressed]");
  if (!group || btn.disabled || btn.getAttribute("aria-disabled") === "true")
    return;
  let pressed = true;
  if (group.dataset.pressed === "multiple") {
    pressed = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", String(pressed));
  } else {
    for (const other of group.querySelectorAll("[aria-pressed]")) {
      if (other.closest("[data-pressed]") === group)
        other.setAttribute("aria-pressed", String(other === btn));
    }
  }
  group.dispatchEvent(new CustomEvent("tsunami:pressedchange", {
    bubbles: true,
    detail: { button: btn, pressed }
  }));
});

// src/js/tabs.js
var TAB = ':is(.tabs, [data-tabs]) [role="tab"]';
var enabled = (t) => !t.disabled && t.getAttribute("aria-disabled") !== "true";
var listOf = (tab) => tab.closest('[role="tablist"]');
var tabsOf = (list) => [...list.querySelectorAll('[role="tab"]')].filter((t) => listOf(t) === list);
var panelOf = (tab) => document.getElementById(tab.getAttribute("aria-controls"));
function select(tab) {
  if (!tab || !enabled(tab))
    return;
  for (const t of tabsOf(listOf(tab))) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = panelOf(t);
    if (panel)
      panel.hidden = !on;
  }
}
function close(tab) {
  const list = listOf(tab);
  const panel = panelOf(tab);
  const ok = tab.dispatchEvent(new CustomEvent("tsunami:closetab", {
    bubbles: true,
    cancelable: true,
    detail: { tab, panel }
  }));
  if (!ok)
    return false;
  const tabs = tabsOf(list).filter((t) => t === tab || enabled(t));
  const i = tabs.indexOf(tab);
  const next = tabs[i + 1] ?? tabs[i - 1] ?? null;
  const selected = tab.getAttribute("aria-selected") === "true";
  tab.remove();
  panel?.remove();
  if (selected)
    select(next);
  return next;
}
document.addEventListener("click", (e) => {
  const tab = e.target.closest(TAB);
  if (tab) {
    if (e.target.closest("[data-close]")) {
      e.preventDefault();
      close(tab);
    } else if (!tab.hasAttribute("popovertarget")) {
      select(tab);
    }
    return;
  }
  const entry = e.target.closest(".dropdown[popover][id] :is(a, button)");
  if (!entry)
    return;
  const id = CSS.escape(entry.closest(".dropdown").id);
  select(document.querySelector(`[role="tab"][popovertarget="${id}"]`));
});
document.addEventListener("keydown", (e) => {
  const tab = e.target.closest(TAB);
  if (!tab)
    return;
  if (e.key === "Delete" && tab.querySelector("[data-close]")) {
    e.preventDefault();
    const next = close(tab);
    if (next)
      next.focus();
    return;
  }
  const list = listOf(tab);
  const vertical = list.getAttribute("aria-orientation") === "vertical";
  const tabs = tabsOf(list).filter(enabled);
  const i = tabs.indexOf(tab);
  const to = {
    [vertical ? "ArrowDown" : "ArrowRight"]: i + 1,
    [vertical ? "ArrowUp" : "ArrowLeft"]: i - 1,
    Home: 0,
    End: tabs.length - 1
  }[e.key];
  if (to === undefined)
    return;
  e.preventDefault();
  const next = tabs[(to + tabs.length) % tabs.length];
  select(next);
  next.focus();
});
(window.tsunami ??= {}).tabs = { select, close };

// src/js/sidebar.js
function set2(sidebar, collapsed) {
  sidebar.dataset.collapsed = String(collapsed);
}
var collapse = (sidebar) => set2(sidebar, true);
var expand = (sidebar) => set2(sidebar, false);
var toggle2 = (sidebar) => set2(sidebar, sidebar.dataset.collapsed !== "true");
var commands = {
  "--collapse": collapse,
  "--expand": expand,
  "--toggle-collapsed": toggle2
};
document.addEventListener("command", (e) => {
  if (e.target.matches?.(".sidebar"))
    commands[e.command]?.(e.target);
}, true);
(window.tsunami ??= {}).sidebar = { collapse, expand, toggle: toggle2 };

// src/js/save-bar.js
var SKIP = "button, fieldset, output, object, [type=submit], [type=reset], [type=button], [type=image], dialog *, .select [role=combobox], [data-save-bar-ignore]";
var fields = (form) => [...form.elements].filter((el) => !el.matches(SKIP));
var snapshots = new WeakMap;
var autoHide = new WeakMap;
var leaving = new WeakSet;
var lastState = new WeakMap;
var fileKey = (el) => [...el.files].map((f) => `${f.name}:${f.size}:${f.lastModified}`).join("|");
var snapped = (el) => el.type === "hidden" || el.type === "file";
var current = (el) => el.type === "file" ? fileKey(el) : el.value;
function snapshot(form) {
  const values = new Map;
  const list = fields(form);
  for (const el of list)
    if (snapped(el))
      values.set(el, current(el));
  snapshots.set(form, { values, count: list.length });
}
function isDirty(form) {
  if (!snapshots.has(form))
    snapshot(form);
  const { values, count } = snapshots.get(form);
  const list = fields(form);
  if (list.length !== count)
    return true;
  return list.some((el) => {
    if (snapped(el))
      return current(el) !== (values.has(el) ? values.get(el) : "");
    if (el.type === "checkbox" || el.type === "radio")
      return el.checked !== el.defaultChecked;
    if (el.tagName === "SELECT")
      return [...el.options].some((o) => o.selected !== o.defaultSelected);
    if ("defaultValue" in el)
      return el.value !== el.defaultValue;
    return false;
  });
}
var barsFor = (form) => form?.id ? [...document.querySelectorAll(".save-bar[data-form]")].filter((bar) => bar.dataset.form === form.id) : [];
var formOf = (el) => {
  if (el instanceof HTMLFormElement)
    return el;
  const form = el?.dataset?.form && document.getElementById(el.dataset.form);
  return form instanceof HTMLFormElement ? form : null;
};
function check(target) {
  const form = formOf(target);
  if (!form)
    return false;
  const bars = barsFor(form);
  const dirty = isDirty(form);
  for (const bar of bars) {
    if (!autoHide.has(bar))
      autoHide.set(bar, bar.hidden);
    if (autoHide.get(bar))
      bar.hidden = !dirty;
    bar.dataset.dirty = String(dirty);
  }
  const was = lastState.get(form) ?? false;
  lastState.set(form, dirty);
  if (was !== dirty)
    form.dispatchEvent(new CustomEvent(dirty ? "tsunami:dirty" : "tsunami:clean", {
      bubbles: true,
      detail: { form, bars }
    }));
  return dirty;
}
function markClean(target) {
  const form = formOf(target);
  if (!form)
    return;
  for (const el of fields(form)) {
    if (el.type === "checkbox" || el.type === "radio")
      el.defaultChecked = el.checked;
    else if (el.tagName === "SELECT")
      for (const o of el.options)
        o.defaultSelected = o.selected;
    else if (!snapped(el) && "defaultValue" in el)
      el.defaultValue = el.value;
  }
  snapshot(form);
  check(form);
}
var watched = (form) => form && barsFor(form).length > 0;
document.addEventListener("focusin", (e) => {
  const form = e.target.form;
  if (watched(form) && !snapshots.has(form))
    snapshot(form);
});
var onEdit = (e) => {
  const form = e.target.form ?? (e.target instanceof HTMLFormElement && e.target);
  if (!watched(form))
    return;
  leaving.delete(form);
  check(form);
};
document.addEventListener("input", onEdit);
document.addEventListener("change", onEdit);
document.addEventListener("reset", (e) => {
  if (watched(e.target))
    setTimeout(() => check(e.target));
});
document.addEventListener("submit", (e) => {
  if (watched(e.target))
    markClean(e.target);
});
document.addEventListener("click", (e) => {
  const bar = e.target.closest?.(".save-bar[data-form]");
  if (bar && e.target.closest("a[href]")) {
    const form = formOf(bar);
    if (form)
      leaving.add(form);
  }
});
window.addEventListener("beforeunload", (e) => {
  for (const bar of document.querySelectorAll(".save-bar[data-form][data-warn-on-leave]")) {
    const form = formOf(bar);
    if (form && !leaving.has(form) && isDirty(form)) {
      e.preventDefault();
      e.returnValue = "";
      return;
    }
  }
});
for (const bar of document.querySelectorAll(".save-bar[data-form]"))
  check(bar);
(window.tsunami ??= {}).saveBar = { check, markClean };

// src/js/toast.js
var MAX = 3;
var DURATION = 5000;
var ICONS = {
  ok: "circle-check",
  danger: "circle-alert",
  warning: "triangle-alert",
  info: "info",
  neutral: "bell"
};
var state = new WeakMap;
var toaster;
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs))
    el.setAttribute(k, v);
  el.append(...kids);
  return el;
}
var toasts = () => toaster ? [...toaster.querySelectorAll(":scope > .toast")] : [];
var live = () => toasts().filter((t) => !t.hasAttribute("data-leaving"));
function place() {
  if (!toaster)
    return;
  const modals = document.querySelectorAll("dialog:modal");
  const host = modals[modals.length - 1] || document.body;
  if (toaster.parentNode !== host)
    host.append(toaster);
  if (toasts().length && !toaster.matches(":popover-open"))
    toaster.showPopover();
}
function container() {
  if (!toaster || !toaster.isConnected) {
    toaster = document.querySelector(".toaster[popover]");
    if (!toaster) {
      toaster = h("section", {
        class: "toaster",
        popover: "manual",
        "aria-live": "polite"
      });
      document.body.append(toaster);
    }
  }
  return toaster;
}
function finish(toast, reason) {
  const s = state.get(toast);
  if (!s || s.done)
    return;
  s.done = true;
  clearTimeout(s.timer);
  toast.setAttribute("data-leaving", "");
  toast.dispatchEvent(new CustomEvent("tsunami:toastclose", {
    bubbles: true,
    detail: { reason }
  }));
  let removed = false;
  const remove = () => {
    if (removed)
      return;
    removed = true;
    toast.remove();
    if (toaster && !toasts().length && toaster.matches(":popover-open"))
      toaster.hidePopover();
  };
  toast.addEventListener("transitionend", remove, { once: true });
  setTimeout(remove, 400);
}
function schedule(toast) {
  const s = state.get(toast);
  if (!s || s.done || !s.duration)
    return;
  const paused = s.hover || s.focus || document.hidden;
  if (paused && s.timer) {
    clearTimeout(s.timer);
    s.timer = 0;
    s.left -= Date.now() - s.started;
  } else if (!paused && !s.timer) {
    s.started = Date.now();
    s.timer = setTimeout(() => finish(toast, "timeout"), Math.max(s.left, 0));
  }
}
function toast(input = {}) {
  const o = typeof input === "string" ? { title: input } : input;
  const variant = o.variant;
  const duration = o.duration ?? (variant === "danger" ? 0 : DURATION);
  const root = container();
  if (o.id !== undefined && o.id !== null) {
    for (const t of toasts()) {
      if (t.dataset.toastId === String(o.id)) {
        finish(t, "api");
        t.remove();
      }
    }
  }
  const el = h("div", {
    class: "toast",
    role: variant === "danger" ? "alert" : "status"
  });
  if (variant)
    el.dataset.variant = variant;
  if (o.id !== undefined && o.id !== null)
    el.dataset.toastId = o.id;
  if (variant && ICONS[variant])
    el.append(h("i", { class: `icon icon-${ICONS[variant]}`, "aria-hidden": "true" }));
  const body = h("div");
  if (o.title)
    body.append(h("strong", {}, o.title));
  if (o.text)
    body.append(h("p", {}, o.text));
  el.append(body);
  const s = {
    duration,
    left: duration,
    started: 0,
    timer: 0,
    hover: false,
    focus: false,
    done: false
  };
  state.set(el, s);
  if (o.action?.label) {
    const btn = h("button", { type: "button", class: "btn", "data-size": "sm" }, o.action.label);
    btn.addEventListener("click", () => {
      o.action.onClick?.(el);
      finish(el, "action");
    });
    el.append(btn);
  }
  const close = h("button", {
    type: "button",
    class: "btn",
    "data-variant": "ghost",
    "data-size": "icon-xs",
    "aria-label": "Close"
  }, h("i", { class: "icon icon-x", "aria-hidden": "true" }));
  close.addEventListener("click", () => finish(el, "close"));
  el.append(close);
  el.addEventListener("pointerenter", () => {
    s.hover = true;
    schedule(el);
  });
  el.addEventListener("pointerleave", () => {
    s.hover = false;
    schedule(el);
  });
  el.addEventListener("focusin", () => {
    s.focus = true;
    schedule(el);
  });
  el.addEventListener("focusout", (e) => {
    if (el.contains(e.relatedTarget))
      return;
    s.focus = false;
    schedule(el);
  });
  el.dismiss = () => finish(el, "api");
  root.append(el);
  place();
  for (const t of live().slice(0, -MAX))
    finish(t, "api");
  schedule(el);
  el.dispatchEvent(new CustomEvent("tsunami:toast", { bubbles: true, detail: {} }));
  return el;
}
toast.clear = () => {
  for (const t of live())
    finish(t, "api");
};
document.addEventListener("visibilitychange", () => {
  for (const t of toasts())
    schedule(t);
});
document.addEventListener("click", (e) => {
  const btn = e.target.closest?.("[data-toast]");
  if (!btn || btn.disabled)
    return;
  const message = btn.dataset.toast;
  const title = btn.dataset.toastTitle;
  toast({
    title: title || message,
    text: title ? message : undefined,
    variant: btn.dataset.toastVariant
  });
});
new MutationObserver(() => place()).observe(document, {
  subtree: true,
  attributes: true,
  attributeFilter: ["open"]
});
(window.tsunami ??= {}).toast = toast;

// src/js/slider.js
function sync2(el) {
  const min = el.min === "" ? 0 : Number(el.min);
  const max = el.max === "" ? 100 : Number(el.max);
  const pct = max > min ? (Number(el.value) - min) / (max - min) * 100 : 0;
  el.style.setProperty("--value", `${pct}%`);
  if (!el.id)
    return;
  for (const out of document.querySelectorAll("output")) {
    if (out.htmlFor.contains(el.id))
      out.value = el.value;
  }
}
var syncAll = (root = document) => {
  for (const el of root.querySelectorAll(".slider"))
    sync2(el);
};
document.addEventListener("input", (e) => {
  if (e.target.matches?.(".slider"))
    sync2(e.target);
});
document.addEventListener("reset", (e) => setTimeout(() => syncAll(e.target)));
syncAll();
(window.tsunami ??= {}).slider = { sync: sync2 };

// src/js/image-field.js
var FIELD = ".image-field";
var parts = (field) => ({
  img: field.querySelector(":scope > img"),
  file: field.querySelector(':scope > input[type="file"]'),
  box: field.querySelector(':scope > input[type="checkbox"]')
});
document.addEventListener("click", (e) => {
  const btn = e.target.closest(`${FIELD} > [data-change], ${FIELD} > [data-clear]`);
  if (!btn)
    return;
  const field = btn.parentElement;
  const { img, file, box } = parts(field);
  if (btn.matches("[data-change]")) {
    file?.click();
    return;
  }
  if (img?.src.startsWith("blob:"))
    URL.revokeObjectURL(img.src);
  img?.removeAttribute("src");
  field.dataset.empty = "";
  if (box)
    box.checked = true;
  if (file) {
    file.value = "";
    file.dispatchEvent(new Event("input", { bubbles: true }));
    file.dispatchEvent(new Event("change", { bubbles: true }));
  }
  field.querySelector(":scope > [data-change]")?.focus();
});
document.addEventListener("change", (e) => {
  const file = e.target.closest(`${FIELD} > input[type="file"]`);
  const chosen = file?.files?.[0];
  if (!chosen)
    return;
  const field = file.parentElement;
  const { img, box } = parts(field);
  if (img) {
    if (img.src.startsWith("blob:"))
      URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(chosen);
  }
  delete field.dataset.empty;
  if (box)
    box.checked = false;
});

// src/js/dropzone.js
var ZONE = ".dropzone";
var FILE = "input[type='file']";
var inputOf = (e) => e.target.closest?.(ZONE)?.querySelector(`:scope > ${FILE}`);
var matches = (file, accept) => {
  const tokens = accept.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
  if (!tokens.length)
    return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((t) => t.startsWith(".") ? name.endsWith(t) : t.endsWith("/*") ? type.startsWith(t.slice(0, -1)) : type === t);
};
function check2(input, files) {
  const max = Number(input.closest(ZONE).dataset.maxSize) || Infinity;
  const accepted = [];
  const rejected = [];
  for (const file of files) {
    if (!matches(file, input.accept))
      rejected.push({ file, reason: "type" });
    else if (file.size > max)
      rejected.push({ file, reason: "size" });
    else
      accepted.push(file);
  }
  return { accepted, rejected };
}
var setFiles = (input, files) => {
  const transfer = new DataTransfer;
  for (const file of files)
    transfer.items.add(file);
  input.files = transfer.files;
};
var report = (input, rejected) => {
  if (!rejected.length)
    return;
  input.closest(ZONE).dispatchEvent(new CustomEvent("rejected", { bubbles: true, detail: { rejected } }));
};
var hasFiles = (e) => [...e.dataTransfer?.types ?? []].includes("Files");
for (const type of ["dragenter", "dragover"]) {
  document.addEventListener(type, (e) => {
    const input = inputOf(e);
    if (!input || !hasFiles(e))
      return;
    e.preventDefault();
    if (input.disabled) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "copy";
    input.closest(ZONE).dataset.dragging = "true";
  });
}
document.addEventListener("dragleave", (e) => {
  const zone = e.target.closest?.(ZONE);
  if (zone && !zone.contains(e.relatedTarget))
    delete zone.dataset.dragging;
});
document.addEventListener("drop", (e) => {
  const input = inputOf(e);
  if (!input || !hasFiles(e))
    return;
  e.preventDefault();
  delete input.closest(ZONE).dataset.dragging;
  if (input.disabled)
    return;
  let files = [...e.dataTransfer.files];
  if (!input.multiple)
    files = files.slice(0, 1);
  const { accepted, rejected } = check2(input, files);
  if (accepted.length) {
    setFiles(input, accepted);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  report(input, rejected);
});
document.addEventListener("change", (e) => {
  const input = e.target.closest?.(`${ZONE} > ${FILE}`);
  if (!input?.files.length)
    return;
  const { accepted, rejected } = check2(input, input.files);
  if (!rejected.length)
    return;
  setFiles(input, accepted);
  report(input, rejected);
}, true);

// src/js/select.js
var ROOT = ".select:not(select)";
var MSG = {
  empty: "No results",
  busy: "Searching…",
  more: "Loading more…",
  error: "Could not load results"
};
var S = new WeakMap;
var uid = 0;
var opened = null;
var typed = "";
var typedAt = 0;
function h2(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs))
    el.setAttribute(k, v);
  el.append(...kids);
  return el;
}
var label = (o) => o.dataset.label || o.label;
var chosen = (sel) => [...sel.selectedOptions].filter((o) => o.value);
var fire = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
var rootOf = (el) => el?.closest(ROOT);
function build(root) {
  const sel = root.querySelector(":scope > select");
  if (!sel || S.has(root))
    return;
  const id = `select-${++uid}`;
  const d = root.dataset;
  const multi = sel.multiple;
  const inControl = multi || "input" in d;
  const list = h2("div", { role: "listbox", id: `${id}-list` });
  if (multi)
    list.setAttribute("aria-multiselectable", "true");
  const pop = h2("div", { popover: "manual" });
  const header = root.querySelector(":scope > header");
  if (header)
    pop.append(header);
  let control, input;
  if (inControl) {
    input = h2("input", { type: "text", autocomplete: "off", form: "" });
    control = h2("div", {}, input);
  } else {
    control = h2("button", { type: "button", "aria-haspopup": "listbox" });
    control.append(h2("span"));
    if ("search" in d || "url" in d || "tags" in d) {
      input = h2("input", {
        type: "text",
        autocomplete: "off",
        form: "",
        placeholder: d.search || "Search"
      });
      input.setAttribute("aria-label", input.placeholder);
      const icon = h2("i", { class: "icon icon-search", "aria-hidden": "true" });
      pop.append(h2("div", { class: "input-group", "data-variant": "ghost" }, icon, input));
    }
  }
  const combo = inControl ? input : control;
  for (const el of input ? [combo, input] : [combo]) {
    el.setAttribute("role", "combobox");
    el.setAttribute("aria-expanded", "false");
    el.setAttribute("aria-controls", list.id);
  }
  const lab = sel.labels?.[0];
  if (lab) {
    lab.id ||= `${id}-label`;
    combo.setAttribute("aria-labelledby", lab.id);
    list.setAttribute("aria-labelledby", lab.id);
  } else if (sel.hasAttribute("aria-label")) {
    combo.setAttribute("aria-label", sel.getAttribute("aria-label"));
    list.setAttribute("aria-label", sel.getAttribute("aria-label"));
  }
  pop.append(list, h2("p", { role: "status" }));
  sel.tabIndex = -1;
  sel.setAttribute("aria-hidden", "true");
  root.append(control, pop);
  root.setAttribute("data-ready", "");
  S.set(root, {
    sel,
    multi,
    inControl,
    list,
    pop,
    control,
    input,
    combo,
    q: ""
  });
  paint(root);
}
function paint(root) {
  const st = S.get(root);
  if (!st)
    return;
  const { sel, control, input } = st;
  const on = chosen(sel);
  const ph = root.dataset.placeholder ?? sel.querySelector('option[value=""]')?.text;
  root.toggleAttribute("data-has-value", on.length > 0);
  if (st.multi) {
    for (const c of control.querySelectorAll(":scope > span"))
      c.remove();
    for (const o of on) {
      const x = h2("button", {
        type: "button",
        tabindex: "-1",
        "aria-label": `Remove ${label(o)}`
      });
      x.append(h2("i", { class: "icon icon-x", "aria-hidden": "true" }));
      x.option = o;
      input.before(h2("span", {}, label(o), x));
    }
    input.placeholder = on.length ? "" : ph ?? "";
  } else if (st.inControl) {
    input.placeholder = ph ?? "";
    if (root !== opened)
      input.value = on[0] ? label(on[0]) : "";
  } else {
    control.firstChild.textContent = on[0] ? label(on[0]) : ph ?? "";
  }
  (st.inControl ? input : control).disabled = sel.matches(":disabled");
  if (root === opened)
    render(root);
}
function render(root) {
  const st = S.get(root);
  const { sel, list, q } = st;
  const term = q.toLowerCase();
  let n = 0;
  const option = (o, parent) => {
    if (o.hidden)
      return;
    const text = label(o);
    const hay = `${text} ${o.dataset.text ?? ""}`.toLowerCase();
    if (term && !hay.includes(term))
      return;
    const el = h2("div", {
      role: "option",
      id: `${list.id}-${n++}`,
      "aria-selected": String(o.selected)
    });
    if (o.disabled)
      el.setAttribute("aria-disabled", "true");
    const av = o.dataset.avatar;
    if (av) {
      const a = h2("span", { class: "avatar", "data-size": "sm" });
      if (/[./]/.test(av))
        a.append(h2("img", { src: av, alt: "" }));
      else
        a.append(av);
      el.append(a);
    }
    const title = h2("span", {}, text);
    if (o.dataset.badge)
      title.append(h2("span", { class: "badge" }, o.dataset.badge));
    const body = h2("span", {}, title);
    if (o.dataset.text)
      body.append(h2("small", {}, o.dataset.text));
    el.append(body);
    el.option = o;
    parent.append(el);
  };
  const frag = document.createDocumentFragment();
  if ("tags" in root.dataset && q) {
    const exists = [...sel.options].some((o) => label(o).toLowerCase() === term);
    if (!exists) {
      const el = h2("div", {
        role: "option",
        id: `${list.id}-tag`,
        "aria-selected": "false"
      });
      el.append(h2("i", { class: "icon icon-plus", "aria-hidden": "true" }), h2("span", {}, q));
      el.tag = q;
      frag.append(el);
    }
  }
  for (const c of sel.children) {
    if (c.tagName !== "OPTGROUP") {
      option(c, frag);
      continue;
    }
    const gid = `${list.id}-g${n++}`;
    const g = h2("div", { role: "group", "aria-labelledby": gid });
    g.append(h2("strong", { id: gid }, c.label));
    for (const o of c.children)
      option(o, g);
    if (g.childElementCount > 1)
      frag.append(g);
  }
  list.replaceChildren(frag);
  const items = [...list.querySelectorAll('[role="option"]')];
  const busy = list.hasAttribute("aria-busy");
  st.pop.lastChild.textContent = list.hasAttribute("data-error") ? MSG.error : items.length ? list.hasAttribute("data-more") ? MSG.more : "" : busy ? MSG.busy : root.dataset.empty ?? MSG.empty;
  const prev = st.active;
  const keep = items.find((el) => prev && (el.option ?? el.tag) === prev);
  activate(root, keep ?? (q ? enabled2(root)[0] : items.find((el) => el.option?.selected && !st.multi)));
}
var enabled2 = (root) => [
  ...S.get(root).list.querySelectorAll('[role="option"]:not([aria-disabled="true"])')
];
function activate(root, el) {
  const st = S.get(root);
  st.list.querySelector("[data-active]")?.removeAttribute("data-active");
  st.active = el ? el.option ?? el.tag : null;
  for (const f of [st.combo, st.input]) {
    if (!f)
      continue;
    if (el)
      f.setAttribute("aria-activedescendant", el.id);
    else
      f.removeAttribute("aria-activedescendant");
  }
  if (!el)
    return;
  el.setAttribute("data-active", "");
  el.scrollIntoView({ block: "nearest" });
}
function place2(root) {
  const { pop, control } = S.get(root);
  const r = control.getBoundingClientRect();
  pop.style.minWidth = `${r.width}px`;
  const below = innerHeight - r.bottom;
  const up = below < pop.offsetHeight + 8 && r.top > below;
  pop.dataset.side = up ? "top" : "bottom";
  pop.style.top = `${up ? r.top - pop.offsetHeight - 4 : r.bottom + 4}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`;
}
function open(el) {
  const root = rootOf(el);
  const st = S.get(root);
  if (!st || root === opened || st.sel.matches(":disabled"))
    return;
  if (opened)
    close2(opened);
  opened = root;
  st.q = "";
  st.active = null;
  if (st.input && !st.inControl)
    st.input.value = "";
  st.pop.showPopover();
  for (const f of [st.combo, st.input])
    f?.setAttribute("aria-expanded", "true");
  render(root);
  place2(root);
  if (st.input)
    st.input.focus();
  if (root.dataset.url)
    load(root, 1);
  fire(root, "tsunami:select:open");
}
function close2(el, focus) {
  const root = rootOf(el);
  const st = S.get(root);
  if (!st || root !== opened)
    return;
  opened = null;
  st.abort?.abort();
  st.q = "";
  st.pop.hidePopover();
  for (const f of [st.combo, st.input]) {
    f?.setAttribute("aria-expanded", "false");
    f?.removeAttribute("aria-activedescendant");
  }
  if (st.multi)
    st.input.value = "";
  paint(root);
  if (focus)
    st.combo.focus();
  fire(root, "tsunami:select:close");
}
function emit(root) {
  const { sel } = S.get(root);
  for (const t of ["input", "change"])
    sel.dispatchEvent(new Event(t, { bubbles: true }));
  fire(root, "tsunami:select:change", {
    value: value(root),
    selected: chosen(sel).map((o) => ({ value: o.value, label: label(o) }))
  });
}
function choose(root, o) {
  const st = S.get(root);
  if (typeof o === "string") {
    o = new Option(o, o);
    o.dataset.tag = "";
    st.sel.append(o);
  }
  if (o.disabled)
    return;
  if (st.multi) {
    o.selected = !o.selected;
    st.q = st.input.value = "";
    st.active = o;
    emit(root);
    if (root.dataset.url)
      load(root, 1);
  } else {
    const changed = !o.selected;
    o.selected = true;
    close2(root, true);
    if (changed)
      emit(root);
  }
}
async function load(root, page) {
  const st = S.get(root);
  const { sel, list } = st;
  st.abort?.abort();
  const ac = st.abort = new AbortController;
  const url = new URL(root.dataset.url.replace("{page}", page), location.href);
  if (st.q)
    url.searchParams.set("q", st.q);
  url.searchParams.set("page", page);
  list.setAttribute("aria-busy", "true");
  list.removeAttribute("data-error");
  if (page === 1)
    render(root);
  let more = false;
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok)
      throw new Error(`${res.status} ${url}`);
    const data = await res.json();
    if (page === 1) {
      for (const o of [...sel.options])
        if (o.value) {
          if (o.selected)
            o.hidden = true;
          else
            o.remove();
        }
    }
    for (const { id, text } of data.results ?? []) {
      const v = String(id);
      const o = [...sel.options].find((x) => x.value === v);
      if (o)
        o.hidden = false;
      sel.append(o ?? new Option(text, v));
    }
    more = !!data.pagination?.more;
    st.page = page;
  } catch (e) {
    if (ac.signal.aborted)
      return;
    console.error(e);
    list.setAttribute("data-error", "");
    for (const o of [...sel.options])
      if (!o.selected && o.value)
        o.remove();
  }
  list.removeAttribute("aria-busy");
  list.toggleAttribute("data-more", more);
  if (root !== opened)
    return;
  render(root);
  place2(root);
  if (more && list.scrollHeight - list.clientHeight - list.scrollTop < 50)
    load(root, page + 1);
}
function value(el, v) {
  const root = rootOf(el);
  const { sel, multi } = S.get(root);
  if (v === undefined)
    return multi ? chosen(sel).map((o) => o.value) : sel.value;
  const want = [v].flat().map(String);
  const before = String(value(root));
  for (const o of sel.options)
    o.selected = want.includes(o.value);
  if (String(value(root)) !== before)
    emit(root);
}
function refresh(el) {
  const root = rootOf(el);
  build(root);
  paint(root);
}
(window.tsunami ??= {}).select = { open, close: close2, value, refresh };
var scan = () => document.querySelectorAll(ROOT).forEach(build);
new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true
});
scan();
document.addEventListener("click", (e) => {
  const root = rootOf(e.target);
  const st = S.get(root);
  if (!st)
    return;
  const x = e.target.closest("button");
  if (x?.option) {
    x.option.selected = false;
    emit(root);
    return;
  }
  const opt = e.target.closest('[role="option"]');
  if (opt) {
    if (opt.getAttribute("aria-disabled") !== "true")
      choose(root, opt.option ?? opt.tag);
    return;
  }
  if (!st.control.contains(e.target))
    return;
  if (root === opened && !st.inControl)
    close2(root, true);
  else {
    open(root);
    st.input?.focus();
  }
});
document.addEventListener("mousedown", (e) => {
  const st = S.get(rootOf(e.target));
  if (st?.pop.contains(e.target) && !e.target.closest("input, header"))
    e.preventDefault();
});
document.addEventListener("pointerdown", (e) => {
  if (opened && !opened.contains(e.target))
    close2(opened);
});
document.addEventListener("pointermove", (e) => {
  const opt = e.target.closest?.('[role="option"]');
  const root = rootOf(opt);
  if (root && opt.getAttribute("aria-disabled") !== "true")
    activate(root, opt);
});
document.addEventListener("focusout", (e) => {
  const root = rootOf(e.target);
  if (root && root === opened && e.relatedTarget && !root.contains(e.relatedTarget))
    close2(root);
});
document.addEventListener("focusin", (e) => {
  const st = S.get(e.target.parentElement);
  if (st?.sel === e.target)
    st.combo.focus();
});
document.addEventListener("input", (e) => {
  const root = rootOf(e.target);
  const st = S.get(root);
  if (e.target !== st?.input)
    return;
  for (const o of st.sel.querySelectorAll("option[data-tag]"))
    if (!o.selected)
      o.remove();
  open(root);
  st.q = st.input.value.trim();
  st.active = null;
  render(root);
  if (root.dataset.url)
    load(root, 1);
});
document.addEventListener("keydown", (e) => {
  const root = rootOf(e.target);
  const st = S.get(root);
  if (!st || e.target !== st.combo && e.target !== st.input)
    return;
  const k = e.key;
  const onButton = e.target === st.control;
  if (k === "Backspace" && st.multi && !st.input.value) {
    const last = chosen(st.sel).at(-1);
    if (last) {
      last.selected = false;
      emit(root);
    }
    return;
  }
  const char = onButton && k.length === 1 && !e.ctrlKey && !e.metaKey;
  if (root !== opened) {
    const go = /^Arrow(Down|Up)$/.test(k) || onButton && /^(Enter| )$/.test(k);
    if (!go && !char)
      return;
    e.preventDefault();
    open(root);
    if (char && st.input) {
      st.input.value = k;
      st.input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (!char || st.input)
      return;
  }
  const typing = e.timeStamp - typedAt < 500;
  const items = enabled2(root);
  const i = items.findIndex((el) => el.hasAttribute("data-active"));
  const move = (to) => {
    e.preventDefault();
    activate(root, items[Math.max(0, Math.min(items.length - 1, to))]);
  };
  if (k === "ArrowDown")
    move(i < 0 ? 0 : i + 1);
  else if (k === "ArrowUp")
    move(i < 0 ? items.length - 1 : i - 1);
  else if (onButton && k === "Home")
    move(0);
  else if (onButton && k === "End")
    move(items.length - 1);
  else if (k === "Enter" || k === " " && onButton && !typing) {
    e.preventDefault();
    const el = items[i];
    if (el)
      choose(root, el.option ?? el.tag);
  } else if (k === "Escape") {
    e.preventDefault();
    close2(root, true);
  } else if (char) {
    e.preventDefault();
    typed = (typing ? typed : "") + k.toLowerCase();
    typedAt = e.timeStamp;
    const hit = items.find((el) => ` ${el.textContent.toLowerCase()}`.includes(` ${typed}`));
    if (hit)
      activate(root, hit);
  }
});
document.addEventListener("change", (e) => paint(e.target.parentElement));
document.addEventListener("reset", (e) => setTimeout(() => {
  for (const root of e.target.querySelectorAll(ROOT))
    paint(root);
}));
addEventListener("resize", () => opened && place2(opened));
document.addEventListener("scroll", (e) => {
  if (!opened)
    return;
  const { list, page } = S.get(opened);
  if (e.target !== list)
    return place2(opened);
  const near = list.scrollHeight - list.clientHeight - list.scrollTop < 50;
  if (near && list.hasAttribute("data-more") && !list.hasAttribute("aria-busy"))
    load(opened, page + 1);
}, true);

// src/js/autocomplete.js
var ROOT2 = ".autocomplete";
var S2 = new WeakMap;
var off = new WeakSet;
var uid2 = 0;
function h3(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs))
    el.setAttribute(k, v);
  el.append(...kids);
  return el;
}
var rootOf2 = (el) => el?.closest?.(ROOT2);
var stOf = (el) => {
  const st = S2.get(rootOf2(el));
  return st?.input === el ? st : null;
};
var item = (x) => typeof x === "object" && x ? {
  value: String(x.value ?? x.label ?? x.text ?? ""),
  label: String(x.label ?? x.value ?? ""),
  text: x.text === undefined || x.text === null ? "" : String(x.text)
} : { value: String(x), label: String(x), text: "" };
var num = (v, d) => v === undefined || v === "" || isNaN(v) ? d : Number(v);
var minLength = (root) => num(root.dataset.minLength, 1);
var limit = (root) => num(root.dataset.limit, 8) || 8;
var opened2 = (st) => st.pop.matches(":popover-open");
var attrs = ["autocomplete", "aria-autocomplete"];
function build2(root, source) {
  if (S2.has(root) || off.has(root))
    return;
  const input = root.querySelector("input");
  if (!input)
    return;
  const id = `autocomplete-${++uid2}`;
  const list = h3("div", { role: "listbox", id: `${id}-list` });
  const pop = h3("div", { popover: "manual" }, list);
  S2.set(root, {
    input,
    list,
    pop,
    datalist: input.list ?? root.querySelector("datalist"),
    link: input.getAttribute("list"),
    prev: attrs.map((k) => input.getAttribute(k)),
    source,
    cache: new Map
  });
  input.removeAttribute("list");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", list.id);
  const lab = input.labels?.[0];
  if (lab) {
    lab.id ||= `${id}-label`;
    list.setAttribute("aria-labelledby", lab.id);
  } else if (input.hasAttribute("aria-label")) {
    list.setAttribute("aria-label", input.getAttribute("aria-label"));
  }
  root.append(pop);
}
function destroy(root) {
  const st = S2.get(root);
  if (!st)
    return;
  close3(root);
  st.pop.remove();
  const { input } = st;
  for (const k of ["role", "aria-expanded", "aria-controls"])
    input.removeAttribute(k);
  attrs.forEach((k, i) => {
    if (st.prev[i] === null)
      input.removeAttribute(k);
    else
      input.setAttribute(k, st.prev[i]);
  });
  if (st.link !== null)
    input.setAttribute("list", st.link);
  S2.delete(root);
  off.add(root);
}
function mount(root, opts = {}) {
  destroy(root);
  off.delete(root);
  build2(root, opts.source);
}
async function fetchItems(root, q) {
  const st = S2.get(root);
  if (!st.source && !root.dataset.url)
    return [...st.datalist?.options ?? []].filter((o) => !o.disabled && o.value).map((o) => item({
      value: o.value,
      label: o.getAttribute("label") || o.textContent.trim() || o.value,
      text: o.dataset.text
    }));
  if (st.cache.has(q))
    return st.cache.get(q);
  st.abort?.abort();
  const ac = st.abort = new AbortController;
  let data;
  if (st.source)
    data = await st.source(q, { signal: ac.signal });
  else {
    const url = new URL(root.dataset.url, location.href);
    if (q)
      url.searchParams.set("q", q);
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok)
      throw new Error(`${res.status} ${url}`);
    data = await res.json();
  }
  const items = (data ?? []).map(item);
  st.cache.set(q, items);
  return items;
}
function update(root, now) {
  const st = S2.get(root);
  const { input } = st;
  clearTimeout(st.timer);
  const q = input.value.trim();
  if (input.disabled || input.readOnly || q.length < minLength(root))
    return close3(root);
  const remote = st.source || root.dataset.url;
  const run = async () => {
    const mine = st.run = {};
    if (remote)
      busy(st, true);
    let items;
    try {
      items = await fetchItems(root, q);
    } catch (e) {
      if (st.run !== mine)
        return;
      console.error(e);
      return close3(root);
    }
    if (st.run !== mine)
      return;
    busy(st, false);
    if (document.activeElement === input)
      show(root, items, q);
  };
  if (remote && !now && !st.cache.has(q))
    st.timer = setTimeout(run, 200);
  else
    run();
}
function busy(st, on) {
  st.list.toggleAttribute("aria-busy", on);
  if (on)
    st.input.setAttribute("aria-busy", "true");
  else
    st.input.removeAttribute("aria-busy");
}
function show(root, items, q) {
  const st = S2.get(root);
  const term = q.toLowerCase();
  const found = items.filter((i) => `${i.label} ${i.value} ${i.text}`.toLowerCase().includes(term)).slice(0, limit(root));
  if (!found.length)
    return close3(root);
  const frag = document.createDocumentFragment();
  found.forEach((i, n) => {
    const title = h3("span");
    const at = term ? i.label.toLowerCase().indexOf(term) : -1;
    if (at < 0)
      title.append(i.label);
    else
      title.append(i.label.slice(0, at), h3("mark", {}, i.label.slice(at, at + term.length)), i.label.slice(at + term.length));
    const body = h3("span", {}, title);
    if (i.text)
      body.append(h3("small", {}, i.text));
    const el = h3("div", { role: "option", id: `${st.list.id}-${n}` }, body);
    el.item = i;
    frag.append(el);
  });
  st.list.replaceChildren(frag);
  activate2(root, null);
  if (!opened2(st))
    st.pop.showPopover();
  st.input.setAttribute("aria-expanded", "true");
  place3(root);
}
function close3(root) {
  const st = S2.get(root);
  if (!st)
    return;
  clearTimeout(st.timer);
  st.run = null;
  st.abort?.abort();
  busy(st, false);
  if (opened2(st))
    st.pop.hidePopover();
  st.input.setAttribute("aria-expanded", "false");
  st.input.removeAttribute("aria-activedescendant");
}
function activate2(root, el) {
  const { list, input } = S2.get(root);
  list.querySelector("[data-active]")?.removeAttribute("data-active");
  if (el) {
    el.setAttribute("data-active", "");
    input.setAttribute("aria-activedescendant", el.id);
    el.scrollIntoView({ block: "nearest" });
  } else
    input.removeAttribute("aria-activedescendant");
}
function place3(root) {
  const { pop, input } = S2.get(root);
  const r = (input.closest(".input-group") ?? input).getBoundingClientRect();
  pop.style.minWidth = `${r.width}px`;
  const below = innerHeight - r.bottom;
  const up = below < pop.offsetHeight + 8 && r.top > below;
  pop.dataset.side = up ? "top" : "bottom";
  pop.style.top = `${up ? r.top - pop.offsetHeight - 4 : r.bottom + 4}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`;
}
function pick(root, i) {
  const st = S2.get(root);
  st.picking = true;
  st.input.value = i.value;
  close3(root);
  for (const t of ["input", "change"])
    st.input.dispatchEvent(new Event(t, { bubbles: true }));
  st.input.dispatchEvent(new CustomEvent("tsunami:autocomplete", {
    bubbles: true,
    detail: { value: i.value, item: i }
  }));
  st.picking = false;
}
(window.tsunami ??= {}).autocomplete = { mount, destroy };
var scan2 = () => document.querySelectorAll(ROOT2).forEach((root) => build2(root));
new MutationObserver(scan2).observe(document.documentElement, {
  childList: true,
  subtree: true
});
scan2();
document.addEventListener("input", (e) => {
  const st = stOf(e.target);
  if (st && !st.picking)
    update(rootOf2(e.target));
});
document.addEventListener("focusin", (e) => {
  const root = rootOf2(e.target);
  if (stOf(e.target) && minLength(root) === 0)
    update(root, true);
});
document.addEventListener("click", (e) => {
  const root = rootOf2(e.target);
  const st = S2.get(root);
  if (!st)
    return;
  const opt = e.target.closest('[role="option"]');
  if (opt?.item && st.pop.contains(opt))
    pick(root, opt.item);
  else if (e.target === st.input && !opened2(st) && minLength(root) === 0)
    update(root, true);
});
document.addEventListener("mousedown", (e) => {
  if (S2.get(rootOf2(e.target))?.pop.contains(e.target))
    e.preventDefault();
});
document.addEventListener("pointermove", (e) => {
  const opt = e.target.closest?.('[role="option"]');
  const root = rootOf2(opt);
  if (root && S2.get(root)?.pop.contains(opt))
    activate2(root, opt);
});
document.addEventListener("focusout", (e) => {
  if (stOf(e.target))
    close3(rootOf2(e.target));
});
document.addEventListener("keydown", (e) => {
  const st = stOf(e.target);
  if (!st || e.isComposing)
    return;
  const root = rootOf2(e.target);
  const k = e.key;
  if (!opened2(st)) {
    if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault();
      update(root, true);
    }
    return;
  }
  const els = [...st.list.querySelectorAll('[role="option"]')];
  const i = els.findIndex((el) => el.hasAttribute("data-active"));
  const move = (to) => {
    e.preventDefault();
    activate2(root, els[Math.max(0, Math.min(els.length - 1, to))]);
  };
  if (k === "ArrowDown")
    move(i + 1);
  else if (k === "ArrowUp")
    move(i < 0 ? els.length - 1 : i - 1);
  else if (k === "Enter") {
    if (els[i]) {
      e.preventDefault();
      pick(root, els[i].item);
    } else
      close3(root);
  } else if (k === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    close3(root);
  } else if (k === "Tab")
    close3(root);
});
var replace = (skip) => {
  for (const root of document.querySelectorAll(ROOT2)) {
    const st = S2.get(root);
    if (st && opened2(st) && !st.list.contains(skip))
      place3(root);
  }
};
addEventListener("resize", () => replace());
document.addEventListener("scroll", (e) => replace(e.target), true);

// src/js/table.js
var SORT_BUTTON = ".table th[aria-sort] > button";
var ROW_BOX = '.table tbody tr > td:first-child > input[type="checkbox"]';
var ALL_BOX = '.table thead tr > th:first-child > input[type="checkbox"]';
var EMPTY = "[data-table-empty]";
var rowsOf = (table) => [...table.tBodies].flatMap((b) => [...b.rows].filter((r) => !r.matches(EMPTY)));
var states = new WeakMap;
var texts = new WeakMap;
var rowTexts = (row) => {
  let list = texts.get(row);
  if (!list) {
    list = [...row.cells].map((c) => c.textContent.trim().toLowerCase());
    texts.set(row, list);
  }
  return list;
};
var debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};
function controls(table, selector, attr) {
  const own = [...document.querySelectorAll(`${selector}[${attr}]`)];
  const card = table.closest(".card");
  return own.filter((el) => {
    const id = el.getAttribute(attr);
    return id ? id === table.id : card?.contains(el);
  });
}
var cellValue = (row, i) => {
  const cell = row.cells[i];
  if (!cell)
    return "";
  return (cell.dataset.sortValue ?? cell.textContent).trim();
};
var toNumber = (s) => {
  const n = s.replace(/[^\d.+-]/g, "");
  return n === "" || !/\d/.test(n) ? NaN : Number(n);
};
function detectType(values) {
  const filled = values.filter((v) => v !== "" && v !== "-");
  if (!filled.length)
    return "text";
  if (filled.every((v) => /^[^\p{L}\d/:]*\d[\d,.\s]*[^\p{L}\d/:]*$/u.test(v)))
    return "number";
  if (filled.every((v) => !Number.isNaN(Date.parse(v))))
    return "date";
  return "text";
}
function compareBy(type) {
  if (type === "number" || type === "date") {
    const parse = type === "number" ? toNumber : Date.parse;
    return (a, b) => {
      const x = parse(a);
      const y = parse(b);
      if (Number.isNaN(x))
        return Number.isNaN(y) ? 0 : 1;
      if (Number.isNaN(y))
        return -1;
      return x - y;
    };
  }
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base"
  });
  return (a, b) => collator.compare(a, b);
}
function sort(table, columnIndex, direction = "ascending") {
  const th = table.tHead?.rows[0]?.cells[columnIndex];
  const event = new CustomEvent("tsunami:sort", {
    bubbles: true,
    cancelable: true,
    detail: { column: columnIndex, direction, header: th }
  });
  if (!table.dispatchEvent(event))
    return false;
  for (const cell of table.tHead?.rows[0]?.cells ?? []) {
    if (cell.hasAttribute("aria-sort"))
      cell.setAttribute("aria-sort", cell === th ? direction : "none");
  }
  for (const body of table.tBodies) {
    const rows = [...body.rows].filter((r) => !r.matches(EMPTY));
    const values = rows.map((r) => cellValue(r, columnIndex));
    const type = th?.dataset.sortType ?? detectType(values);
    const cmp = compareBy(type);
    const sign = direction === "descending" ? -1 : 1;
    const order = rows.map((row, i) => ({ row, value: values[i], i })).sort((a, b) => {
      const c = cmp(a.value, b.value);
      const emptyA = a.value === "" || a.value === "-";
      const emptyB = b.value === "" || b.value === "-";
      if (emptyA !== emptyB)
        return emptyA ? 1 : -1;
      return c * sign || a.i - b.i;
    });
    body.append(...order.map((o) => o.row));
  }
  const state = states.get(table);
  if (state) {
    state.sort = { column: columnIndex, direction };
    update2(table);
  }
  return true;
}
document.addEventListener("click", (e) => {
  const button = e.target.closest(SORT_BUTTON);
  if (!button)
    return;
  const th = button.parentElement;
  const table = th.closest("table");
  const next = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
  sort(table, th.cellIndex, next);
});
var boxOf = (row) => row.cells[0]?.querySelector(':scope > input[type="checkbox"]');
var rowBoxes = (table, rows = rowsOf(table)) => rows.map(boxOf).filter(Boolean);
function selected(table) {
  return rowBoxes(table).filter((box) => box.checked).map((box) => box.closest("tr"));
}
var matching = (table) => states.get(table)?.matched ?? rowsOf(table);
function sync3(table) {
  for (const box of rowBoxes(table))
    box.closest("tr").setAttribute("aria-selected", String(box.checked));
  const all = table.querySelector(ALL_BOX.replace(".table ", ":scope > "));
  if (all) {
    const boxes = rowBoxes(table, matching(table));
    const n = boxes.filter((b) => b.checked).length;
    all.checked = n > 0 && n === boxes.length;
    all.indeterminate = n > 0 && n < boxes.length;
  }
}
function select2(table, rows, checked = true) {
  for (const row of rows) {
    const box = boxOf(row);
    if (box)
      box.checked = checked;
  }
  sync3(table);
  announce2(table);
}
function announce2(table) {
  const rows = selected(table);
  table.dispatchEvent(new CustomEvent("tsunami:select", {
    bubbles: true,
    detail: { rows, count: rows.length }
  }));
}
document.addEventListener("change", (e) => {
  const all = e.target.closest(ALL_BOX);
  const box = all ?? e.target.closest(ROW_BOX);
  if (!box)
    return;
  const table = box.closest("table");
  if (all)
    for (const b of rowBoxes(table, matching(table)))
      b.checked = all.checked;
  sync3(table);
  announce2(table);
});
var pageSizeOf = (table) => {
  const n = Number.parseInt(table.dataset.pageSize, 10);
  return n > 0 ? n : 0;
};
function pageList(page, pages) {
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  const list = [];
  let last = 0;
  for (let n = 1;n <= pages; n++) {
    if (!keep.has(n))
      continue;
    if (n - last > 1)
      list.push(n - last === 2 ? n - 1 : null);
    list.push(n);
    last = n;
  }
  return list;
}
function pageButton(label, page, props = {}) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.page = String(page);
  Object.assign(button, props);
  if (typeof label === "string")
    button.textContent = label;
  else
    button.append(label);
  li.append(button);
  return li;
}
var chevron = (name) => {
  const i = document.createElement("i");
  i.className = `icon icon-${name}`;
  i.setAttribute("aria-hidden", "true");
  return i;
};
function renderPagination(table, state) {
  const { page, pages } = state;
  for (const nav of controls(table, ".pagination", "data-pagination-for")) {
    nav.hidden = pages <= 1;
    const ul = document.createElement("ul");
    const prev = pageButton(chevron("chevron-left"), page - 1, {
      disabled: page <= 1
    });
    prev.firstChild.setAttribute("aria-label", "Previous page");
    const next = pageButton(chevron("chevron-right"), page + 1, {
      disabled: page >= pages
    });
    next.firstChild.setAttribute("aria-label", "Next page");
    ul.append(prev);
    for (const n of pageList(page, pages)) {
      if (n === null) {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.setAttribute("aria-hidden", "true");
        span.append(chevron("ellipsis"));
        li.append(span);
        ul.append(li);
        continue;
      }
      const li = pageButton(String(n), n);
      if (n === page)
        li.firstChild.setAttribute("aria-current", "page");
      ul.append(li);
    }
    ul.append(next);
    nav.replaceChildren(ul);
  }
}
function renderInfo(table, state) {
  const { page, size, matched } = state;
  const total = matched.length;
  const from = total ? size ? (page - 1) * size + 1 : 1 : 0;
  const to = size ? Math.min(page * size, total) : total;
  const text = total ? `${from}–${to} of ${total}` : "0 of 0";
  for (const el of controls(table, "[data-table-info]", "data-table-info"))
    el.textContent = text;
}
function stateFor(table) {
  let state = states.get(table);
  if (!state) {
    state = {
      page: 1,
      pages: 1,
      matched: [],
      sort: null,
      query: "",
      columns: new Map,
      empty: null,
      hidden: new Set
    };
    states.set(table, state);
    table.dataset.enhanced = "";
    setupColumns(table, state);
  }
  return state;
}
var storeKey = (table) => table.id && table.hasAttribute("data-table-remember") ? `tsunami:table:${table.id}` : null;
function applyColumns(table, state) {
  for (const row of table.rows) {
    if (row.matches(EMPTY))
      continue;
    for (const cell of row.cells)
      cell.hidden = state.hidden.has(cell.cellIndex);
  }
}
function setupColumns(table, state) {
  const menus = table.id ? [
    ...document.querySelectorAll(`[data-table-columns="${CSS.escape(table.id)}"]`)
  ] : [];
  const heads = [...table.tHead?.rows[0]?.cells ?? []];
  const key = storeKey(table);
  try {
    const saved = key && JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved)) {
      for (const i of saved)
        if (Number.isInteger(i) && heads[i])
          state.hidden.add(i);
    }
  } catch {}
  for (const menu of menus) {
    if (!menu.querySelector('input[type="checkbox"]')) {
      heads.forEach((th, i) => {
        const text = th.textContent.trim();
        if (!text)
          return;
        const label = document.createElement("label");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.value = String(i);
        label.append(box, text);
        menu.append(label);
      });
    }
    for (const box of menu.querySelectorAll('input[type="checkbox"]'))
      box.checked = !state.hidden.has(Number(box.value));
  }
  syncMenus(table, state);
  applyColumns(table, state);
}
function syncMenus(table, state) {
  if (!table.id)
    return;
  for (const menu of document.querySelectorAll(`[data-table-columns="${CSS.escape(table.id)}"]`)) {
    const boxes = [...menu.querySelectorAll('input[type="checkbox"]')];
    const on = boxes.filter((b) => b.checked);
    for (const box of boxes) {
      box.checked = !state.hidden.has(Number(box.value));
      box.disabled = on.length === 1 && box.checked;
    }
  }
}
document.addEventListener("change", (e) => {
  const box = e.target.closest?.('[data-table-columns] input[type="checkbox"]');
  if (!box)
    return;
  const table = document.getElementById(box.closest("[data-table-columns]").dataset.tableColumns);
  if (!table)
    return;
  const state = stateFor(table);
  const i = Number(box.value);
  if (box.checked)
    state.hidden.delete(i);
  else
    state.hidden.add(i);
  syncMenus(table, state);
  applyColumns(table, state);
  const key = storeKey(table);
  try {
    if (key)
      localStorage.setItem(key, JSON.stringify([...state.hidden]));
  } catch {}
  update2(table);
});
var colSpan = (table) => [...table.tHead?.rows[0]?.cells ?? []].filter((c) => !c.hidden).length || 1;
function emptyRow(table, state) {
  if (state.empty)
    return state.empty;
  let row = table.querySelector(`tbody > tr${EMPTY}`);
  if (!row) {
    const id = CSS.escape(table.id || "");
    const tpl = table.querySelector(`template${EMPTY}`) ?? (table.id && document.querySelector(`template[data-table-empty="${id}"]`));
    row = document.createElement("tr");
    row.setAttribute("data-table-empty", "");
    const cell = row.insertCell();
    if (tpl)
      cell.append(tpl.content.cloneNode(true));
    else
      cell.textContent = "No results";
    (table.tBodies[0] ?? table.createTBody()).append(row);
  }
  state.empty = row;
  return row;
}
function update2(table, { page } = {}) {
  const state = stateFor(table);
  const rows = rowsOf(table);
  const size = pageSizeOf(table);
  const query = state.query.toLowerCase();
  const filters = [...state.columns];
  state.matched = rows.filter((row) => {
    const cells = rowTexts(row);
    if (query && !cells.some((t) => t.includes(query)))
      return false;
    return filters.every(([i, f]) => f.exact ? cells[i] === f.value : (cells[i] ?? "").includes(f.value));
  });
  const empty = emptyRow(table, state);
  empty.hidden = state.matched.length > 0;
  empty.firstElementChild?.setAttribute("colspan", String(colSpan(table)));
  state.pages = size ? Math.max(1, Math.ceil(state.matched.length / size)) : 1;
  if (page !== undefined)
    state.page = page;
  state.page = Math.min(Math.max(1, state.page), state.pages);
  const start = size ? (state.page - 1) * size : 0;
  const end = size ? start + size : state.matched.length;
  const shown = new Set(state.matched.slice(start, end));
  for (const row of rows)
    row.hidden = !shown.has(row);
  state.size = size;
  renderPagination(table, state);
  renderInfo(table, state);
  for (const select of controls(table, "select", "data-table-page-size"))
    if (size && select.value !== String(size))
      select.value = String(size);
  sync3(table);
  table.dispatchEvent(new CustomEvent("tsunami:tablechange", {
    bubbles: true,
    detail: {
      page: state.page,
      pageSize: size,
      total: rows.length,
      filtered: state.matched.length,
      sort: state.sort,
      hidden: [...state.hidden].sort((a, b) => a - b)
    }
  }));
}
function filter(table, text = "") {
  const state = stateFor(table);
  state.query = String(text).trim();
  if (table.id) {
    for (const input of document.querySelectorAll(`[data-table-search="${CSS.escape(table.id)}"]`))
      if (input.value !== text)
        input.value = text;
  }
  update2(table, { page: 1 });
}
function setPage(table, n) {
  update2(table, { page: Number(n) });
}
function refresh2(table) {
  for (const row of rowsOf(table))
    texts.delete(row);
  update2(table);
}
function columnFilter(field) {
  const cell = field.closest("tr[data-filters] > *");
  const table = cell?.closest("table");
  if (!table)
    return;
  const state = stateFor(table);
  const value = field.value.trim().toLowerCase();
  if (value)
    state.columns.set(cell.cellIndex, {
      value,
      exact: field.tagName === "SELECT"
    });
  else
    state.columns.delete(cell.cellIndex);
  update2(table, { page: 1 });
}
var searchLater = debounce((input) => {
  const table = document.getElementById(input.dataset.tableSearch);
  if (table)
    filter(table, input.value);
}, 150);
var columnLater = debounce(columnFilter, 150);
document.addEventListener("input", (e) => {
  if (e.target.matches?.("input[data-table-search]"))
    searchLater(e.target);
  else if (e.target.matches?.("tr[data-filters] input"))
    columnLater(e.target);
});
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-page]");
  const nav = button?.closest(".pagination[data-pagination-for]");
  if (!nav || button.disabled)
    return;
  const id = nav.getAttribute("data-pagination-for");
  const table = id ? document.getElementById(id) : nav.closest(".card")?.querySelector(".table");
  if (table)
    setPage(table, button.dataset.page);
});
document.addEventListener("change", (e) => {
  if (e.target.matches?.("tr[data-filters] select"))
    columnFilter(e.target);
  const select = e.target.closest("select[data-table-page-size]");
  if (!select)
    return;
  const id = select.getAttribute("data-table-page-size");
  const table = id ? document.getElementById(id) : select.closest(".card")?.querySelector(".table");
  if (!table)
    return;
  table.dataset.pageSize = select.value;
  update2(table, { page: 1 });
});
var wanted = (table) => table.hasAttribute("data-page-size") || table.querySelector("thead > tr[data-filters]") || table.id && document.querySelector(`[data-table-columns="${CSS.escape(table.id)}"]`) || table.id && document.querySelector(["pagination-for", "table-page-size", "table-search"].map((a) => `[data-${a}="${CSS.escape(table.id)}"]`).join(","));
var init = () => {
  for (const table of document.querySelectorAll(".table")) {
    if (wanted(table))
      update2(table);
    else if (table.querySelector(ROW_BOX.replace(".table ", "")))
      sync3(table);
  }
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init);
else
  init();
(window.tsunami ??= {}).table = {
  sort,
  select: select2,
  selected,
  sync: sync3,
  refresh: refresh2,
  page: setPage,
  filter
};

// src/js/tree.js
function filter2(tree, query) {
  const q = query.trim().toLowerCase();
  const folders = [...tree.querySelectorAll("details")];
  const empty = tree.querySelector(":scope > p");
  if (!q) {
    for (const li of tree.querySelectorAll("li"))
      li.hidden = false;
    for (const d of folders) {
      if (d.dataset.treeOpen)
        d.open = d.dataset.treeOpen === "true";
      delete d.dataset.treeOpen;
    }
    if (empty)
      empty.hidden = true;
    return;
  }
  for (const d of folders)
    d.dataset.treeOpen ??= String(d.open);
  let any = false;
  for (const li of tree.querySelectorAll("li:not(:has(> details))")) {
    li.hidden = !li.textContent.toLowerCase().includes(q);
    any ||= !li.hidden;
  }
  for (const d of folders.reverse()) {
    const hit = !!d.querySelector("li:not([hidden])");
    d.open = hit;
    if (d.parentElement.matches("li"))
      d.parentElement.hidden = !hit;
  }
  if (empty)
    empty.hidden = any;
}
document.addEventListener("input", (e) => {
  if (e.target.matches('.tree input[type="search"]'))
    filter2(e.target.closest(".tree"), e.target.value);
});
(window.tsunami ??= {}).tree = { filter: filter2 };

// src/js/journey.js
var PAGE = ".journey > ol > li button";
var NS = "http://www.w3.org/2000/svg";
var stepsOf = (journey) => [...journey.querySelectorAll(":scope > ol > li")];
var pagesIn = (root) => [...root.querySelectorAll("button")].filter((b) => b.checkVisibility());
var pickedIn = (step) => step?.querySelector('button[aria-pressed="true"]');
var isVertical = (journey) => journey.dataset.orientation === "vertical";
var isRtl = (journey) => getComputedStyle(journey).direction === "rtl";
function pick2(button) {
  const journey = button.closest(".journey");
  const steps = stepsOf(journey);
  const index = steps.indexOf(button.closest(".journey > ol > li"));
  for (const step of steps.slice(index)) {
    for (const b of step.querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b === button));
    }
  }
  const value = button.value || (button.querySelector("span") ?? button).textContent.trim();
  button.dispatchEvent(new CustomEvent("tsunami:pick", {
    bubbles: true,
    detail: { step: index, value }
  }));
  draw(journey);
}
function draw(journey) {
  let svg = journey.querySelector(":scope > svg");
  if (!svg) {
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.append(document.createElementNS(NS, "path"));
    journey.prepend(svg);
  }
  const box = journey.getBoundingClientRect();
  const ox = journey.scrollLeft - box.left - journey.clientLeft;
  const oy = journey.scrollTop - box.top - journey.clientTop;
  const rows = stepsOf(journey).map((step) => {
    const b = pickedIn(step);
    if (!b?.checkVisibility())
      return null;
    const r = (b.closest("[data-outcomes]") ?? b).getBoundingClientRect();
    return {
      left: r.left + ox,
      right: r.right + ox,
      top: r.top + oy,
      bottom: r.bottom + oy,
      mid: r.top + oy + r.height / 2
    };
  });
  const vertical = isVertical(journey);
  const rtl = isRtl(journey);
  let d = "";
  for (let i = 0;i + 1 < rows.length; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (!a || !b)
      continue;
    if (vertical) {
      const x = rtl ? a.right - 12 : a.left + 12;
      const x2 = rtl ? b.right : b.left;
      const sign = x2 >= x ? 1 : -1;
      const r = Math.min(6, Math.abs(x2 - x), Math.max(b.mid - a.bottom, 0));
      d += `M${x} ${a.bottom}V${b.mid - r}Q${x} ${b.mid} ${x + sign * r} ${b.mid}H${x2}`;
    } else {
      const x1 = rtl ? a.left : a.right;
      const x2 = rtl ? b.right : b.left;
      const xm = (x1 + x2) / 2;
      d += `M${x1} ${a.mid}C${xm} ${a.mid} ${xm} ${b.mid} ${x2} ${b.mid}`;
    }
  }
  svg.setAttribute("width", journey.scrollWidth);
  svg.setAttribute("height", journey.scrollHeight);
  svg.firstElementChild.setAttribute("d", d);
}
var queued = new Set;
var frame = 0;
var seen = new WeakSet;
var resize = new ResizeObserver((entries) => {
  for (const e of entries)
    schedule2(e.target.closest(".journey"));
});
function schedule2(journey) {
  if (!journey)
    return;
  if (!seen.has(journey)) {
    seen.add(journey);
    resize.observe(journey);
    const ol = journey.querySelector(":scope > ol");
    if (ol)
      resize.observe(ol);
  }
  queued.add(journey);
  frame ||= requestAnimationFrame(() => {
    frame = 0;
    for (const j of queued)
      if (j.isConnected)
        draw(j);
    queued.clear();
  });
}
var drawAll = () => document.querySelectorAll(".journey").forEach(schedule2);
new MutationObserver((records) => {
  for (const r of records) {
    const nodes = [...r.addedNodes, ...r.removedNodes];
    if (nodes.length && nodes.every((n) => n.nodeName === "svg"))
      continue;
    const journey = r.target.closest?.(".journey");
    if (journey)
      schedule2(journey);
    else if (nodes.some((n) => n.querySelector?.(".journey") || n.matches?.(".journey")))
      drawAll();
  }
}).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: [
    "aria-pressed",
    "data-view",
    "data-orientation",
    "hidden",
    "dir"
  ]
});
drawAll();
document.fonts?.ready.then(drawAll);
document.addEventListener("click", (e) => {
  const button = e.target.closest(PAGE);
  if (button)
    pick2(button);
});
document.addEventListener("keydown", (e) => {
  const button = e.target.closest?.(PAGE);
  if (!button)
    return;
  const journey = button.closest(".journey");
  const step = button.closest(".journey > ol > li");
  const vertical = isVertical(journey);
  let to;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const pages = pagesIn(vertical ? journey.querySelector(":scope > ol") : step);
    to = pages[pages.indexOf(button) + (e.key === "ArrowDown" ? 1 : -1)];
  } else if (!vertical && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    const forward = e.key === "ArrowRight" !== isRtl(journey);
    const steps = stepsOf(journey);
    const next = steps[steps.indexOf(step) + (forward ? 1 : -1)];
    to = next && (pickedIn(next) ?? pagesIn(next)[0]);
    if (to && !to.checkVisibility())
      to = pagesIn(next)[0];
  } else
    return;
  e.preventDefault();
  to?.focus();
});
(window.tsunami ??= {}).journey = { pick: pick2, draw };

// src/js/json-viewer.js
var h4 = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls)
    e.className = cls;
  if (text !== undefined)
    e.textContent = text;
  return e;
};
var kind = (v) => v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
function node(value, key, comma) {
  const li = h4("li");
  if (key !== undefined)
    li.append(h4("span", "json-viewer-key", key), ": ");
  const type = kind(value);
  const entries = type === "array" ? value.map((v) => [undefined, v]) : type === "object" ? Object.entries(value) : null;
  const [open, close] = type === "array" ? ["[", "]"] : ["{", "}"];
  if (!entries) {
    li.append(h4("span", `json-viewer-${type}`, JSON.stringify(value)));
  } else if (!entries.length) {
    li.append(open + close);
  } else {
    const details = h4("details");
    details.open = true;
    details.dataset.kind = type;
    const summary = h4("summary");
    summary.append(...li.childNodes, open);
    const list = h4("ul");
    entries.forEach(([k, v], i) => list.append(node(v, k, i < entries.length - 1)));
    details.append(summary, list);
    li.append(details, h4("span", "json-viewer-close", close));
  }
  if (comma)
    li.append(",");
  return li;
}
var parts2 = (viewer) => {
  const bar = viewer.querySelector(":scope > .json-viewer-toolbar");
  return {
    area: viewer.querySelector(":scope > textarea"),
    tree: viewer.querySelector(":scope > .json-viewer-tree"),
    toggle: bar.querySelector("[data-json-viewer='toggle']"),
    folds: bar.querySelectorAll("[data-json-viewer='collapse'], [data-json-viewer='expand']")
  };
};
var parse = (text) => {
  try {
    return { value: JSON.parse(text) };
  } catch {
    return;
  }
};
function fold(viewer, folded) {
  const { tree } = parts2(viewer);
  tree.querySelectorAll("details").forEach((d) => {
    d.open = !folded || d.parentElement.parentElement === tree;
  });
}
function showRaw(viewer) {
  const { area, tree, toggle, folds } = parts2(viewer);
  const parsed = parse(area.value);
  if (parsed)
    area.value = JSON.stringify(parsed.value, null, 2);
  viewer.dataset.view = "raw";
  area.hidden = false;
  tree.hidden = true;
  folds.forEach((b) => b.hidden = true);
  toggle.textContent = "Show parsed";
}
function showParsed(viewer) {
  const { area, tree, toggle, folds } = parts2(viewer);
  const parsed = parse(area.value);
  if (!parsed) {
    area.setAttribute("aria-invalid", "true");
    showRaw(viewer);
    return;
  }
  area.removeAttribute("aria-invalid");
  tree.replaceChildren(node(parsed.value, undefined, false));
  if (viewer.hasAttribute("data-collapsed"))
    fold(viewer, true);
  viewer.dataset.view = "parsed";
  area.hidden = true;
  tree.hidden = false;
  folds.forEach((b) => b.hidden = false);
  toggle.textContent = "Show raw";
}
var show2 = (viewer, view) => view === "raw" ? showRaw(viewer) : showParsed(viewer);
function upgrade(viewer) {
  if (viewer.querySelector(":scope > .json-viewer-tree"))
    return;
  if (!viewer.querySelector(":scope > textarea"))
    return;
  const bar = h4("div", "json-viewer-toolbar");
  for (const [action, label] of [
    ["toggle", "Show raw"],
    ["collapse", "Collapse all"],
    ["expand", "Expand all"]
  ]) {
    const b = h4("button", "btn", label);
    b.type = "button";
    b.dataset.size = "sm";
    b.dataset.jsonViewer = action;
    bar.append(b);
  }
  viewer.prepend(bar);
  viewer.append(h4("ul", "json-viewer-tree"));
  show2(viewer, viewer.dataset.view);
}
var all = (root) => root.querySelectorAll?.(".json-viewer").forEach(upgrade);
all(document);
new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => n.matches?.(".json-viewer") ? upgrade(n) : all(n)))).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".json-viewer-toolbar [data-json-viewer]");
  if (!btn)
    return;
  const viewer = btn.closest(".json-viewer");
  const action = btn.dataset.jsonViewer;
  if (action === "toggle")
    show2(viewer, viewer.dataset.view === "raw" ? "parsed" : "raw");
  else
    fold(viewer, action === "collapse");
});
document.addEventListener("input", (e) => {
  if (e.target.matches(".json-viewer > textarea"))
    e.target.removeAttribute("aria-invalid");
});
var ready = (viewer) => (upgrade(viewer), viewer);
(window.tsunami ??= {}).jsonViewer = {
  expand: (viewer) => fold(ready(viewer), false),
  collapse: (viewer) => fold(ready(viewer), true),
  view(viewer, v) {
    if (v !== undefined)
      show2(ready(viewer), v);
    return viewer.dataset.view;
  },
  value(viewer, v) {
    const { area } = parts2(ready(viewer));
    if (v !== undefined) {
      area.value = typeof v === "string" ? v : JSON.stringify(v);
      show2(viewer, viewer.dataset.view);
    }
    return area.value;
  }
};

// src/js/editor.js
var ELEMENTS = [
  "@[style]",
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "blockquote",
  "strong/b",
  "em/i",
  "u",
  "s/strike",
  "code",
  "sub",
  "sup",
  "ul",
  "ol",
  "li",
  "span",
  "a[href|title|target|rel]",
  "img[!src|alt|title|width|height]",
  "video[!src|controls|width|height]",
  "audio[!src|controls]"
].join(",");
var STYLES = {
  "*": "text-align,padding-left,padding-right",
  img: "width,height",
  video: "width,height"
};
var SCHEME = /^[a-z][a-z0-9+.-]*:/i;
var url = (value) => {
  const clean = [...value].filter((c) => c.charCodeAt(0) > 32 && c !== "").join("");
  return SCHEME.test(clean) && !/^(?:https?|mailto):/i.test(clean) ? "" : value;
};
var VIDEO = /\.(?:mp4|webm|ogv|mov)(?:[?#].*)?$/i;
var AUDIO = /\.(?:mp3|ogg|oga|wav|m4a|aac|flac)(?:[?#].*)?$/i;
var esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
var resolve = (data) => new Promise((ok, fail) => {
  const src = data.url;
  if (url(src) !== src || !/^https?:/i.test(src)) {
    fail({ msg: "Use an https:// address." });
  } else if (VIDEO.test(src)) {
    ok({ html: `<video src="${esc(src)}" controls></video>` });
  } else if (AUDIO.test(src)) {
    ok({ html: `<audio src="${esc(src)}" controls></audio>` });
  } else {
    fail({ msg: "Use the address of a video or audio file." });
  }
});
var DEFAULTS = {
  menubar: false,
  statusbar: false,
  branding: false,
  promotion: false,
  license_key: "gpl",
  plugins: "image link fullscreen media autoresize lists code",
  toolbar: "blocks | bold italic underline | bullist numlist link image media | alignleft aligncenter alignright alignjustify | outdent indent | removeformat | code fullscreen",
  toolbar_mode: "wrap",
  min_height: 200,
  max_height: 800,
  body_class: "typography",
  content_style: "html, body { background: var(--surface); } body { margin: 0.75rem; font-family: var(--font-sans); font-size: var(--text-base); } html:focus-visible, body:focus-visible, body:focus { outline: none !important; }",
  valid_elements: ELEMENTS,
  valid_styles: STYLES,
  invalid_elements: "script,style,iframe,object,embed,form,input,textarea,link,meta,base,svg,math",
  allow_script_urls: false,
  allow_unsafe_link_target: false,
  convert_unsafe_embeds: true,
  xss_sanitization: true,
  urlconverter_callback: (value) => url(value),
  paste_data_images: false,
  paste_webkit_styles: "none",
  link_default_protocol: "https",
  link_target_list: false,
  link_title: false,
  image_title: false,
  image_advtab: false,
  image_uploadtab: false,
  media_live_embeds: false,
  media_dimensions: false,
  media_alt_source: false,
  media_poster: false,
  media_url_resolver: resolve,
  sandbox_iframes: true
};
var states2 = new WeakMap;
var mounted = new Set;
var serial = 0;
var dark = () => window.tsunami.theme.get() === "dark";
var flag = (v) => v !== undefined && v !== "false";
var num2 = (v) => v === undefined ? undefined : Number(v);
function fromData(el) {
  const d = el.dataset;
  const o = {};
  if (d.toolbar !== undefined)
    o.toolbar = d.toolbar === "none" || d.toolbar === "" ? false : d.toolbar;
  if (d.minHeight !== undefined)
    o.min_height = num2(d.minHeight);
  if (d.maxHeight !== undefined)
    o.max_height = num2(d.maxHeight);
  if (d.menubar !== undefined)
    o.menubar = flag(d.menubar);
  if (d.statusbar !== undefined)
    o.statusbar = flag(d.statusbar);
  return o;
}
var labelOf = (el) => el.getAttribute("aria-label") || [...el.labels ?? []].map((l) => l.textContent.trim()).join(" ") || "";
function sheet() {
  const link = document.querySelector('link[rel="stylesheet"][href*="tsunami"]');
  return link ? link.href : null;
}
var sync4 = (el, editor) => {
  editor.save();
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
function theme(editor) {
  editor.getDoc().documentElement.dataset.theme = window.tsunami.theme.get();
}
var monaco = () => typeof window.require?.config === "function";
function source(editor) {
  const id = `editor-source-${++serial}`;
  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.dataset.size = "xl";
  dialog.setAttribute("aria-labelledby", `${id}-title`);
  dialog.innerHTML = `<header><h2 id="${id}-title">Source code</h2><button type="button" class="btn" data-variant="ghost" data-size="icon" aria-label="Close" commandfor="${id}" command="close"><i class="icon icon-x" aria-hidden="true"></i></button></header><div class="code-editor" data-language="html" style="height: 24rem"><textarea aria-label="Source code" spellcheck="false"></textarea></div><footer><button type="button" class="btn" commandfor="${id}" command="close">Cancel</button><button type="button" class="btn" data-variant="primary" data-save>Save</button></footer>`;
  dialog.id = id;
  const box = dialog.querySelector(".code-editor");
  const area = box.querySelector("textarea");
  area.value = editor.getContent({ source_view: true });
  dialog.querySelector("[data-save]").addEventListener("click", () => {
    editor.undoManager.transact(() => editor.setContent(area.value));
    dialog.close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    editor.focus();
  });
  document.body.append(dialog);
  dialog.showModal();
}
function start(el, state) {
  const tinymce = window.tinymce;
  const isDark = dark();
  const label = labelOf(el);
  tinymce.init({
    ...DEFAULTS,
    skin: isDark ? "oxide-dark" : "oxide",
    content_css: sheet() ?? (isDark ? "dark" : "default"),
    readonly: el.readOnly,
    disabled: el.matches(":disabled"),
    ...label && { iframe_aria_text: `${label}. Rich text area.` },
    ...fromData(el),
    ...state.options,
    target: el,
    init_instance_callback(editor) {
      if (states2.get(el) !== state)
        return editor.remove();
      state.editor = editor;
      theme(editor);
      const plain = editor.editorCommands.commands.exec.mcecodeeditor;
      if (plain)
        editor.addCommand("mceCodeEditor", (...args) => monaco() ? source(editor) : plain.apply(editor, args));
      if (el.value === el.defaultValue)
        el.defaultValue = el.value = editor.getContent();
      el.style.removeProperty("display");
      el.dataset.editorReady = "";
      let queued = false;
      editor.on("input change undo redo", () => {
        if (queued)
          return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          if (state.editor === editor)
            sync4(el, editor);
        });
      });
      el.dispatchEvent(new CustomEvent("tsunami:editorready", {
        bubbles: true,
        detail: { editor }
      }));
      state.options.init_instance_callback?.(editor);
    }
  }).catch((error) => console.error("Tsunami editor could not start:", error));
}
function destroy2(el) {
  const state = states2.get(el);
  if (!state)
    return;
  states2.delete(el);
  mounted.delete(el);
  delete el.editor;
  delete el.dataset.editorReady;
  state.editor?.remove();
}
function mount2(el, options = {}) {
  if (!window.tinymce)
    throw new Error("A textarea.editor needs TinyMCE: load dist/tinymce.min.js with its own <script> before the Tsunami script.");
  destroy2(el);
  const state = { editor: null, options, id: ++serial };
  states2.set(el, state);
  mounted.add(el);
  Object.defineProperty(el, "editor", {
    configurable: true,
    get: () => state.editor
  });
  start(el, state);
}
var upgrade2 = (el) => {
  if (!states2.has(el))
    mount2(el);
};
var all2 = (root) => root.querySelectorAll?.("textarea.editor").forEach(upgrade2);
var scan3 = () => {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => all2(document), {
      once: true
    });
  else
    all2(document);
};
scan3();
new MutationObserver((list) => list.forEach((m) => {
  if (document.readyState === "loading")
    return;
  m.addedNodes.forEach((n) => n.matches?.("textarea.editor") ? upgrade2(n) : all2(n));
  m.removedNodes.forEach((n) => {
    if (n.isConnected)
      return;
    for (const el of mounted)
      if (!el.isConnected)
        destroy2(el);
  });
})).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("tsunami:themechange", () => {
  for (const el of mounted) {
    const state = states2.get(el);
    if (!state.editor)
      continue;
    state.editor.save();
    mount2(el, state.options);
  }
});
document.addEventListener("submit", (e) => {
  for (const el of mounted)
    if (el.form === e.target)
      states2.get(el).editor?.save();
}, true);
document.addEventListener("formdata", (e) => {
  for (const el of mounted) {
    const editor = states2.get(el).editor;
    if (el.form === e.target && el.name && !el.disabled && editor)
      e.formData.set(el.name, editor.getContent());
  }
});
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    for (const el of mounted) {
      const editor = states2.get(el).editor;
      if (el.form !== e.target || !editor)
        continue;
      editor.setContent(el.value);
      editor.undoManager.clear();
      editor.setDirty(false);
    }
  });
});
document.addEventListener("focusin", (e) => {
  if (e.target.matches?.("textarea[data-editor-ready]"))
    states2.get(e.target)?.editor?.focus();
});
(window.tsunami ??= {}).editor = {
  mount: mount2,
  get: (el) => states2.get(el)?.editor ?? null,
  destroy: destroy2
};

// src/js/command.js
var ITEM = '[role="menuitem"]';
var limits = new WeakMap;
var uid3 = 0;
var input = (root) => root.querySelector(":scope > header input");
var menu = (root) => root.querySelector(':scope > [role="menu"]');
var all3 = (root) => [...menu(root).querySelectorAll(ITEM)];
var off2 = (item) => item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true";
var hidden = (item) => item.getAttribute("aria-hidden") === "true";
var items = (root) => all3(root).filter((i) => !off2(i) && !hidden(i));
var active = (root) => all3(root).find((i) => i.classList.contains("active")) || null;
var more = (root) => menu(root).querySelector(`${ITEM}[data-more]`);
var step = (root) => Number(menu(root).dataset.limit) || Infinity;
function setActive(root, item) {
  active(root)?.classList.remove("active");
  input(root).removeAttribute("aria-activedescendant");
  if (!item)
    return;
  item.classList.add("active");
  item.id ||= `command-item-${++uid3}`;
  input(root).setAttribute("aria-activedescendant", item.id);
}
function search(root, text) {
  const q = text.trim().toLowerCase();
  for (const item of all3(root)) {
    const name = (item.dataset.label || item.textContent).trim().toLowerCase();
    const words = (item.dataset.keywords || "").toLowerCase();
    item.setAttribute("aria-hidden", String(!name.includes(q) && !words.includes(q)));
  }
}
function refresh3(root) {
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
  for (const item of all3(root)) {
    const group = item.closest('[role="group"]');
    let show = !hidden(item) && !slash && !chosen;
    if (group?.hasAttribute("data-filter-list"))
      show = !hidden(item) && slash;
    if (group?.hasAttribute("data-results")) {
      show = !hidden(item) && !slash && (typed || chosen !== "") && (chosen === "" || group.dataset.filter === chosen);
    }
    if (group?.getAttribute("aria-busy") === "true")
      show = false;
    if (item === showMore)
      show = false;
    if (show && group?.hasAttribute("data-results")) {
      counts[group.dataset.filter] = (counts[group.dataset.filter] || 0) + 1;
      shown.push(item);
      if (shown.length > limit)
        show = false;
    }
    item.setAttribute("aria-hidden", String(!show));
  }
  const busy = !slash && (typed || chosen !== "") && [...list.querySelectorAll('[data-results][aria-busy="true"]')].some((g) => chosen === "" || g.dataset.filter === chosen);
  if (busy)
    list.setAttribute("aria-busy", "true");
  else
    list.removeAttribute("aria-busy");
  if (showMore) {
    const left = shown.length - limit;
    showMore.setAttribute("aria-hidden", String(left <= 0));
    showMore.querySelector("[data-count]").textContent = Math.min(left, Number(showMore.dataset.more));
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
function choose2(root, key) {
  const box = input(root);
  if (key)
    root.dataset.filter = key;
  else
    delete root.dataset.filter;
  if (box.value.startsWith("/"))
    box.value = "";
  const badge = root.querySelector(":scope > header [data-filter-badge]");
  if (badge) {
    badge.hidden = !key;
    const name = root.querySelector(`[data-filters] [data-filter="${key}"] [data-name]`);
    badge.querySelector("[data-name]").textContent = name ? name.textContent : "";
  }
  limits.set(root, step(root));
  refresh3(root);
  box.focus();
}
function upgrade3(root) {
  if (root.dataset.commandInitialized || !input(root) || !menu(root))
    return;
  root.dataset.commandInitialized = "true";
  limits.set(root, step(root));
  refresh3(root);
}
var scan4 = (node) => {
  if (node.matches?.(".command"))
    upgrade3(node);
  node.querySelectorAll?.(".command").forEach(upgrade3);
};
scan4(document);
new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === "childList")
      r.addedNodes.forEach(scan4);
    else {
      const root = r.target.closest?.(".command");
      if (root?.dataset.commandInitialized && r.target !== menu(root))
        refresh3(root);
    }
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["aria-busy"]
});
var rootOf3 = (el) => {
  const root = el.closest?.(".command");
  return root?.dataset.commandInitialized ? root : null;
};
document.addEventListener("input", (e) => {
  const root = e.target.matches?.(".command > header input") && rootOf3(e.target);
  if (!root)
    return;
  limits.set(root, step(root));
  refresh3(root);
});
document.addEventListener("keydown", (e) => {
  const root = e.target.matches?.(".command > header input") && rootOf3(e.target);
  if (!root)
    return;
  const list = items(root);
  const i = list.indexOf(active(root));
  let next;
  if (e.key === "ArrowDown")
    next = list[Math.min(i + 1, list.length - 1)];
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
    choose2(root, "");
    return;
  }
  const tab = active(root)?.dataset.tabFilter;
  if (e.key === "Tab" && !e.shiftKey && tab) {
    e.preventDefault();
    e.target.value = "";
    choose2(root, tab);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    active(root)?.click();
  }
});
document.addEventListener("mousemove", (e) => {
  const item = e.target.closest?.(`.command > [role="menu"] ${ITEM}`);
  const root = item && rootOf3(item);
  if (root && item !== active(root) && items(root).includes(item))
    setActive(root, item);
});
document.addEventListener("click", (e) => {
  const button = e.target.closest?.(".command > [data-filters] [data-filter]");
  if (button && rootOf3(button))
    return choose2(rootOf3(button), button.dataset.filter);
  const remove = e.target.closest?.(".command > header [data-filter-badge] button");
  if (remove && rootOf3(remove))
    return choose2(rootOf3(remove), "");
  const item = e.target.closest?.(`.command > [role="menu"] ${ITEM}`);
  const root = item && rootOf3(item);
  if (!root || !items(root).includes(item))
    return;
  if (item.dataset.filter)
    return choose2(root, item.dataset.filter);
  if (item === more(root)) {
    const from = limits.get(root);
    limits.set(root, from + Number(item.dataset.more));
    refresh3(root);
    const results = items(root).filter((i) => i.closest("[data-results]"));
    setActive(root, results[from] || null);
    results[from]?.scrollIntoView({ block: "nearest" });
    input(root).focus();
    return;
  }
  root.closest("dialog.command-dialog")?.close();
});
document.addEventListener("toggle", (e) => {
  if (e.newState === "open" && e.target.matches?.("dialog.command-dialog"))
    e.target.querySelector(".command > header input")?.focus();
}, true);
var typing = (el) => el?.matches?.("input, textarea, select, [contenteditable]") ?? false;
function hotkeyMatches(e, combo) {
  const parts = combo.toLowerCase().split("+");
  const key = parts.pop() || "+";
  const mods = new Set(parts);
  if (e.key.toLowerCase() !== key)
    return false;
  const mod = mods.has("mod");
  if (mod && !(e.ctrlKey || e.metaKey))
    return false;
  return (mod || e.ctrlKey === mods.has("ctrl")) && (mod || e.metaKey === (mods.has("meta") || mods.has("cmd"))) && e.altKey === mods.has("alt") && (key === "?" || e.shiftKey === mods.has("shift"));
}
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.repeat)
    return;
  for (const dialog of document.querySelectorAll("dialog.command-dialog[data-hotkey]")) {
    const combos = dialog.dataset.hotkey.trim().split(/\s+/);
    if (!combos.some((c) => hotkeyMatches(e, c)))
      continue;
    const bare = !(e.ctrlKey || e.metaKey || e.altKey);
    if (bare && typing(e.target))
      continue;
    const other = document.querySelector("dialog:modal");
    if (other && other !== dialog)
      continue;
    e.preventDefault();
    if (dialog.open)
      dialog.close();
    else
      dialog.showModal();
    return;
  }
});

// src/js/color-field.js
var FIELD2 = ".color-field";
var HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
var HEX_ALPHA = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
var RGB = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*(\d*\.?\d+)(%?)\s*)?\)$/i;
var parts3 = (field) => ({
  picker: field.querySelector('input[type="color"]'),
  text: field.querySelector('input[type="text"]'),
  range: field.querySelector('input[type="range"]')
});
var byte = (n) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
function parse2(value, alpha) {
  if (!alpha) {
    if (!HEX.test(value))
      return null;
    return { hex: long(value), a: 1 };
  }
  if (HEX_ALPHA.test(value)) {
    const digits = value.slice(1);
    const full = digits.length <= 4 ? [...digits].map((c) => c + c).join("") : digits;
    const a = full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1;
    return { hex: `#${full.slice(0, 6)}`.toLowerCase(), a };
  }
  const m = RGB.exec(value);
  if (!m)
    return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  if (r > 255 || g > 255 || b > 255)
    return null;
  let a = m[4] === undefined ? 1 : Number(m[4]) / (m[5] ? 100 : 1);
  a = Math.min(1, Math.max(0, a));
  return { hex: `#${byte(r)}${byte(g)}${byte(b)}`, a };
}
function long(hex) {
  return hex.length === 7 ? hex.toLowerCase() : `#${[...hex.slice(1)].map((c) => c + c).join("")}`.toLowerCase();
}
var format = (hex, a) => a >= 1 ? hex : hex + byte(Math.round(a * 255));
function sync5(field) {
  const { picker, text, range } = parts3(field);
  if (!picker || !text)
    return;
  const alpha = field.hasAttribute("data-alpha");
  const value = text.value.trim();
  field.toggleAttribute("data-empty", value === "");
  const color = parse2(value, alpha);
  if (color)
    picker.value = color.hex;
  if (!alpha)
    return;
  const a = color ? color.a : 1;
  field.style.setProperty("--alpha", String(Math.round(a * 100) / 100));
  if (range) {
    range.value = String(Math.round(a * 100));
    window.tsunami?.slider?.sync(range);
  }
}
function write(field, text, hex, a) {
  text.value = format(hex, a);
  text.dispatchEvent(new Event("input", { bubbles: true }));
}
document.addEventListener("input", (e) => {
  const field = e.target.closest?.(FIELD2);
  if (!field)
    return;
  const { picker, text, range } = parts3(field);
  const alpha = field.hasAttribute("data-alpha");
  if (e.target === picker) {
    const a = alpha ? parse2(text.value.trim(), true)?.a ?? 1 : 1;
    write(field, text, picker.value, a);
  } else if (e.target === range && alpha) {
    write(field, text, picker.value, Number(range.value) / 100);
  } else if (e.target === text)
    sync5(field);
});
document.addEventListener("change", (e) => {
  const field = e.target.closest?.(FIELD2);
  const { picker, text, range } = field ? parts3(field) : {};
  if (e.target === picker || e.target === range)
    text.dispatchEvent(new Event("change", { bubbles: true }));
});
document.addEventListener("reset", (e) => {
  setTimeout(() => e.target.querySelectorAll(FIELD2).forEach(sync5));
});
var syncAll2 = (root = document) => root.querySelectorAll(FIELD2).forEach(sync5);
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => syncAll2());
else
  syncAll2();
new MutationObserver((records) => {
  for (const r of records)
    for (const n of r.addedNodes) {
      if (n.nodeType !== 1)
        continue;
      if (n.matches(FIELD2))
        sync5(n);
      else
        syncAll2(n);
    }
}).observe(document.documentElement, { childList: true, subtree: true });

// src/js/sortable.js
var states3 = new WeakMap;
var mounted2 = new Set;
var status = null;
var MEMBERS = ["toArray", "sort", "disabled", "sortable"];
var defaults = (el) => ({
  animation: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150,
  forceFallback: true,
  handle: [...el.querySelectorAll(".sortable-handle")].some((h) => h.closest(".sortable") === el) ? ".sortable-handle" : null,
  filter: "[data-sortable-ignore]",
  preventOnFilter: false,
  disabled: el.hasAttribute("data-disabled")
});
var fromData2 = (el) => {
  if (!el.dataset.options)
    return {};
  try {
    return JSON.parse(el.dataset.options);
  } catch (error) {
    console.error("Tsunami sortable: data-options is not valid JSON.", error);
    return {};
  }
};
function destroy3(el) {
  const state = states3.get(el);
  if (!state)
    return;
  states3.delete(el);
  mounted2.delete(el);
  for (const name of MEMBERS)
    delete el[name];
  state.sortable.destroy();
}
function mount3(el, options = {}) {
  if (!window.Sortable)
    throw new Error("A .sortable needs SortableJS: load dist/sortable.min.js with its own <script> before the Tsunami script.");
  destroy3(el);
  const sortable = new window.Sortable(el, {
    ...defaults(el),
    ...fromData2(el),
    ...options
  });
  states3.set(el, { sortable });
  mounted2.add(el);
  Object.defineProperties(el, {
    toArray: { configurable: true, value: () => sortable.toArray() },
    sort: { configurable: true, value: (order) => sortable.sort(order, true) },
    disabled: {
      configurable: true,
      get: () => sortable.option("disabled"),
      set(value) {
        sortable.option("disabled", Boolean(value));
        el.toggleAttribute("data-disabled", Boolean(value));
      }
    },
    sortable: { configurable: true, get: () => sortable }
  });
}
var upgrade4 = (el) => {
  if (states3.has(el) || el.closest(".sortable-fallback"))
    return;
  try {
    mount3(el);
  } catch (error) {
    console.error(error.message, el);
  }
};
var all4 = (root) => root.querySelectorAll?.(".sortable").forEach(upgrade4);
var scan5 = () => {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => all4(document), {
      once: true
    });
  else
    all4(document);
};
scan5();
new MutationObserver((list) => list.forEach((m) => {
  if (document.readyState === "loading")
    return;
  if (m.type === "attributes") {
    const state = states3.get(m.target);
    if (state)
      state.sortable.option("disabled", m.target.hasAttribute("data-disabled"));
    return;
  }
  m.addedNodes.forEach((n) => {
    if (n.matches?.(".sortable"))
      upgrade4(n);
    all4(n);
  });
  m.removedNodes.forEach((n) => {
    if (n.isConnected)
      return;
    for (const el of mounted2)
      if (!el.isConnected)
        destroy3(el);
  });
})).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-disabled"]
});
var reorder = (el, item, oldIndex, newIndex) => el.dispatchEvent(new CustomEvent("tsunami:reorder", {
  bubbles: true,
  detail: {
    item,
    id: item.getAttribute(states3.get(el).sortable.option("dataIdAttr")),
    oldIndex,
    newIndex
  }
}));
document.addEventListener("update", (e) => {
  if (e.from && e.target === e.from && states3.has(e.from))
    reorder(e.from, e.item, e.oldDraggableIndex, e.newDraggableIndex);
});
document.addEventListener("choose", (e) => {
  if (!states3.has(e.target))
    return;
  for (const cell of e.item.cells ?? [])
    cell.style.width = `${cell.getBoundingClientRect().width}px`;
});
document.addEventListener("unchoose", (e) => {
  if (!states3.has(e.target))
    return;
  for (const cell of e.item.cells ?? []) {
    cell.style.width = "";
    if (cell.getAttribute("style") === "")
      cell.removeAttribute("style");
  }
});
var STEP = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };
document.addEventListener("keydown", (e) => {
  const step = STEP[e.key];
  const handle = step && e.target.closest?.(".sortable-handle");
  const list = handle?.closest(".sortable");
  const state = list && states3.get(list);
  if (!state || state.sortable.option("disabled"))
    return;
  const rows = [...list.children].filter((c) => window.Sortable.utils.closest(c, state.sortable.option("draggable"), list, false) === c);
  const row = rows.find((c) => c.contains(handle));
  const from = rows.indexOf(row);
  const to = from + step;
  if (!row || to < 0 || to >= rows.length)
    return;
  e.preventDefault();
  if (to < from)
    rows[to].before(row);
  else
    rows[to].after(row);
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
var ready2 = (el) => {
  if (!states3.has(el))
    mount3(el);
  return el;
};
(window.tsunami ??= {}).sortable = {
  mount: mount3,
  get: (el) => states3.get(el)?.sortable ?? null,
  destroy: destroy3,
  toArray: (el) => ready2(el).toArray(),
  sort: (el, order) => ready2(el).sort(order),
  disabled(el, value) {
    if (value !== undefined)
      ready2(el).disabled = value;
    return Boolean(ready2(el).disabled);
  }
};

// src/js/date-picker.js
var ROOT3 = ".date-picker";
var TO = " to ";
var states4 = new WeakMap;
var mounted3 = new Set;
var open2 = new Set;
var MEMBERS2 = ["value", "open", "close", "calendar"];
var uid4 = 0;
var formats = {
  long: new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }),
  medium: new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  })
};
var isDate = (text) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
};
function parse3(text, count) {
  const parts = text.trim() === "" ? [] : text.split(TO).map((s) => s.trim());
  if (parts.length !== 0 && parts.length !== count)
    return null;
  return parts.every(isDate) ? parts.sort() : null;
}
var parts4 = (root) => ({
  text: root.querySelector(':scope > input:not([type="hidden"])'),
  button: root.querySelector(":scope > button"),
  hidden: root.querySelector(':scope > input[type="hidden"]'),
  panel: root.querySelector(":scope > [data-popover]")
});
var wide = () => matchMedia("(min-width: 48rem)").matches;
function destroy4(root) {
  const state = states4.get(root);
  if (!state)
    return;
  states4.delete(root);
  mounted3.delete(root);
  open2.delete(root);
  for (const name of MEMBERS2)
    delete root[name];
  state.calendar.destroy();
  state.host.remove();
  const { panel, control } = state;
  if (panel.matches(":popover-open"))
    panel.hidePopover();
  panel.removeAttribute("popover");
  panel.removeAttribute("role");
  panel.removeAttribute("aria-label");
  panel.removeAttribute("tabindex");
  panel.setAttribute("aria-hidden", "true");
  control.removeAttribute("aria-haspopup");
  control.removeAttribute("aria-controls");
  control.removeAttribute("aria-expanded");
  root.removeAttribute("data-date-picker-initialized");
}
function mount4(root, options = {}) {
  if (!window.VanillaCalendarPro?.Calendar)
    throw new Error("A .date-picker needs Vanilla Calendar Pro: load dist/vanilla-calendar.min.js with its own <script> before the Tsunami script.");
  const { text, button, hidden, panel } = parts4(root);
  const span = button?.querySelector(":scope > span");
  if (!panel || !text && !span)
    throw new Error("A .date-picker needs a text input, or a button holding a span, and a [data-popover] panel.", { cause: root });
  destroy4(root);
  const control = text ?? button;
  const range = root.dataset.mode === "range";
  const count = range ? 2 : 1;
  const format = formats[root.dataset.format] ?? null;
  const carrier = hidden ?? text;
  let dates = [];
  let months = 0;
  const state = {
    panel,
    control,
    host: document.createElement("div"),
    quiet: false,
    calendar: null
  };
  panel.prepend(state.host);
  panel.id ||= `date-picker-${++uid4}`;
  panel.setAttribute("popover", "manual");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", range ? "Choose dates" : "Choose a date");
  panel.setAttribute("aria-hidden", "true");
  panel.tabIndex = -1;
  control.setAttribute("aria-haspopup", "dialog");
  control.setAttribute("aria-controls", panel.id);
  if (button)
    button.setAttribute("aria-expanded", "false");
  if (text) {
    text.readOnly = Boolean(format);
    text.setAttribute("autocomplete", "off");
  }
  const value = () => dates.join(TO);
  function paint() {
    const shown = dates.map((d) => {
      const date = new Date(`${d}T00:00:00Z`);
      return format ? format.format(date) : d;
    });
    if (text) {
      text.value = shown.join(TO);
      text.removeAttribute("aria-invalid");
    }
    if (span)
      span.textContent = shown.join(" → ") || root.dataset.placeholder || "";
    root.toggleAttribute("data-empty", dates.length === 0);
    if (hidden)
      hidden.value = value();
    for (const preset of panel.querySelectorAll("[data-presets] button"))
      preset.setAttribute("aria-pressed", String(preset.value === value()));
    sync();
  }
  function sync() {
    const first = dates[0];
    state.calendar.set({
      selectedDates: range && dates.length === 2 ? [dates.join(":")] : dates,
      ...first ? {
        selectedMonth: Number(first.slice(5, 7)) - 1,
        selectedYear: Number(first.slice(0, 4))
      } : {}
    });
  }
  function commit(next) {
    const before = value();
    dates = next;
    paint();
    if (value() === before)
      return;
    carrier?.dispatchEvent(new Event("input", { bubbles: true }));
    root.dispatchEvent(new CustomEvent("change", {
      bubbles: true,
      detail: { value: value(), dates: [...dates] }
    }));
  }
  function build() {
    const two = range && wide();
    months = two ? 2 : 1;
    state.calendar?.destroy();
    state.host.replaceChildren();
    state.calendar = new window.VanillaCalendarPro.Calendar(state.host, {
      selectedTheme: "tsunami",
      themeAttrDetect: false,
      type: two ? "multiple" : "default",
      displayMonthsCount: two ? 2 : undefined,
      selectionDatesMode: range ? "multiple-ranged" : "single",
      enableDateToggle: false,
      enableJumpToSelectedDate: true,
      ...root.dataset.min ? { dateMin: root.dataset.min } : {},
      ...root.dataset.max ? { dateMax: root.dataset.max } : {},
      ...options,
      onClickDate(self, event) {
        options.onClickDate?.(self, event);
        const picked = self.context.selectedDates.filter(Boolean).sort();
        if (picked.length < count)
          return;
        const next = [picked[0], picked[picked.length - 1]].slice(0, count);
        state.quiet = true;
        commit(next);
        control.focus();
        state.quiet = false;
        close();
      }
    });
    state.calendar.init();
    sync();
  }
  function show() {
    if (open2.has(root) || control.disabled)
      return;
    if ((range && wide() ? 2 : 1) !== months)
      build();
    else
      sync();
    open2.add(root);
    panel.setAttribute("aria-hidden", "false");
    panel.showPopover();
    button?.setAttribute("aria-expanded", "true");
  }
  function close() {
    if (!open2.has(root))
      return;
    open2.delete(root);
    panel.hidePopover();
    panel.setAttribute("aria-hidden", "true");
    button?.setAttribute("aria-expanded", "false");
  }
  Object.assign(state, { commit, show, close, parse: (t) => parse3(t, count) });
  states4.set(root, state);
  mounted3.add(root);
  build();
  const start = parse3(hidden?.value || text?.value || "", count);
  if (start) {
    dates = start;
    paint();
  }
  Object.defineProperties(root, {
    value: {
      configurable: true,
      get: () => value(),
      set(next) {
        commit(parse3(String(next ?? ""), count) ?? []);
      }
    },
    open: { configurable: true, value: show },
    close: { configurable: true, value: close },
    calendar: { configurable: true, get: () => state.calendar }
  });
  root.setAttribute("data-date-picker-initialized", "true");
}
var upgrade5 = (root) => {
  if (states4.has(root))
    return;
  try {
    mount4(root);
  } catch (error) {
    console.error(error.message, root);
  }
};
var all5 = (node) => node.querySelectorAll?.(ROOT3).forEach(upgrade5);
var scan6 = () => {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => all5(document), {
      once: true
    });
  else
    all5(document);
};
scan6();
new MutationObserver((list) => list.forEach((m) => {
  if (document.readyState === "loading")
    return;
  for (const n of m.addedNodes) {
    if (n.nodeType !== 1 || n.closest("[data-vc]"))
      continue;
    if (n.matches(ROOT3))
      upgrade5(n);
    all5(n);
  }
  for (const n of m.removedNodes)
    if (!n.isConnected) {
      for (const root of mounted3)
        if (!root.isConnected)
          destroy4(root);
    }
})).observe(document.documentElement, { childList: true, subtree: true });
var rootOf4 = (el) => el.closest?.(ROOT3);
var stateOf = (el) => {
  const root = rootOf4(el);
  return root && states4.has(root) ? [root, states4.get(root)] : [];
};
var choose3 = (state, dates) => {
  state.commit(dates);
  state.quiet = true;
  state.control.focus();
  state.quiet = false;
  state.close();
};
document.addEventListener("focusin", (e) => {
  const [, state] = stateOf(e.target);
  if (state && e.target === state.control && !state.quiet && e.target.localName === "input")
    state.show();
});
document.addEventListener("click", (e) => {
  const [root, state] = stateOf(e.target);
  if (!state)
    return;
  const hit = e.target.closest("button, input");
  if (hit === state.control) {
    if (hit.localName === "button")
      open2.has(root) ? state.close() : state.show();
    else
      state.show();
    return;
  }
  const preset = e.target.closest("[data-presets] button");
  if (preset && state.panel.contains(preset))
    choose3(state, state.parse(preset.value) ?? []);
});
document.addEventListener("change", (e) => {
  const [root, state] = stateOf(e.target);
  if (!state || e.target !== state.control || e.target.localName !== "input")
    return;
  e.stopPropagation();
  const next = state.parse(e.target.value);
  const { min, max } = root.dataset;
  const inside = next && next.every((d) => (!min || d >= min) && (!max || d <= max));
  if (inside)
    state.commit(next);
  else
    e.target.setAttribute("aria-invalid", "true");
}, true);
document.addEventListener("pointerdown", (e) => {
  for (const root of [...open2])
    if (!root.contains(e.target))
      states4.get(root).close();
});
document.addEventListener("focusout", (e) => {
  const [root, state] = stateOf(e.target);
  if (state && e.relatedTarget && !root.contains(e.relatedTarget))
    state.close();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape")
    return;
  const [root, state] = stateOf(e.target);
  if (!state || !open2.has(root))
    return;
  e.preventDefault();
  e.stopPropagation();
  state.close();
  state.quiet = true;
  state.control.focus();
  state.quiet = false;
}, true);
(window.tsunami ??= {}).datePicker = {
  mount: mount4,
  get: (el) => states4.get(el)?.calendar ?? null,
  destroy: destroy4
};

// src/js/chart.js
var PALETTE = [
  "--accent",
  "--info-fg",
  "--ok-fg",
  "--warning-fg",
  "--danger-fg"
];
var SLICES = ["pie", "doughnut", "polarArea"];
var RADIAL = [...SLICES, "radar"];
var states5 = new Map;
var root2 = document.documentElement;
var reduce = matchMedia("(prefers-reduced-motion: reduce)");
var token = (name) => getComputedStyle(root2).getPropertyValue(name).trim();
var isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
function merge(base, extra) {
  for (const [key, value] of Object.entries(extra ?? {}))
    base[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  return base;
}
var resolve2 = (color) => String(color).replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, name) => token(name));
var ctx2d = document.createElement("canvas").getContext("2d");
function alpha(color, a) {
  ctx2d.fillStyle = "#000";
  ctx2d.fillStyle = color;
  const c = ctx2d.fillStyle;
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return `rgba(${n >> 16}, ${n >> 8 & 255}, ${n & 255}, ${a})`;
  }
  return c.replace(/rgba?\(([^)]+)\)/, (_, v) => {
    const [r, g, b] = v.split(",");
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  });
}
var px = (value) => value.endsWith("rem") ? parseFloat(value) * parseFloat(getComputedStyle(root2).fontSize) : parseFloat(value);
var ready3 = false;
var setup = () => {
  if (ready3)
    return;
  ready3 = true;
  window.Chart.Tooltip.positioners.pointer = (_items, point) => point;
};
var separator = {
  id: "tsunamiSeparator",
  afterTooltipDraw(chart) {
    const tip = chart.tooltip;
    if (!tip?.opacity || !tip.footer?.length || !chart.$total)
      return;
    const o = tip.options;
    const { toFont, toPadding } = window.Chart.helpers;
    const font = toFont(o.footerFont);
    const pad = toPadding(o.padding);
    const footer = tip.footer.length * font.lineHeight + (tip.footer.length - 1) * o.footerSpacing;
    const y = tip.y + tip.height - pad.bottom - footer - o.footerMarginTop / 2;
    const c = chart.ctx;
    c.save();
    c.strokeStyle = o.borderColor;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(tip.x + pad.left, Math.round(y) + 0.5);
    c.lineTo(tip.x + tip.width - pad.right, Math.round(y) + 0.5);
    c.stroke();
    c.restore();
  }
};
function config(options) {
  const type = options.type ?? "bar";
  const key = options.labelKey ?? "label";
  const rows = options.data ?? [];
  const radial = RADIAL.includes(type);
  const c = Object.fromEntries(["fg", "muted", "line", "surface"].map((n) => [n, token(`--${n}`)]));
  const series = options.series ?? Object.fromEntries(Object.keys(rows[0] ?? {}).filter((k) => k !== key && k !== "color").map((k) => [k, {}]));
  const colour = (spec, i) => resolve2(spec.color ?? token(PALETTE[i % PALETTE.length]));
  const scales = {};
  const tick = { color: c.muted, padding: 8 };
  if (type === "radar" || type === "polarArea")
    scales.r = {
      grid: { color: c.line },
      angleLines: { color: c.line },
      border: { display: false },
      ticks: { ...tick, backdropColor: "transparent" },
      pointLabels: { color: c.muted }
    };
  else if (!radial) {
    scales.x = {
      grid: { display: false },
      border: { color: c.line },
      ticks: tick
    };
    scales.y = {
      beginAtZero: true,
      grid: { color: c.line },
      border: { display: false },
      ticks: { ...tick, maxTicksLimit: 6 }
    };
  }
  const datasets = Object.entries(series).map(([field, spec], i) => {
    const ds = {
      label: spec.label ?? field,
      data: rows.map((row) => row[field]),
      _total: !!spec.total
    };
    if (SLICES.includes(type)) {
      ds.backgroundColor = rows.map((row, n) => colour(row, n));
      ds.borderColor = c.surface;
      ds.borderWidth = 2;
    } else {
      const own = colour(spec, i);
      const kind = spec.type ?? type;
      ds.type = spec.type;
      if (kind === "line" || kind === "radar") {
        ds.borderColor = own;
        ds.backgroundColor = spec.surface ? alpha(own, 0.15) : own;
        ds.fill = !!spec.surface;
        ds.borderWidth = 2;
        ds.tension = 0.3;
        ds.pointRadius = 0;
        ds.pointHoverRadius = 4;
        ds.pointHoverBackgroundColor = own;
        ds.pointHoverBorderColor = c.surface;
        ds.pointHoverBorderWidth = 2;
      } else {
        ds.backgroundColor = own;
        ds.hoverBackgroundColor = own;
        ds.borderRadius = px(token("--radius-sm"));
        ds.maxBarThickness = 48;
      }
    }
    if (spec.axis && spec.axis !== "y") {
      ds.yAxisID = spec.axis;
      scales[spec.axis] ??= {
        position: "right",
        grid: { drawOnChartArea: false },
        border: { display: false },
        ticks: tick
      };
    }
    return merge(ds, spec.dataset);
  });
  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    font: { family: token("--font-sans"), size: px(token("--text-sm")) },
    color: c.muted,
    interaction: radial && type !== "radar" ? { mode: "nearest", intersect: true } : { mode: "index", intersect: false },
    scales,
    plugins: {
      legend: {
        display: !!options.legend,
        position: "bottom",
        align: options.legendAlign ?? "center",
        labels: {
          color: c.muted,
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          borderRadius: 2,
          padding: 16,
          generateLabels: (chart) => window.Chart.defaults.plugins.legend.labels.generateLabels(chart).map((item) => ({ ...item, lineDash: [] }))
        }
      },
      tooltip: {
        enabled: options.tooltip !== false,
        position: "pointer",
        backgroundColor: c.surface,
        borderColor: c.line,
        borderWidth: 1,
        titleColor: c.fg,
        bodyColor: c.fg,
        footerColor: c.fg,
        cornerRadius: px(token("--radius-md")),
        padding: 10,
        caretSize: 0,
        caretPadding: 12,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
        titleFont: { family: token("--font-sans"), weight: "600" },
        bodyFont: { family: token("--font-sans") },
        footerFont: { family: token("--font-sans"), weight: "600" },
        footerMarginTop: 10,
        itemSort: (a, b) => a.dataset._total - b.dataset._total,
        filter: (item) => !item.dataset._total,
        callbacks: {
          footer(items) {
            const chart = this.chart;
            if (!items.length)
              return [];
            return chart.data.datasets.flatMap((dataset, datasetIndex) => {
              if (!dataset._total)
                return [];
              const index = items[0].dataIndex;
              const controller = chart.getDatasetMeta(datasetIndex).controller;
              const info = controller.getLabelAndValue(index);
              return this.options.callbacks.label.call(this, {
                chart,
                dataset,
                datasetIndex,
                dataIndex: index,
                label: info.label,
                formattedValue: info.value,
                raw: dataset.data[index],
                parsed: controller.getParsed(index)
              });
            });
          }
        }
      }
    }
  };
  if (reduce.matches)
    defaults.animation = false;
  return {
    type,
    plugins: [separator],
    data: { labels: rows.map((row) => row[key]), datasets },
    options: merge(defaults, options.options),
    total: datasets.some((d) => d._total)
  };
}
function destroy5(el) {
  const state = states5.get(el);
  if (!state)
    return;
  states5.delete(el);
  state.chart.destroy();
  delete el.dataset.chartInitialized;
}
function draw2(el, options, quiet) {
  const old = states5.get(el);
  if (old) {
    states5.delete(el);
    old.chart.destroy();
  }
  const { total, ...cfg } = config(options);
  if (quiet)
    cfg.options.animation = false;
  const chart = new window.Chart(el, cfg);
  chart.$total = total;
  states5.set(el, { chart, options });
  const family = chart.options.font.family;
  if (!document.fonts.check(`1em ${family}`))
    document.fonts.load(`1em ${family}`).then(() => states5.get(el)?.chart === chart && chart.update("none"));
  el.dataset.chartInitialized = "true";
  el.dispatchEvent(new CustomEvent("tsunami:chartready", { bubbles: true, detail: { chart } }));
  return chart;
}
function chart(target, options = {}) {
  if (!window.Chart)
    throw new Error("A chart needs Chart.js: load dist/chart.min.js with its own <script> before the Tsunami script.");
  setup();
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!(el instanceof HTMLCanvasElement))
    throw new Error("A chart needs a <canvas> to draw in.", { cause: target });
  return draw2(el, options, false);
}
new MutationObserver((list) => list.forEach((m) => m.removedNodes.forEach((n) => {
  if (n.isConnected)
    return;
  for (const el of states5.keys())
    if (!el.isConnected)
      destroy5(el);
}))).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("tsunami:themechange", () => {
  for (const [el, state] of [...states5])
    draw2(el, state.options, true);
});
chart.get = (el) => states5.get(el)?.chart ?? null;
chart.destroy = destroy5;
(window.tsunami ??= {}).chart = chart;

// src/js/code-editor.js
var ROOT4 = ".code-editor";
var LANGUAGES = ["html", "css", "scss", "javascript", "json"];
var NO_SERVICE = {
  completionItems: false,
  hovers: false,
  documentSymbols: false,
  definitions: false,
  references: false,
  documentHighlights: false,
  rename: false,
  diagnostics: false,
  documentRangeFormattingEdits: false,
  signatureHelp: false,
  onTypeFormattingEdits: false,
  codeActions: false,
  inlayHints: false
};
var states6 = new WeakMap;
var mounted4 = new Set;
var loading = null;
var root3 = document.documentElement;
var token2 = (name) => getComputedStyle(root3).getPropertyValue(name).trim();
var pixel = document.createElement("canvas").getContext("2d", {
  willReadFrequently: true
});
function rgb(css) {
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillStyle = "#000";
  pixel.fillStyle = css;
  pixel.fillRect(0, 0, 1, 1);
  return [...pixel.getImageData(0, 0, 1, 1).data];
}
var hex = (css, alpha = 255) => `#${[...rgb(css).slice(0, 3), alpha].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
var themeName = () => window.tsunami.theme.get() === "dark" ? "tsunami-dark" : "tsunami-light";
function defineTheme(monaco) {
  const dark = window.tsunami.theme.get() === "dark";
  const c = (name) => hex(token2(name));
  const [bg, fg, line, muted, accent, subtle] = [
    "--surface",
    "--fg",
    "--line",
    "--muted",
    "--accent",
    "--subtle"
  ].map(c);
  const [ok, warn, danger, info] = [
    "--ok-fg",
    "--warning-fg",
    "--danger-fg",
    "--info-fg"
  ].map(c);
  const rule = (name, color, fontStyle) => ({
    token: name,
    foreground: color.slice(1, 7),
    ...fontStyle && { fontStyle }
  });
  monaco.editor.defineTheme(themeName(), {
    base: dark ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      rule("", fg),
      rule("comment", muted, "italic"),
      rule("keyword", accent),
      rule("keyword.json", accent),
      rule("string", ok),
      rule("string.key.json", info),
      rule("string.value.json", ok),
      rule("number", warn),
      rule("tag", info),
      rule("metatag", info),
      rule("attribute.name", warn),
      rule("attribute.value", ok),
      rule("type", info),
      rule("regexp", danger),
      rule("delimiter", muted),
      rule("delimiter.html", muted),
      rule("delimiter.bracket", muted),
      rule("variable", fg),
      rule("variable.predefined", info)
    ],
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
      "editorLineNumber.foreground": muted,
      "editorLineNumber.activeForeground": fg,
      "editor.selectionBackground": hex(token2("--accent"), 64),
      "editor.inactiveSelectionBackground": hex(token2("--accent"), 32),
      "editor.lineHighlightBackground": subtle,
      "editor.lineHighlightBorder": "#00000000",
      "editorCursor.foreground": fg,
      "editorIndentGuide.background1": line,
      "editorIndentGuide.activeBackground1": muted,
      "editorWhitespace.foreground": line,
      "editorWidget.background": bg,
      "editorWidget.border": line,
      "editorSuggestWidget.background": bg,
      "editorSuggestWidget.border": line,
      "editorSuggestWidget.selectedBackground": subtle,
      "editorHoverWidget.background": bg,
      "editorHoverWidget.border": line,
      "input.background": bg,
      "input.border": line,
      focusBorder: accent,
      "scrollbarSlider.background": hex(token2("--muted"), 56),
      "scrollbarSlider.hoverBackground": hex(token2("--muted"), 96),
      "scrollbarSlider.activeBackground": hex(token2("--muted"), 128),
      "scrollbar.shadow": "#00000000",
      "widget.shadow": "#00000000"
    }
  });
}
function load2() {
  if (window.monaco?.editor)
    return Promise.resolve(window.monaco);
  if (typeof window.require?.config !== "function")
    throw new Error("A code editor needs Monaco: load dist/monaco/vs/loader.js with its own <script> before the Tsunami script.");
  loading ??= new Promise((ok, fail) => {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    const loader = [...document.scripts].find((s) => /\/vs\/loader\.js(?:[?#]|$)/.test(s.src));
    if (loader) {
      const vs = new URL(".", loader.src).href.replace(/\/$/, "");
      window.require.config({ paths: { vs } });
      style.href = `${vs}/editor/editor.main.css`;
      document.head.append(style);
    }
    window.require(["vs/editor/editor.main"], () => {
      const monaco = window.monaco;
      monaco.languages.typescript?.javascriptDefaults.setModeConfiguration(NO_SERVICE);
      ok(monaco);
    }, fail);
  });
  return loading;
}
var defaults2 = () => ({
  automaticLayout: true,
  fontSize: 13,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontFamily: token2("--font-mono"),
  tabSize: 2,
  padding: { top: 8, bottom: 8 },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: { useShadows: false }
});
var files = (box) => [...box.querySelectorAll("textarea")].filter((t) => t.closest(ROOT4) === box);
var shown = (box) => files(box).find((t) => !t.hidden) ?? null;
var language = (box, ta) => {
  const name = ta.dataset.language ?? box.dataset.language;
  return LANGUAGES.includes(name) ? name : "plaintext";
};
var text = (id) => document.getElementById(id)?.textContent.trim() ?? "";
var labelOf2 = (box, ta) => ta.getAttribute("aria-label") || [...ta.labels ?? []].map((l) => l.textContent.trim()).join(" ") || (ta.getAttribute("aria-labelledby") ?? "").split(/\s+/).map(text).join(" ").trim() || box.getAttribute("aria-label") || "Code editor";
function track(box, state, ta) {
  const model = state.monaco.editor.createModel(ta.value, language(box, ta));
  const file = { model, view: null };
  file.listener = model.onDidChangeContent(() => {
    if (state.quiet)
      return;
    ta.value = model.getValue();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  state.files.set(ta, file);
}
function refresh4(box, state) {
  const { editor, monaco } = state;
  const list = files(box);
  for (const [ta, file] of state.files)
    if (!list.includes(ta)) {
      if (state.current === ta)
        state.current = null;
      file.listener.dispose();
      if (editor.getModel() === file.model)
        editor.setModel(null);
      file.model.dispose();
      state.files.delete(ta);
    }
  for (const ta of list)
    if (!state.files.has(ta))
      track(box, state, ta);
  for (const [ta, file] of state.files) {
    const lang = language(box, ta);
    if (file.model.getLanguageId() !== lang)
      monaco.editor.setModelLanguage(file.model, lang);
  }
  const next = shown(box);
  if (next !== state.current || !editor.getModel()) {
    const prev = state.files.get(state.current);
    if (prev)
      prev.view = editor.saveViewState();
    state.current = next;
    const file = state.files.get(next);
    editor.setModel(file?.model ?? null);
    if (file?.view)
      editor.restoreViewState(file.view);
  }
  editor.updateOptions({
    readOnly: !!next && (next.readOnly || next.disabled),
    ariaLabel: next ? labelOf2(box, next) : "Code editor",
    ...state.options
  });
}
function start2(box, state) {
  load2().then((monaco) => {
    if (states6.get(box) !== state)
      return;
    const host = document.createElement("div");
    host.className = "code-editor-host";
    box.append(host);
    state.host = host;
    state.monaco = monaco;
    defineTheme(monaco);
    state.editor = monaco.editor.create(host, {
      ...defaults2(),
      model: null,
      theme: themeName(),
      ...state.options
    });
    monaco.editor.setTheme(themeName());
    refresh4(box, state);
    box.dataset.loaded = "";
    state.observer = new MutationObserver(() => refresh4(box, state));
    state.observer.observe(box, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "hidden",
        "readonly",
        "disabled",
        "data-language",
        "aria-label"
      ]
    });
    box.dispatchEvent(new CustomEvent("tsunami:codeeditorready", {
      bubbles: true,
      detail: { editor: state.editor }
    }));
  }, (error) => console.error("Tsunami code editor could not start:", error));
}
function destroy6(box) {
  const state = states6.get(box);
  if (!state)
    return;
  states6.delete(box);
  mounted4.delete(box);
  delete box.editor;
  delete box.dataset.loaded;
  state.observer?.disconnect();
  if (!state.editor)
    return;
  state.editor.setModel(null);
  for (const file of state.files.values()) {
    file.listener.dispose();
    file.model.dispose();
  }
  state.editor.dispose();
  state.host.remove();
}
function mount5(box, options = {}) {
  load2();
  destroy6(box);
  const state = {
    editor: null,
    options,
    files: new Map,
    current: null,
    quiet: false
  };
  states6.set(box, state);
  mounted4.add(box);
  Object.defineProperty(box, "editor", {
    configurable: true,
    get: () => state.editor
  });
  start2(box, state);
}
var upgrade6 = (box) => {
  if (!states6.has(box))
    mount5(box);
};
var all6 = (node) => node.querySelectorAll?.(ROOT4).forEach(upgrade6);
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => all6(document), {
    once: true
  });
else
  all6(document);
new MutationObserver((list) => list.forEach((m) => {
  if (document.readyState === "loading")
    return;
  m.addedNodes.forEach((n) => n.matches?.(ROOT4) ? upgrade6(n) : all6(n));
  if (m.removedNodes.length) {
    for (const box of mounted4)
      if (!box.isConnected)
        destroy6(box);
  }
})).observe(root3, { childList: true, subtree: true });
document.addEventListener("tsunami:themechange", () => {
  const state = [...mounted4].map((b) => states6.get(b)).find((s) => s.monaco);
  if (!state)
    return;
  defineTheme(state.monaco);
  state.monaco.editor.setTheme(themeName());
});
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    for (const box of mounted4) {
      const state = states6.get(box);
      if (!state.editor || box.closest("form") !== e.target)
        continue;
      state.quiet = true;
      for (const [ta, file] of state.files)
        file.model.setValue(ta.value);
      state.quiet = false;
    }
  });
});
document.addEventListener("focusin", (e) => {
  const box = e.target.closest?.(`${ROOT4}[data-loaded]`);
  if (box && e.target.matches("textarea"))
    states6.get(box)?.editor?.focus();
});
(window.tsunami ??= {}).codeEditor = {
  mount: mount5,
  get: (box) => states6.get(box)?.editor ?? null,
  destroy: destroy6
};
