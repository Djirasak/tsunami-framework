/* tsunami v1.2.0 */
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

// src/js/dropdown.js
var PANEL = ".dropdown, .popover";
var ITEM = "a[href], button:not(:disabled), input:not(:disabled)";
var triggers = (panel) => document.querySelectorAll(`[popovertarget="${CSS.escape(panel.id)}"]`);
var items = (panel) => [...panel.querySelectorAll(ITEM)].filter((el) => el.getAttribute("aria-disabled") !== "true" && !el.hidden);
function sync2(panel) {
  const open = panel.matches(":popover-open");
  for (const t of triggers(panel)) {
    t.setAttribute("aria-controls", panel.id);
    t.setAttribute("aria-expanded", String(open));
  }
}
function upgrade(panel) {
  if (!panel.id || panel.dataset.dropdownInitialized)
    return;
  if (!panel.hasAttribute("popover"))
    return;
  panel.dataset.dropdownInitialized = "true";
  sync2(panel);
  panel.addEventListener("toggle", () => sync2(panel));
}
var scan = (node) => {
  if (node.matches?.(PANEL))
    upgrade(node);
  node.querySelectorAll?.(PANEL).forEach(upgrade);
};
var start = () => {
  scan(document);
  new MutationObserver((records) => {
    for (const r of records)
      r.addedNodes.forEach(scan);
  }).observe(document.documentElement, { childList: true, subtree: true });
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start);
else
  start();
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey)
    return;
  const trigger = e.target.closest?.("[popovertarget]");
  if (trigger && !trigger.closest(".dropdown") && e.key === "ArrowDown") {
    const panel = document.getElementById(trigger.getAttribute("popovertarget"));
    if (panel?.matches(".dropdown:popover-open")) {
      e.preventDefault();
      items(panel)[0]?.focus();
    }
    return;
  }
  const panel = e.target.closest?.(".dropdown");
  if (!panel || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
    return;
  if (e.target.matches('input[type="radio"]'))
    return;
  const all = items(panel);
  const at = all.indexOf(e.target);
  if (at < 0)
    return;
  e.preventDefault();
  const to = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length;
  all[to].focus();
});

// src/js/sidebar.js
var COLLAPSE_CMDS = ["--collapse", "--expand", "--toggle-collapsed"];
var POPOVER_CMDS = ["toggle-popover", "show-popover", "hide-popover"];
function controls(sidebar) {
  if (!sidebar.id)
    return [];
  const id = CSS.escape(sidebar.id);
  return document.querySelectorAll(`[popovertarget="${id}"], [commandfor="${id}"]`);
}
function sync3(sidebar) {
  const open = sidebar.matches(":popover-open");
  const expanded = sidebar.dataset.collapsed !== "true";
  for (const b of controls(sidebar)) {
    const cmd = b.getAttribute("command");
    if (cmd && COLLAPSE_CMDS.includes(cmd))
      b.setAttribute("aria-expanded", String(expanded));
    else if (b.hasAttribute("popovertarget") || POPOVER_CMDS.includes(cmd))
      b.setAttribute("aria-expanded", String(open));
  }
}
function set2(sidebar, collapsed) {
  sidebar.dataset.collapsed = String(collapsed);
  sync3(sidebar);
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
document.addEventListener("toggle", (e) => {
  const el = e.target;
  if (!el.matches?.(".sidebar[popover]"))
    return;
  sync3(el);
  if (e.newState !== "open")
    return;
  const first = el.querySelector('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])');
  if (first)
    first.focus();
  else {
    if (!el.hasAttribute("tabindex"))
      el.tabIndex = -1;
    el.focus();
  }
}, true);
var KEEP = ".sidebar[data-keep-scroll]";
var kept = new WeakSet;
var key = (el) => `tsunami:sidebar:${el.id || "sidebar"}`;
function mount(root = document) {
  for (const el of root.querySelectorAll(".sidebar"))
    sync3(el);
  for (const el of root.querySelectorAll(KEEP)) {
    if (kept.has(el))
      continue;
    kept.add(el);
    try {
      el.scrollTop = Number(sessionStorage.getItem(key(el))) || 0;
    } catch {}
    el.querySelector('[aria-current="page"]')?.scrollIntoView({
      block: "nearest"
    });
    el.addEventListener("scroll", () => {
      try {
        sessionStorage.setItem(key(el), String(el.scrollTop));
      } catch {}
    }, { passive: true });
  }
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
else
  mount();
new MutationObserver((records) => {
  if (document.readyState === "loading")
    return;
  for (const r of records)
    for (const n of r.addedNodes)
      if (n.nodeType === 1 && (n.matches(".sidebar") || n.querySelector(".sidebar")))
        return mount();
}).observe(document.documentElement, { childList: true, subtree: true });
(window.tsunami ??= {}).sidebar = { collapse, expand, toggle: toggle2, mount };

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
  const hadFocus = toast.contains(document.activeElement);
  toast.setAttribute("data-leaving", "");
  if (hadFocus) {
    const next = live().find((t) => t !== toast)?.querySelector("button");
    const back = s.opener?.isConnected ? s.opener : null;
    (next ?? back)?.focus();
  }
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
    done: false,
    opener: document.activeElement
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
function sync4(el) {
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
    sync4(el);
};
document.addEventListener("input", (e) => {
  if (e.target.matches?.(".slider"))
    sync4(e.target);
});
document.addEventListener("reset", (e) => setTimeout(() => syncAll(e.target)));
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => syncAll(), {
    once: true
  });
else
  syncAll();
new MutationObserver((records) => {
  if (document.readyState === "loading")
    return;
  for (const r of records) {
    if (r.type === "attributes") {
      if (r.target.matches(".slider"))
        sync4(r.target);
      continue;
    }
    for (const n of r.addedNodes) {
      if (n.nodeType !== 1)
        continue;
      if (n.matches(".slider"))
        sync4(n);
      for (const el of n.querySelectorAll(".slider"))
        sync4(el);
    }
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["min", "max", "value", "class"]
});
(window.tsunami ??= {}).slider = { sync: sync4 };

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
var scan2 = () => document.querySelectorAll(ROOT).forEach(build);
new MutationObserver(scan2).observe(document.documentElement, {
  childList: true,
  subtree: true
});
scan2();
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
  const status = h3("p", { role: "status", "data-sr-only": "" });
  const pop = h3("div", { popover: "manual" }, list, status);
  S2.set(root, {
    input,
    list,
    pop,
    status,
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
function mount2(root, opts = {}) {
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
  if (!found.length) {
    close3(root);
    st.status.textContent = "No suggestions";
    return;
  }
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
  st.status.textContent = found.length === 1 ? "1 suggestion" : `${found.length} suggestions`;
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
  const prev = list.querySelector("[data-active]");
  prev?.removeAttribute("data-active");
  prev?.removeAttribute("aria-selected");
  if (el) {
    el.setAttribute("data-active", "");
    el.setAttribute("aria-selected", "true");
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
(window.tsunami ??= {}).autocomplete = { mount: mount2, destroy };
var scan3 = () => document.querySelectorAll(ROOT2).forEach((root) => build2(root));
new MutationObserver(scan3).observe(document.documentElement, {
  childList: true,
  subtree: true
});
scan3();
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
function controls2(table, selector, attr) {
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
function sync5(table) {
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
  sync5(table);
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
  sync5(table);
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
  for (const nav of controls2(table, ".pagination", "data-pagination-for")) {
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
  for (const el of controls2(table, "[data-table-info]", "data-table-info"))
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
  for (const select of controls2(table, "select", "data-table-page-size"))
    if (size && select.value !== String(size))
      select.value = String(size);
  sync5(table);
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
      sync5(table);
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
  sync: sync5,
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
    refresh3(tree);
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
  refresh3(tree);
}
document.addEventListener("focusin", (e) => {
  if (e.target.matches('.tree input[type="search"]'))
    e.target.closest(".tree").querySelector(":scope > p")?.setAttribute("role", "status");
});
document.addEventListener("input", (e) => {
  if (e.target.matches('.tree input[type="search"]'))
    filter2(e.target.closest(".tree"), e.target.value);
});
var ITEM2 = ":scope > details > summary, :scope > a, :scope > span";
var listOf2 = (tree) => tree.matches("ul") ? tree : tree.querySelector(":scope > ul");
var itemOf = (li) => li.querySelector(ITEM2);
var items2 = (tree) => [...tree.querySelectorAll('[role="treeitem"]')].filter((el) => {
  const li = el.closest("li");
  for (let n = li;n && tree.contains(n); n = n.parentElement.closest("li"))
    if (n.hidden)
      return false;
  for (let d = li.parentElement.closest("details");d && tree.contains(d); d = d.parentElement.closest("details"))
    if (!d.open)
      return false;
  return true;
});
function refresh3(tree) {
  const root = listOf2(tree);
  if (!root)
    return;
  root.setAttribute("role", "tree");
  for (const ul of root.querySelectorAll("ul"))
    ul.setAttribute("role", "group");
  for (const li of root.querySelectorAll("li")) {
    li.setAttribute("role", "none");
    const d = li.querySelector(":scope > details");
    d?.setAttribute("role", "none");
    const item = d && d.querySelector(":scope > summary") || itemOf(li);
    if (!item)
      continue;
    item.setAttribute("role", "treeitem");
    if (d)
      item.setAttribute("aria-expanded", String(d.open));
    else
      item.removeAttribute("aria-expanded");
    if (!item.hasAttribute("tabindex"))
      item.tabIndex = -1;
  }
  const visible = items2(root);
  const current = visible.find((el) => el.tabIndex === 0) ?? visible.find((el) => el.matches('[aria-current="page"]')) ?? visible[0];
  setStop(root, current);
}
function setStop(root, el) {
  for (const it of root.querySelectorAll('[role="treeitem"]'))
    it.tabIndex = it === el ? 0 : -1;
}
var upgrade2 = (tree) => {
  if (!listOf2(tree))
    return;
  refresh3(tree);
};
var scan4 = (node) => {
  if (node.matches?.(".tree"))
    upgrade2(node);
  node.querySelectorAll?.(".tree").forEach(upgrade2);
  const parent = node.parentElement?.closest(".tree");
  if (parent)
    upgrade2(parent);
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => scan4(document), {
    once: true
  });
else
  scan4(document);
new MutationObserver((list) => {
  if (document.readyState === "loading")
    return;
  for (const m of list)
    for (const n of m.addedNodes)
      if (n.nodeType === 1)
        scan4(n);
}).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (!d.matches?.("details"))
    return;
  const tree = d.closest(".tree");
  if (!tree)
    return;
  d.querySelector(":scope > summary")?.setAttribute("aria-expanded", String(d.open));
  refresh3(tree);
}, true);
document.addEventListener("focusin", (e) => {
  const it = e.target.closest?.('.tree [role="treeitem"]');
  if (it)
    setStop(it.closest('[role="tree"]'), it);
});
document.addEventListener("keydown", (e) => {
  const it = e.target.closest?.('.tree [role="treeitem"]');
  if (!it || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
    return;
  const root = it.closest('[role="tree"]');
  const visible = items2(root);
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
      if (!d)
        break;
      if (!d.open) {
        d.open = true;
        it.setAttribute("aria-expanded", "true");
      } else
        to = items2(root).find((el) => d.contains(el) && el !== it);
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
  if (!to)
    return;
  to.focus();
  if (document.activeElement !== to)
    requestAnimationFrame(() => requestAnimationFrame(() => to.focus()));
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
function upgrade3(viewer) {
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
var all = (root) => root.querySelectorAll?.(".json-viewer").forEach(upgrade3);
all(document);
new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => n.matches?.(".json-viewer") ? upgrade3(n) : all(n)))).observe(document.documentElement, { childList: true, subtree: true });
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
var ready = (viewer) => (upgrade3(viewer), viewer);
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
var sync6 = (el, editor) => {
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
function start2(el, state) {
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
      el.tabIndex = -1;
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
            sync6(el, editor);
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
function mount3(el, options = {}) {
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
  start2(el, state);
}
var upgrade4 = (el) => {
  if (!states2.has(el))
    mount3(el);
};
var all2 = (root) => root.querySelectorAll?.("textarea.editor").forEach(upgrade4);
var scan5 = () => {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => all2(document), {
      once: true
    });
  else
    all2(document);
};
scan5();
new MutationObserver((list) => list.forEach((m) => {
  if (document.readyState === "loading")
    return;
  m.addedNodes.forEach((n) => n.matches?.("textarea.editor") ? upgrade4(n) : all2(n));
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
    mount3(el, state.options);
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
  mount: mount3,
  get: (el) => states2.get(el)?.editor ?? null,
  destroy: destroy2
};

// src/js/command.js
var ITEM3 = '[role="menuitem"]';
var limits = new WeakMap;
var uid3 = 0;
var input = (root) => root.querySelector(":scope > header input");
var menu = (root) => root.querySelector(':scope > [role="menu"]');
var all3 = (root) => [...menu(root).querySelectorAll(ITEM3)];
var off2 = (item) => item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true";
var hidden = (item) => item.getAttribute("aria-hidden") === "true";
var statuses = new WeakMap;
var items3 = (root) => all3(root).filter((i) => !off2(i) && !hidden(i));
var active = (root) => all3(root).find((i) => i.classList.contains("active")) || null;
var more = (root) => menu(root).querySelector(`${ITEM3}[data-more]`);
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
function refresh4(root) {
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
  setActive(root, items3(root)[0] || null);
  const status = statuses.get(root);
  if (status) {
    const n = items3(root).length;
    status.textContent = !typed && chosen === "" ? "" : n === 0 ? list.dataset.empty || "No results" : n === 1 ? "1 result" : `${n} results`;
  }
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
  refresh4(root);
  box.focus();
}
function upgrade5(root) {
  if (root.dataset.commandInitialized || !input(root) || !menu(root))
    return;
  root.dataset.commandInitialized = "true";
  limits.set(root, step(root));
  const box = input(root);
  const list = menu(root);
  if (!box.labels?.length && !box.hasAttribute("aria-label"))
    box.setAttribute("aria-label", box.placeholder || "Search");
  if (!list.hasAttribute("aria-label") && !list.hasAttribute("aria-labelledby"))
    list.setAttribute("aria-label", "Results");
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.setAttribute("data-sr-only", "");
  root.append(status);
  statuses.set(root, status);
  refresh4(root);
}
var scan6 = (node) => {
  if (node.matches?.(".command"))
    upgrade5(node);
  node.querySelectorAll?.(".command").forEach(upgrade5);
};
scan6(document);
new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === "childList")
      r.addedNodes.forEach(scan6);
    else {
      const root = r.target.closest?.(".command");
      if (root?.dataset.commandInitialized && r.target !== menu(root))
        refresh4(root);
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
  refresh4(root);
});
document.addEventListener("keydown", (e) => {
  const root = e.target.matches?.(".command > header input") && rootOf3(e.target);
  if (!root)
    return;
  const list = items3(root);
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
  const item = e.target.closest?.(`.command > [role="menu"] ${ITEM3}`);
  const root = item && rootOf3(item);
  if (root && item !== active(root) && items3(root).includes(item))
    setActive(root, item);
});
document.addEventListener("click", (e) => {
  const button = e.target.closest?.(".command > [data-filters] [data-filter]");
  if (button && rootOf3(button))
    return choose2(rootOf3(button), button.dataset.filter);
  const remove = e.target.closest?.(".command > header [data-filter-badge] button");
  if (remove && rootOf3(remove))
    return choose2(rootOf3(remove), "");
  const item = e.target.closest?.(`.command > [role="menu"] ${ITEM3}`);
  const root = item && rootOf3(item);
  if (!root || !items3(root).includes(item))
    return;
  if (item.dataset.filter)
    return choose2(root, item.dataset.filter);
  if (item === more(root)) {
    const from = limits.get(root);
    limits.set(root, from + Number(item.dataset.more));
    refresh4(root);
    const results = items3(root).filter((i) => i.closest("[data-results]"));
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
function sync7(field) {
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
    sync7(field);
});
document.addEventListener("change", (e) => {
  const field = e.target.closest?.(FIELD2);
  const { picker, text, range } = field ? parts3(field) : {};
  if (e.target === picker || e.target === range)
    text.dispatchEvent(new Event("change", { bubbles: true }));
});
document.addEventListener("reset", (e) => {
  setTimeout(() => e.target.querySelectorAll(FIELD2).forEach(sync7));
});
var syncAll2 = (root = document) => root.querySelectorAll(FIELD2).forEach(sync7);
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
        sync7(n);
      else
        syncAll2(n);
    }
}).observe(document.documentElement, { childList: true, subtree: true });

// src/js/otp.js
var OTP = ".otp";
var keep = (el, text) => el.dataset.type === "text" ? text.replace(/[^a-z0-9]/gi, "") : text.replace(/\D/g, "");
var boxes = (el) => [...el.querySelectorAll('input[type="text"]')];
function sync8(el) {
  const value = boxes(el).map((b) => b.value).join("");
  const hidden = el.querySelector('input[type="hidden"]');
  if (hidden)
    hidden.value = value;
  return value;
}
function spread(el, from, text) {
  const all = boxes(el);
  const chars = [...keep(el, text)];
  chars.slice(0, all.length - from).forEach((c, i) => {
    all[from + i].value = c;
  });
  const end = Math.min(from + chars.length, all.length - 1);
  all[end].focus();
  all[end].select();
  const value = sync8(el);
  if (value.length === all.length)
    el.dispatchEvent(new CustomEvent("tsunami:otpcomplete", { bubbles: true, detail: { value } }));
}
function mount4(root = document) {
  for (const el of root.querySelectorAll(OTP)) {
    if (el.dataset.mounted)
      continue;
    el.dataset.mounted = "";
    if (!boxes(el).length) {
      const count = Number(el.dataset.length) || 6;
      const mode = el.dataset.type === "text" ? "text" : "numeric";
      for (let i = 1;i <= count; i++) {
        const box = document.createElement("input");
        box.type = "text";
        box.inputMode = mode;
        box.autocomplete = i === 1 ? "one-time-code" : "off";
        box.setAttribute("aria-label", `Character ${i} of ${count}`);
        if ("disabled" in el.dataset)
          box.disabled = true;
        el.append(box);
      }
    }
    if (el.dataset.name && !el.querySelector('input[type="hidden"]')) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = el.dataset.name;
      el.append(hidden);
    }
    sync8(el);
  }
}
var box = (e) => e.target.closest?.(`${OTP} > input[type="text"]`);
document.addEventListener("input", (e) => {
  const b = box(e);
  if (!b)
    return;
  const el = b.closest(OTP);
  const at = boxes(el).indexOf(b);
  const text = e.inputType === "insertText" && e.data ? e.data : b.value;
  b.value = "";
  if (keep(el, text))
    spread(el, at, text);
  else
    sync8(el);
});
document.addEventListener("paste", (e) => {
  const b = box(e);
  if (!b)
    return;
  e.preventDefault();
  const el = b.closest(OTP);
  const text = e.clipboardData.getData("text");
  const all = boxes(el);
  const whole = keep(el, text).length >= all.length;
  if (whole)
    for (const x of all)
      x.value = "";
  spread(el, whole ? 0 : all.indexOf(b), text);
});
document.addEventListener("keydown", (e) => {
  const b = box(e);
  if (!b || e.ctrlKey || e.metaKey || e.altKey)
    return;
  const el = b.closest(OTP);
  const all = boxes(el);
  const at = all.indexOf(b);
  const go = (i) => {
    e.preventDefault();
    all[Math.max(0, Math.min(all.length - 1, i))].focus();
  };
  if (e.key === "Backspace") {
    if (b.value) {
      b.value = "";
      sync8(el);
      e.preventDefault();
    } else if (at > 0) {
      all[at - 1].value = "";
      sync8(el);
      go(at - 1);
    }
  } else if (e.key === "ArrowLeft")
    go(at - 1);
  else if (e.key === "ArrowRight")
    go(at + 1);
  else if (e.key === "Home")
    go(0);
  else if (e.key === "End")
    go(all.length - 1);
});
document.addEventListener("focusin", (e) => {
  const b = box(e);
  if (b)
    b.select();
});
document.addEventListener("reset", (e) => setTimeout(() => {
  for (const el of e.target.querySelectorAll(OTP)) {
    for (const b of boxes(el))
      b.value = "";
    sync8(el);
  }
}));
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount4(), { once: true });
else
  mount4();
new MutationObserver((records) => {
  if (document.readyState === "loading")
    return;
  for (const r of records)
    for (const n of r.addedNodes)
      if (n.nodeType === 1 && (n.matches(OTP) || n.querySelector(OTP)))
        return mount4();
}).observe(document.documentElement, { childList: true, subtree: true });
(window.tsunami ??= {}).otp = {
  mount: mount4,
  value: (el) => sync8(el),
  set(el, text) {
    for (const b of boxes(el))
      b.value = "";
    spread(el, 0, text);
  },
  clear(el) {
    for (const b of boxes(el))
      b.value = "";
    sync8(el);
    boxes(el)[0]?.focus();
  }
};

// src/js/bulk-bar.js
var BAR = ".bulk-bar";
function tableOf(bar) {
  const id = bar.getAttribute("data-table");
  if (id)
    return document.getElementById(id);
  return bar.parentElement?.querySelector(".table") ?? null;
}
var rowsOf2 = (table) => window.tsunami?.table?.selected(table) ?? [...table.querySelectorAll('tbody td:first-child > input[type="checkbox"]')].filter((box) => box.checked).map((box) => box.closest("tr"));
function paint2(bar, count) {
  bar.dataset.active = String(count > 0);
  for (const el of bar.querySelectorAll("[data-bulk-count]"))
    el.textContent = String(count);
}
function update3(bar) {
  const table = tableOf(bar);
  if (table)
    paint2(bar, rowsOf2(table).length);
}
function clear(bar) {
  const table = tableOf(bar);
  if (table)
    window.tsunami.table.select(table, rowsOf2(table), false);
}
document.addEventListener("tsunami:select", (e) => {
  for (const bar of document.querySelectorAll(BAR)) {
    const table = tableOf(bar);
    if (table && table === e.target)
      paint2(bar, e.detail.count);
  }
});
document.addEventListener("click", (e) => {
  const button = e.target.closest?.("[data-bulk-clear]");
  const bar = button?.closest(BAR);
  if (bar)
    clear(bar);
});
var init2 = (root) => {
  if (root.matches?.(BAR))
    update3(root);
  for (const bar of root.querySelectorAll(BAR))
    update3(bar);
};
var start3 = () => {
  init2(document);
  new MutationObserver((records) => {
    for (const r of records)
      for (const node of r.addedNodes)
        if (node.nodeType === 1)
          init2(node);
  }).observe(document.body, { childList: true, subtree: true });
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start3);
else
  start3();
(window.tsunami ??= {}).bulkBar = { update: update3, clear };

// src/js/copy.js
var RESET = 1500;
var timers = new WeakMap;
var region;
function announce3(msg) {
  if (!region || !region.isConnected) {
    region = document.createElement("span");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
    document.body.append(region);
  }
  region.textContent = "";
  setTimeout(() => region.textContent = msg, 50);
}
function legacy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(ta);
  const prev = document.activeElement;
  ta.select();
  let ok;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  prev?.focus?.();
  return ok;
}
async function copy(text) {
  text = String(text ?? "");
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  return legacy(text);
}
function source2(btn) {
  if (btn.dataset.copy !== undefined)
    return btn.dataset.copy;
  const el = document.querySelector(btn.dataset.copyTarget || "");
  if (!el)
    return null;
  return "value" in el ? el.value : el.textContent.trim();
}
document.addEventListener("click", async (e) => {
  const btn = e.target.closest?.("[data-copy], [data-copy-target]");
  if (!btn || btn.disabled)
    return;
  const text = source2(btn);
  if (text === null)
    return;
  if (!await copy(text))
    return;
  btn.setAttribute("data-copied", "");
  clearTimeout(timers.get(btn));
  timers.set(btn, setTimeout(() => btn.removeAttribute("data-copied"), RESET));
  announce3("Copied");
  const label = btn.dataset.copyToast;
  if (label !== undefined)
    window.tsunami?.toast?.(label || "Copied");
  btn.dispatchEvent(new CustomEvent("tsunami:copy", { bubbles: true, detail: { text } }));
});
var PRE = ".code-block > pre";
var focusable = (node) => {
  const list = node.matches?.(PRE) ? [node] : [];
  for (const pre of [...list, ...node.querySelectorAll?.(PRE) ?? []])
    if (!pre.hasAttribute("tabindex"))
      pre.tabIndex = 0;
};
var startFocusable = () => {
  focusable(document);
  new MutationObserver((records) => {
    for (const r of records)
      r.addedNodes.forEach(focusable);
  }).observe(document.documentElement, { childList: true, subtree: true });
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", startFocusable);
else
  startFocusable();
(window.tsunami ??= {}).copy = copy;

// src/js/filter-bar.js
var BAR2 = ".filter-bar";
var chips = (bar) => [...bar.querySelectorAll(":scope > .chip")];
var values = (bar) => chips(bar).map((c) => c.dataset.value ?? c.textContent.trim());
function refresh5(bar) {
  const clear = bar.querySelector(":scope > [data-clear]");
  if (clear)
    clear.hidden = !chips(bar).length;
}
function changed(bar) {
  refresh5(bar);
  bar.dispatchEvent(new CustomEvent("tsunami:filterchange", {
    bubbles: true,
    detail: { values: values(bar) }
  }));
}
function remove(bar, chip) {
  const next = chip.nextElementSibling;
  const ok = chip.dispatchEvent(new CustomEvent("tsunami:chipremove", {
    bubbles: true,
    cancelable: true,
    detail: {
      value: chip.dataset.value ?? chip.textContent.trim(),
      label: chip.textContent.trim()
    }
  }));
  if (!ok)
    return;
  chip.remove();
  changed(bar);
  (next?.querySelector("button") ?? chips(bar).at(-1)?.querySelector("button"))?.focus();
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest?.(`${BAR2} > .chip > button, ${BAR2} > [data-clear]`);
  if (!btn)
    return;
  const bar = btn.closest(BAR2);
  if (btn.matches("[data-clear]")) {
    for (const c of chips(bar))
      c.remove();
    changed(bar);
  } else
    remove(bar, btn.parentElement);
});
function mount5(root = document) {
  for (const bar of root.querySelectorAll(BAR2))
    refresh5(bar);
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount5(), { once: true });
else
  mount5();
new MutationObserver((records) => {
  if (document.readyState === "loading")
    return;
  for (const r of records)
    for (const n of r.addedNodes)
      if (n.nodeType === 1 && (n.matches(BAR2) || n.querySelector(BAR2)))
        return mount5();
}).observe(document.documentElement, { childList: true, subtree: true });
(window.tsunami ??= {}).filterBar = {
  mount: mount5,
  values: (bar) => values(bar),
  clear(bar) {
    for (const c of chips(bar))
      c.remove();
    changed(bar);
  }
};

// src/js/tag-input.js
var TAGS = ".tag-input";
var tags = (el) => el._tags ??= [];
var text = (el) => el.querySelector('input[type="text"]');
function split(s) {
  return s.split(/[,\n\r]/).map((t) => t.trim()).filter(Boolean);
}
function chip(el, tag) {
  const c = document.createElement("span");
  c.className = "chip";
  c.append(tag);
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("aria-label", `Remove ${tag}`);
  b.innerHTML = '<i class="icon icon-x" aria-hidden="true"></i>';
  c.append(b);
  return c;
}
function render2(el) {
  for (const c of el.querySelectorAll(":scope > .chip"))
    c.remove();
  const input = text(el);
  for (const t of tags(el))
    el.insertBefore(chip(el, t), input);
  const hidden = el.querySelector('input[type="hidden"]');
  if (hidden)
    hidden.value = tags(el).join(",");
}
function say(el, text) {
  if (el._status)
    el._status.textContent = text;
}
function change(el) {
  render2(el);
  const n = tags(el).length;
  say(el, n === 0 ? "No tags" : n === 1 ? "1 tag" : `${n} tags`);
  el.dispatchEvent(new CustomEvent("tsunami:tagschange", {
    bubbles: true,
    detail: { value: [...tags(el)] }
  }));
}
function add(el, list) {
  const max = Number(el.dataset.max) || Infinity;
  let added = false;
  for (const t of list) {
    if (tags(el).length >= max) {
      say(el, `Limit of ${max} tags reached`);
      break;
    }
    if (tags(el).includes(t))
      continue;
    tags(el).push(t);
    added = true;
  }
  if (added)
    change(el);
  return added;
}
function setDisabled(el) {
  const off = "disabled" in el.dataset;
  text(el).disabled = off;
}
function start4(el) {
  const list = split(el.dataset.value ?? "");
  el._tags = [];
  for (const t of list)
    if (!el._tags.includes(t))
      el._tags.push(t);
  render2(el);
}
function mount6(root = document) {
  for (const el of root.querySelectorAll(TAGS)) {
    if (el.dataset.mounted)
      continue;
    el.dataset.mounted = "";
    if (!text(el)) {
      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      if (el.getAttribute("aria-label"))
        input.setAttribute("aria-label", el.getAttribute("aria-label"));
      el.append(input);
    }
    if (el.dataset.name && !el.querySelector('input[type="hidden"]')) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = el.dataset.name;
      el.append(hidden);
    }
    el._status = document.createElement("p");
    el._status.setAttribute("role", "status");
    el._status.setAttribute("data-sr-only", "");
    el.append(el._status);
    setDisabled(el);
    start4(el);
  }
}
var field = (e) => e.target.closest?.(`${TAGS} > input[type="text"]`);
document.addEventListener("keydown", (e) => {
  const input = field(e);
  if (!input || e.isComposing)
    return;
  const el = input.closest(TAGS);
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    if (add(el, split(input.value)))
      input.value = "";
    else if (input.value.trim() && tags(el).includes(input.value.trim()))
      input.value = "";
  } else if (e.key === "Backspace" && !input.value && tags(el).length) {
    tags(el).pop();
    change(el);
  }
});
document.addEventListener("paste", (e) => {
  const input = field(e);
  if (!input)
    return;
  const el = input.closest(TAGS);
  const pasted = e.clipboardData.getData("text");
  if (!/[,\n\r]/.test(pasted))
    return;
  e.preventDefault();
  add(el, split(input.value + pasted));
  input.value = "";
});
document.addEventListener("focusout", (e) => {
  const input = field(e);
  if (!input || !input.value.trim())
    return;
  const el = input.closest(TAGS);
  add(el, split(input.value));
  input.value = "";
});
document.addEventListener("click", (e) => {
  const el = e.target.closest?.(TAGS);
  if (!el || "disabled" in el.dataset)
    return;
  const btn = e.target.closest("button");
  if (btn && btn.parentElement.matches(".chip") && btn.closest(TAGS) === el) {
    const chips = [...el.querySelectorAll(":scope > .chip")];
    tags(el).splice(chips.indexOf(btn.parentElement), 1);
    change(el);
    text(el).focus();
  } else if (!btn)
    text(el).focus();
});
document.addEventListener("reset", (e) => setTimeout(() => {
  for (const el of e.target.querySelectorAll(TAGS)) {
    text(el).value = "";
    start4(el);
  }
}));
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount6(), { once: true });
else
  mount6();
new MutationObserver((records) => {
  if (document.readyState === "loading")
    return;
  for (const r of records)
    for (const n of r.addedNodes)
      if (n.nodeType === 1 && (n.matches(TAGS) || n.querySelector(TAGS)))
        return mount6();
}).observe(document.documentElement, { childList: true, subtree: true });
(window.tsunami ??= {}).tagInput = {
  mount: mount6,
  value: (el) => [...tags(el)],
  set(el, list) {
    el._tags = [];
    add(el, list.map((t) => String(t).trim()).filter(Boolean));
    change(el);
  },
  clear(el) {
    el._tags = [];
    change(el);
  }
};

// src/js/stepper.js
var FIELD3 = "input, select, textarea";
var root2 = (el) => (typeof el === "string" ? document.querySelector(el) : el)?.closest?.(".stepper");
var itemsOf = (s) => [...s.querySelectorAll(":scope > ol > li")];
var panelsOf = (s) => [...s.querySelectorAll(":scope > section")];
var current2 = new WeakMap;
var uid4 = 0;
var index = (el) => {
  const s = root2(el);
  return s ? current2.get(s) ?? 0 : -1;
};
function render3(s, i, focus) {
  const items = itemsOf(s);
  const panels = panelsOf(s);
  const linear = s.hasAttribute("data-linear");
  items.forEach((li, n) => {
    const b = li.querySelector(":scope > button");
    if (!b)
      return;
    b.dataset.state = n < i ? "done" : n === i ? "current" : "upcoming";
    if (n === i)
      b.setAttribute("aria-current", "step");
    else
      b.removeAttribute("aria-current");
    if (linear && n > i)
      b.setAttribute("aria-disabled", "true");
    else
      b.removeAttribute("aria-disabled");
    const p = panels[n];
    if (!p)
      return;
    p.hidden = n !== i;
    b.id ||= `stepper-${++uid4}`;
    p.setAttribute("role", "group");
    p.setAttribute("aria-labelledby", b.id);
  });
  if (!focus)
    return;
  const p = panels[i];
  const target = p?.querySelector("h2, h3, h4, h5, h6") ?? [...p?.querySelectorAll(FIELD3) ?? []].find((f) => f.type !== "hidden") ?? p;
  if (target && !target.matches(FIELD3))
    target.tabIndex = -1;
  target?.focus();
}
function valid(s) {
  const p = panelsOf(s)[index(s)];
  if (!p || !s.hasAttribute("data-validate") || p.hasAttribute("data-optional"))
    return true;
  for (const f of p.querySelectorAll(FIELD3)) {
    if (!f.willValidate)
      continue;
    if (!f.reportValidity())
      return false;
  }
  return true;
}
function show3(s, i, focus) {
  touched.add(s);
  current2.set(s, i);
  render3(s, i, focus);
  s.dispatchEvent(new CustomEvent("tsunami:stepchange", {
    bubbles: true,
    detail: { index: i, step: itemsOf(s)[i], panel: panelsOf(s)[i] }
  }));
}
function go(el, to, focus = true) {
  const s = root2(el);
  const last = s ? itemsOf(s).length - 1 : -1;
  if (!s || !Number.isInteger(to) || to < 0 || to > last)
    return false;
  const from = index(s);
  if (to === from)
    return true;
  if (to < from)
    return show3(s, to, focus), true;
  if (!s.hasAttribute("data-linear")) {
    if (!valid(s))
      return false;
    return show3(s, to, focus), true;
  }
  for (let i = from;i < to; i++) {
    if (!valid(s))
      return false;
    show3(s, i + 1, focus);
  }
  return true;
}
function next(el, focus = true) {
  const s = root2(el);
  if (!s)
    return false;
  const i = index(s);
  if (i < itemsOf(s).length - 1)
    return go(s, i + 1, focus);
  if (!valid(s))
    return false;
  s.dispatchEvent(new CustomEvent("tsunami:stepcomplete", { bubbles: true, detail: { index: i } }));
  return true;
}
var prev = (el, focus = true) => {
  const s = root2(el);
  return s ? go(s, index(s) - 1, focus) : false;
};
document.addEventListener("click", (e) => {
  const b = e.target.closest?.(".stepper > ol > li > button, .stepper [data-next], .stepper [data-prev]");
  if (!b)
    return;
  const s = b.closest(".stepper");
  if (b.matches("[data-next]")) {
    if (!next(s) && b.type === "submit")
      e.preventDefault();
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
  const own = f?.closest(".tag-input, .phone-input, .time-picker, .select, .autocomplete, .date-picker");
  if (e.key === "Enter" && f && !own && !e.defaultPrevented && /^(?!checkbox|radio|submit|button)/.test(f.type)) {
    const p = f.closest(".stepper > section");
    if (p.querySelector('[type="submit"]'))
      return;
    e.preventDefault();
    next(p);
    return;
  }
  const b = e.target.closest?.(".stepper > ol > li > button");
  if (!b)
    return;
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
  if (!keys.includes(e.key))
    return;
  const all = [...b.closest("ol").querySelectorAll(":scope > li > button")].filter((x) => x.getAttribute("aria-disabled") !== "true");
  const n = all.indexOf(b);
  const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
  const rtl = getComputedStyle(b).direction === "rtl";
  const step = e.key === "ArrowUp" || e.key === "ArrowDown" ? forward ? 1 : -1 : e.key === "ArrowRight" !== rtl ? 1 : -1;
  const to = e.key === "Home" ? all[0] : e.key === "End" ? all.at(-1) : all[(n + step + all.length) % all.length];
  e.preventDefault();
  to?.focus();
});
var touched = new WeakSet;
function setup(node) {
  if (node.nodeType !== 1)
    return;
  for (const s of node.matches(".stepper") ? [node] : node.querySelectorAll(".stepper")) {
    if (touched.has(s))
      continue;
    const i = itemsOf(s).findIndex((li) => li.querySelector(':scope > button:is([data-state="current"], [aria-current="step"])'));
    current2.set(s, Math.max(i, 0));
    render3(s, Math.max(i, 0), false);
  }
}
function start5() {
  setup(document.documentElement);
  new MutationObserver((records) => {
    for (const r of records) {
      const s = r.target.closest?.(".stepper");
      if (s)
        setup(s);
      r.addedNodes.forEach(setup);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start5, { once: true });
else
  start5();
(window.tsunami ??= {}).stepper = { go, next, prev, index };

// src/js/validate.js
var FIELD4 = "input:not([type='hidden']), select, textarea";
var fieldsOf = (form) => [...form.querySelectorAll(FIELD4)];
var box2 = (f) => f.closest(".field");
function errorOf(f) {
  const wrap = box2(f);
  if (!wrap)
    return null;
  let el = wrap.querySelector(":scope [data-error]");
  if (!el) {
    el = document.createElement("small");
    el.setAttribute("data-error", "");
    wrap.append(el);
  }
  el.id ||= `${f.id || f.name || "field"}-error`;
  return el;
}
function describe(f, el, on) {
  const ids = new Set((f.getAttribute("aria-describedby") || "").split(/\s+/));
  ids.delete("");
  if (on)
    ids.add(el.id);
  else
    ids.delete(el.id);
  if (ids.size)
    f.setAttribute("aria-describedby", [...ids].join(" "));
  else
    f.removeAttribute("aria-describedby");
}
function check3(target) {
  if (target.matches?.("form"))
    return fieldsOf(target).map(check3).every(Boolean);
  const f = target;
  if (!f.willValidate)
    return true;
  const ok = f.checkValidity();
  const el = errorOf(f);
  if (ok)
    f.removeAttribute("aria-invalid");
  else
    f.setAttribute("aria-invalid", "true");
  if (el) {
    const text = ok ? "" : f.dataset.message || f.validationMessage;
    if (el.textContent !== text)
      el.textContent = text;
    if (ok)
      el.removeAttribute("role");
    else
      el.setAttribute("role", "alert");
    describe(f, el, !ok);
  }
  return ok;
}
function clear2(target) {
  const list = target.matches?.("form") ? fieldsOf(target) : [target];
  for (const f of list) {
    touched2.delete(f);
    f.removeAttribute("aria-invalid");
    const el = box2(f)?.querySelector(":scope [data-error]");
    if (el) {
      el.textContent = "";
      el.removeAttribute("role");
      describe(f, el, false);
    }
  }
}
var touched2 = new WeakSet;
var formOf2 = (e) => {
  const f = e.target.closest?.("form[data-validate]");
  return f && e.target.matches?.(FIELD4) ? f : null;
};
var mount7 = (node) => {
  if (node.matches?.("form[data-validate]"))
    node.noValidate = true;
  node.querySelectorAll?.("form[data-validate]").forEach((f) => {
    f.noValidate = true;
  });
};
mount7(document);
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount7(document));
new MutationObserver((records) => {
  for (const r of records)
    r.addedNodes.forEach(mount7);
}).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("focusout", (e) => {
  if (!formOf2(e))
    return;
  touched2.add(e.target);
  check3(e.target);
});
document.addEventListener("input", (e) => {
  if (formOf2(e) && touched2.has(e.target))
    check3(e.target);
});
document.addEventListener("change", (e) => {
  if (formOf2(e)) {
    touched2.add(e.target);
    check3(e.target);
  }
});
document.addEventListener("submit", (e) => {
  const form = e.target.closest?.("form[data-validate]");
  if (!form)
    return;
  const bad = fieldsOf(form).filter((f) => {
    touched2.add(f);
    return !check3(f);
  });
  if (!bad.length)
    return;
  e.preventDefault();
  bad[0].focus();
});
document.addEventListener("reset", (e) => {
  if (e.target.matches?.("form[data-validate]"))
    clear2(e.target);
});
(window.tsunami ??= {}).validate = { check: check3, clear: clear2 };

// src/js/phone-input.js
var ROOT3 = ".phone-input";
var DATA = "93AF 355AL 213DZ 1684AS 376AD 244AO 1264AI 1268AG 54AR 374AM 297AW 61AU 43AT 994AZ 1242BS 973BH 880BD 1246BB 375BY 32BE 501BZ 229BJ 1441BM 975BT 591BO 599CW 599BQ 387BA 267BW 55BR 246IO 1284VG 673BN 359BG 226BF 257BI 855KH 237CM 1US 1CA 238CV 1345KY 236CF 235TD 56CL 86CN 61CX 61CC 57CO 269KM 242CG 243CD 682CK 506CR 225CI 385HR 53CU 357CY 420CZ 45DK 253DJ 1767DM 1809DO 1829DO 1849DO 593EC 20EG 503SV 240GQ 291ER 372EE 268SZ 251ET 500FK 298FO 679FJ 358FI 33FR 594GF 689PF 241GA 220GM 995GE 49DE 233GH 350GI 30GR 299GL 1473GD 590GP 1671GU 502GT 44GB 44GG 224GN 245GW 592GY 509HT 504HN 852HK 36HU 354IS 91IN 62ID 98IR 964IQ 353IE 44IM 972IL 39IT 1876JM 81JP 44JE 962JO 7RU 7KZ 254KE 686KI 383XK 965KW 996KG 856LA 371LV 961LB 266LS 231LR 218LY 423LI 370LT 352LU 853MO 261MG 265MW 60MY 960MV 223ML 356MT 692MH 596MQ 222MR 230MU 262RE 262YT 52MX 691FM 373MD 377MC 976MN 382ME 1664MS 212MA 258MZ 95MM 264NA 674NR 977NP 31NL 687NC 64NZ 505NI 227NE 234NG 683NU 672NF 850KP 389MK 1670MP 47NO 968OM 92PK 680PW 970PS 507PA 675PG 595PY 51PE 63PH 48PL 351PT 1787PR 1939PR 974QA 40RO 250RW 590BL 290SH 1869KN 1758LC 590MF 508PM 1784VC 685WS 378SM 239ST 966SA 221SN 381RS 248SC 232SL 65SG 1721SX 421SK 386SI 677SB 252SO 27ZA 82KR 211SS 34ES 94LK 249SD 597SR 47SJ 46SE 41CH 963SY 886TW 992TJ 255TZ 66TH 670TL 228TG 690TK 676TO 1868TT 216TN 90TR 993TM 1649TC 688TV 1340VI 256UG 380UA 971AE 598UY 998UZ 678VU 379VA 58VE 84VN 681WF 212EH 967YE 260ZM 263ZW 358AX";
var TRUNK = new Set("TH VN ID MY PH IN JP KR TR ZA AU NZ FR DE AT CH NL BE GB GG JE IM IE IL EG SA AE PK BD LK KE NG".split(" "));
var S3 = new WeakMap;
var byCode = new Map;
var dials = new Map;
var list;
var uid5 = 0;
function h5(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs))
    el.setAttribute(k, v);
  el.append(...kids);
  return el;
}
var flag2 = (c) => h5("span", { class: `flag flag-${c.toLowerCase()}`, "aria-hidden": "true" });
var show4 = (c) => `+${c.dial.length === 4 && c.dial[0] === "1" ? `1 ${c.dial.slice(1)}` : c.dial}`;
function countries() {
  if (list)
    return list;
  let names;
  try {
    names = new Intl.DisplayNames([document.documentElement.lang || "en"], {
      type: "region"
    });
  } catch {}
  for (const [, dial, code] of DATA.matchAll(/(\d+)([A-Z]{2})/g)) {
    if (!dials.has(dial))
      dials.set(dial, code);
    if (!byCode.has(code))
      byCode.set(code, { code, dial, name: names?.of(code) || code });
  }
  list = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}
function match(digits) {
  for (let n = Math.min(4, digits.length);n > 0; n--) {
    const code = dials.get(digits.slice(0, n));
    if (code)
      return { code, rest: digits.slice(n) };
  }
  return null;
}
var country = (root) => byCode.get(root.dataset.country) ?? byCode.get("US");
function value2(root) {
  const c = country(root);
  let digits = S3.get(root).input.value.replace(/\D/g, "");
  if (TRUNK.has(c.code) && digits[0] === "0")
    digits = digits.slice(1);
  return {
    country: c.code,
    dial: `+${c.dial}`,
    number: digits,
    value: digits ? `+${c.dial}${digits}` : ""
  };
}
function sync9(root, emit) {
  const st = S3.get(root);
  const v = value2(root);
  const c = country(root);
  st.flag.className = `flag flag-${c.code.toLowerCase()}`;
  st.dial.textContent = show4(c);
  st.btn.setAttribute("aria-label", `Country: ${c.name} ${show4(c)}`);
  if (st.hidden)
    st.hidden.value = v.value;
  const key = `${v.country}${v.value}`;
  if (key === st.last)
    return;
  st.last = key;
  if (!emit)
    return;
  if (st.hidden) {
    st.hidden.dispatchEvent(new Event("input", { bubbles: true }));
    st.hidden.dispatchEvent(new Event("change", { bubbles: true }));
  }
  root.dispatchEvent(new CustomEvent("tsunami:phonechange", { bubbles: true, detail: v }));
}
function typed2(root, final) {
  const { input } = S3.get(root);
  const v = input.value.trim();
  if (v[0] !== "+")
    return;
  const m = match(v.replace(/\D/g, ""));
  if (!m || !final && !m.rest)
    return;
  input.value = m.rest;
  root.dataset.country = m.code;
}
function setFrom(root, text, emit = false) {
  S3.get(root).input.value = text;
  typed2(root, true);
  sync9(root, emit);
}
function build3(root) {
  if (S3.has(root))
    return;
  const group = root.querySelector(".input-group");
  const input = group?.querySelector('input:not([type="hidden"])');
  if (!input)
    return;
  countries();
  const id = `phone-input-${++uid5}`;
  const fl = flag2("US");
  const dial = h5("span");
  const btn = h5("button", {
    type: "button",
    popovertarget: `${id}-pop`,
    "aria-haspopup": "listbox",
    "aria-expanded": "false"
  }, fl, dial);
  const search = h5("input", {
    type: "text",
    role: "combobox",
    autocomplete: "off",
    placeholder: "Search country or code",
    "aria-label": "Search countries",
    "aria-controls": `${id}-list`,
    "aria-expanded": "true"
  });
  const box = h5("div", {
    role: "listbox",
    id: `${id}-list`,
    "aria-label": "Countries"
  });
  const none = h5("p", { hidden: "" }, "No country found");
  const pop = h5("div", { popover: "auto", id: `${id}-pop` }, search, box, none);
  const hidden = root.dataset.name ? h5("input", { type: "hidden", name: root.dataset.name }) : null;
  group.prepend(btn);
  if (hidden)
    input.after(hidden);
  root.append(pop);
  S3.set(root, {
    input,
    btn,
    flag: fl,
    dial,
    search,
    box,
    none,
    pop,
    hidden,
    initial: root.dataset.country || "US",
    last: null
  });
  if (!input.hasAttribute("autocomplete"))
    input.setAttribute("autocomplete", "tel-national");
  disable(root);
  setFrom(root, input.value);
}
function disable(root) {
  const st = S3.get(root);
  st.btn.disabled = st.input.disabled;
  if (st.hidden)
    st.hidden.disabled = st.input.disabled;
}
function render4(root, q = "") {
  const st = S3.get(root);
  const term = q.trim().toLowerCase().replace(/^\+/, "");
  const cur = country(root).code;
  const frag = document.createDocumentFragment();
  for (const c of list) {
    if (term && !`${c.name} ${c.code} ${c.dial}`.toLowerCase().includes(term))
      continue;
    const el = h5("div", {
      role: "option",
      id: `${st.box.id}-${c.code}`,
      "aria-selected": String(c.code === cur)
    }, flag2(c.code), h5("span", {}, c.name), h5("small", {}, show4(c)));
    el.code = c.code;
    frag.append(el);
  }
  st.box.replaceChildren(frag);
  st.none.hidden = st.box.children.length > 0;
  activate3(root, st.box.querySelector('[aria-selected="true"]') ?? st.box.firstElementChild);
}
function activate3(root, el) {
  const st = S3.get(root);
  st.box.querySelector("[data-active]")?.removeAttribute("data-active");
  if (!el)
    return st.search.removeAttribute("aria-activedescendant");
  el.setAttribute("data-active", "");
  st.search.setAttribute("aria-activedescendant", el.id);
  el.scrollIntoView({ block: "nearest" });
}
function place4(root) {
  const { pop } = S3.get(root);
  const r = root.querySelector(".input-group").getBoundingClientRect();
  const width = Math.min(320, innerWidth - 32);
  const above = r.bottom + 330 > innerHeight && r.top > 330;
  Object.assign(pop.style, {
    width: `${width}px`,
    left: `${Math.max(16, Math.min(r.left, innerWidth - width - 16))}px`,
    top: above ? "auto" : `${r.bottom + 4}px`,
    bottom: above ? `${innerHeight - r.top + 4}px` : "auto"
  });
}
function choose3(root, code) {
  const st = S3.get(root);
  st.pop.hidePopover();
  root.dataset.country = code;
  sync9(root, true);
  st.input.focus();
}
var rootOf4 = (el) => el?.closest?.(ROOT3);
var ready2 = (el) => {
  const root = rootOf4(el);
  return root && S3.has(root) ? root : null;
};
var OPTION = `${ROOT3} [role="option"]`;
function toggled(e) {
  const root = e.target.matches?.(`${ROOT3} > [popover]`) && ready2(e.target);
  if (!root)
    return;
  if (e.type === "toggle")
    root.querySelector("button[aria-haspopup]")?.setAttribute("aria-expanded", String(e.newState === "open"));
  if (e.newState !== "open")
    return;
  if (e.type === "beforetoggle")
    return place4(root);
  const { search } = S3.get(root);
  search.value = "";
  render4(root);
  search.focus();
}
document.addEventListener("beforetoggle", toggled, true);
document.addEventListener("toggle", toggled, true);
document.addEventListener("input", (e) => {
  const root = ready2(e.target);
  if (!root)
    return;
  const st = S3.get(root);
  if (e.target === st.search)
    render4(root, st.search.value);
  else if (e.target === st.input) {
    typed2(root, false);
    sync9(root, true);
  }
});
document.addEventListener("change", (e) => {
  const root = ready2(e.target);
  if (root && e.target === S3.get(root).input) {
    typed2(root, true);
    sync9(root, true);
  }
});
document.addEventListener("click", (e) => {
  const opt = e.target.closest?.(OPTION);
  const root = ready2(opt);
  if (root)
    choose3(root, opt.code);
});
document.addEventListener("mouseover", (e) => {
  const opt = e.target.closest?.(OPTION);
  const root = ready2(opt);
  if (root && !opt.hasAttribute("data-active"))
    activate3(root, opt);
});
document.addEventListener("keydown", (e) => {
  const root = ready2(e.target);
  if (!root)
    return;
  const st = S3.get(root);
  if (e.target === st.btn && e.key === "ArrowDown" && !st.btn.disabled) {
    e.preventDefault();
    st.pop.showPopover();
  }
  if (e.target !== st.search)
    return;
  const opts = [...st.box.children];
  const at = opts.findIndex((o) => o.hasAttribute("data-active"));
  const go = {
    ArrowDown: at + 1,
    ArrowUp: at - 1,
    Home: 0,
    End: opts.length - 1
  }[e.key];
  if (go !== undefined) {
    e.preventDefault();
    activate3(root, opts[Math.max(0, Math.min(opts.length - 1, go))]);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (opts[at])
      choose3(root, opts[at].code);
  }
});
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    e.target.querySelectorAll(ROOT3).forEach((root) => {
      const st = S3.get(root);
      if (!st)
        return;
      root.dataset.country = st.initial;
      setFrom(root, st.input.value);
    });
  });
});
function get2(el) {
  const root = rootOf4(el) ?? el;
  return S3.has(root) ? value2(root) : null;
}
function set3(el, v) {
  const root = rootOf4(el) ?? el;
  if (!S3.has(root))
    return;
  if (typeof v === "string")
    return setFrom(root, v, true);
  if (v.country && byCode.has(String(v.country).toUpperCase()))
    root.dataset.country = String(v.country).toUpperCase();
  setFrom(root, String(v.number ?? ""), true);
}
var buildAll = (r = document) => r.querySelectorAll(ROOT3).forEach(build3);
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => buildAll());
else
  buildAll();
new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === "attributes") {
      const root = ready2(r.target);
      if (root && r.target === S3.get(root).input)
        disable(root);
      continue;
    }
    for (const n of r.addedNodes) {
      if (n.nodeType !== 1)
        continue;
      if (n.matches(ROOT3))
        build3(n);
      else
        buildAll(n);
    }
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["disabled"]
});
(window.tsunami ??= {}).phoneInput = { get: get2, set: set3 };

// src/js/time-picker.js
var ROOT4 = ".time-picker";
var SEGMENT = `${ROOT4} > input[role="spinbutton"]`;
var states3 = new WeakMap;
var TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
var pad = (n) => String(n).padStart(2, "0");
function parse3(text) {
  const m = TIME.exec(String(text ?? "").trim());
  if (!m)
    return null;
  const t = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  return t[0] < 24 && t[1] < 60 && t[2] < 60 ? t : null;
}
var seconds = (t) => t[0] * 3600 + t[1] * 60 + t[2];
function mount8(root) {
  if (states3.has(root))
    return;
  const withSeconds = root.hasAttribute("data-seconds");
  const hour12 = root.hasAttribute("data-hour12");
  const hidden = root.querySelector(':scope > input[type="hidden"]') ?? root.appendChild(Object.assign(document.createElement("input"), {
    type: "hidden",
    name: root.dataset.name ?? ""
  }));
  const start = hidden.defaultValue || root.getAttribute("value") || "";
  const keys = ["h", "m", ...withSeconds ? ["s"] : [], ...hour12 ? ["p"] : []];
  const spec = {
    h: { label: "Hour", min: hour12 ? 1 : 0, max: hour12 ? 12 : 23 },
    m: { label: "Minute", min: 0, max: 59 },
    s: { label: "Second", min: 0, max: 59 },
    p: { label: "AM or PM", min: 0, max: 1 }
  };
  const state = {
    root,
    hidden,
    start,
    withSeconds,
    hour12,
    keys,
    spec,
    f: { h: null, m: null, s: null, p: null },
    buf: "",
    last: "",
    segs: {}
  };
  states3.set(root, state);
  root.setAttribute("role", "group");
  if (!root.hasAttribute("aria-label"))
    root.setAttribute("aria-label", "Time");
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
    if (key === "p")
      el.readOnly = true;
    else
      el.inputMode = "numeric";
    state.segs[key] = el;
    if (key === "m" || key === "s")
      parts.push(Object.assign(document.createElement("span"), { textContent: ":" }));
    if (key === "p")
      parts.push(Object.assign(document.createElement("span"), { textContent: " " }));
    parts.push(el);
  }
  for (const span of parts)
    if (span.localName === "span")
      span.setAttribute("aria-hidden", "true");
  root.prepend(...parts);
  root.setAttribute("data-time-picker-initialized", "true");
  Object.defineProperty(root, "value", {
    configurable: true,
    get: () => state.last,
    set(v) {
      assign(state, parse3(v));
    }
  });
  assign(state, parse3(start), true);
  disable2(state);
}
function destroy3(root) {
  const state = states3.get(root);
  if (!state)
    return;
  for (const el of root.querySelectorAll(':scope > [role="spinbutton"], :scope > span'))
    el.remove();
  delete root.value;
  root.removeAttribute("data-time-picker-initialized");
  states3.delete(root);
}
var disable2 = (state) => {
  for (const el of Object.values(state.segs))
    el.disabled = state.root.hasAttribute("disabled");
};
function assign(state, t, quiet = false) {
  const { f, hour12 } = state;
  if (!t)
    Object.assign(f, { h: null, m: null, s: null, p: null });
  else {
    f.h = hour12 ? t[0] % 12 || 12 : t[0];
    f.m = t[1];
    f.s = t[2];
    f.p = hour12 ? t[0] >= 12 : null;
  }
  state.buf = "";
  write2(state, quiet);
}
function time(state) {
  const { f, hour12, withSeconds, keys } = state;
  if (keys.some((k) => f[k] === null))
    return null;
  const h = hour12 ? f.h % 12 + (f.p ? 12 : 0) : f.h;
  return [h, f.m, withSeconds ? f.s : 0];
}
function fill(state) {
  const { f, hour12, keys } = state;
  if (keys.every((k) => f[k] === null))
    return;
  for (const k of keys)
    if (f[k] === null)
      f[k] = k === "h" ? hour12 ? 12 : 0 : k === "p" ? false : 0;
}
function limits2(state) {
  const { min, max } = state.root.dataset;
  return [min && parse3(min), max && parse3(max)];
}
function clamp(state) {
  const t = time(state);
  if (!t)
    return;
  const [lo, hi] = limits2(state);
  if (lo && seconds(t) < seconds(lo))
    assign(state, lo);
  else if (hi && seconds(t) > seconds(hi))
    assign(state, hi);
}
function write2(state, quiet) {
  const { root, hidden, f, keys, segs, spec } = state;
  for (const key of keys) {
    const el = segs[key];
    const v = f[key];
    const empty = v === null;
    const text = key === "p" ? v ? "PM" : "AM" : pad(v ?? 0);
    el.value = empty ? "--" : text;
    el.setAttribute("aria-valuetext", empty ? "Empty" : text);
    if (empty)
      el.removeAttribute("aria-valuenow");
    else
      el.setAttribute("aria-valuenow", key === "p" ? Number(v) : v);
    el.setAttribute("aria-valuemin", spec[key].min);
    el.setAttribute("aria-valuemax", spec[key].max);
  }
  const t = time(state);
  const value = t ? `${pad(t[0])}:${pad(t[1])}${state.withSeconds ? `:${pad(t[2])}` : ""}` : "";
  if (value === state.last)
    return;
  state.last = value;
  hidden.value = value;
  if (quiet)
    return;
  hidden.dispatchEvent(new Event("input", { bubbles: true }));
  hidden.dispatchEvent(new Event("change", { bubbles: true }));
  root.dispatchEvent(new CustomEvent("tsunami:timechange", { bubbles: true, detail: { value } }));
}
function bump(state, key, dir) {
  const { f, spec } = state;
  if (key === "p")
    f.p = f.p === null ? dir < 0 : !f.p;
  else {
    const { min, max } = spec[key];
    const step = key === "m" ? Math.max(1, Number(state.root.dataset.step) || 1) : 1;
    const top = Math.floor((max - min) / step) * step + min;
    let v = f[key];
    if (v === null)
      v = dir > 0 ? min : top;
    else {
      v = dir > 0 ? (Math.floor((v - min) / step) + 1) * step + min : (Math.ceil((v - min) / step) - 1) * step + min;
      if (v > top)
        v = min;
      else if (v < min)
        v = top;
    }
    f[key] = v;
  }
  fill(state);
  state.buf = "";
  clamp(state);
  write2(state);
}
function set4(state, key, v) {
  state.f[key] = v;
  fill(state);
  state.buf = "";
  write2(state);
}
function type(state, key, digit) {
  const { min, max } = state.spec[key];
  const buf = state.bufKey === key && state.buf.length < 2 ? state.buf + digit : digit;
  const n = Math.min(max, Math.max(min, Number(buf)));
  const done = buf.length === 2 || Number(buf) * 10 > max;
  state.f[key] = n;
  fill(state);
  write2(state);
  state.buf = done ? "" : buf;
  state.bufKey = key;
  if (done)
    move(state, key, 1);
}
function move(state, key, by) {
  const next = state.keys[state.keys.indexOf(key) + by];
  if (next)
    state.segs[next].focus();
}
var of = (el) => {
  const root = el?.closest?.(ROOT4);
  return root && states3.get(root);
};
document.addEventListener("focusin", (e) => {
  if (!e.target.matches?.(SEGMENT))
    return;
  const state = of(e.target);
  if (state) {
    state.buf = "";
    e.target.select();
  }
});
document.addEventListener("click", (e) => {
  if (e.target.matches?.(SEGMENT))
    e.target.select();
  else if (e.target.matches?.(ROOT4))
    states3.get(e.target)?.segs.h.focus();
});
document.addEventListener("focusout", (e) => {
  const state = of(e.target);
  if (!state || !e.target.matches(SEGMENT))
    return;
  state.buf = "";
  if (!state.root.contains(e.relatedTarget))
    clamp(state);
});
document.addEventListener("keydown", (e) => {
  if (!e.target.matches?.(SEGMENT) || e.ctrlKey || e.metaKey || e.altKey)
    return;
  const state = of(e.target);
  if (!state)
    return;
  const key = e.target.dataset.segment;
  const { min, max } = state.spec[key];
  const handled = (fn) => {
    e.preventDefault();
    fn();
  };
  switch (e.key) {
    case "ArrowUp":
      return handled(() => bump(state, key, 1));
    case "ArrowDown":
      return handled(() => bump(state, key, -1));
    case "ArrowLeft":
      return handled(() => move(state, key, -1));
    case "ArrowRight":
      return handled(() => move(state, key, 1));
    case "Home":
      return handled(() => key === "p" ? set4(state, key, false) : set4(state, key, min));
    case "End":
      return handled(() => key === "p" ? set4(state, key, true) : set4(state, key, max));
    case "Backspace":
    case "Delete":
      return handled(() => {
        state.f[key] = null;
        state.buf = "";
        write2(state);
      });
    case ":":
    case ".":
    case ",":
    case " ":
      return handled(() => move(state, key, 1));
    case "a":
    case "A":
    case "p":
    case "P":
      if (key === "p")
        handled(() => set4(state, key, e.key.toLowerCase() === "p"));
      else
        e.preventDefault();
  }
});
document.addEventListener("beforeinput", (e) => {
  if (!e.target.matches?.(SEGMENT))
    return;
  const state = of(e.target);
  if (!state || e.inputType.startsWith("insertFromPaste"))
    return;
  e.preventDefault();
  const key = e.target.dataset.segment;
  if (e.inputType.startsWith("delete")) {
    state.f[key] = null;
    write2(state);
  } else
    for (const ch of e.data ?? "")
      if (/\d/.test(ch))
        type(state, key, ch);
});
document.addEventListener("paste", (e) => {
  if (!e.target.matches?.(SEGMENT))
    return;
  const state = of(e.target);
  const text = (e.clipboardData?.getData("text") ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(text);
  if (!state || !m)
    return e.preventDefault();
  e.preventDefault();
  let h = Number(m[1]);
  if (m[4])
    h = h % 12 + (m[4].toLowerCase() === "pm" ? 12 : 0);
  const t = parse3(`${h}:${m[2]}:${m[3] ?? "00"}`);
  if (t) {
    assign(state, t);
    clamp(state);
  }
});
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    for (const root of e.target.querySelectorAll(ROOT4)) {
      const state = states3.get(root);
      if (state)
        assign(state, parse3(state.start));
    }
  });
});
var mountAll = (scope = document) => {
  if (scope.matches?.(ROOT4))
    mount8(scope);
  for (const root of scope.querySelectorAll(ROOT4))
    mount8(root);
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mountAll());
else
  mountAll();
new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === "attributes") {
      const state = states3.get(r.target);
      if (state)
        disable2(state);
      continue;
    }
    for (const n of r.addedNodes)
      if (n.nodeType === 1)
        mountAll(n);
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["disabled"]
});
(window.tsunami ??= {}).timePicker = {
  mount: mount8,
  destroy: destroy3,
  get: (el) => states3.get(el)?.last ?? null,
  set: (el, value) => {
    const state = states3.get(el);
    if (state)
      assign(state, parse3(value));
  }
};

// src/js/sortable.js
var states4 = new WeakMap;
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
function destroy4(el) {
  const state = states4.get(el);
  if (!state)
    return;
  states4.delete(el);
  mounted2.delete(el);
  for (const name of MEMBERS)
    delete el[name];
  state.sortable.destroy();
}
function mount9(el, options = {}) {
  if (!window.Sortable)
    throw new Error("A .sortable needs SortableJS: load dist/sortable.min.js with its own <script> before the Tsunami script.");
  destroy4(el);
  const sortable = new window.Sortable(el, {
    ...defaults(el),
    ...fromData2(el),
    ...options
  });
  states4.set(el, { sortable });
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
var upgrade6 = (el) => {
  if (states4.has(el) || el.closest(".sortable-fallback"))
    return;
  try {
    mount9(el);
  } catch (error) {
    console.error(error.message, el);
  }
};
var all4 = (root) => root.querySelectorAll?.(".sortable").forEach(upgrade6);
var scan7 = () => {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => all4(document), {
      once: true
    });
  else
    all4(document);
};
scan7();
new MutationObserver((list) => list.forEach((m) => {
  if (document.readyState === "loading")
    return;
  if (m.type === "attributes") {
    const state = states4.get(m.target);
    if (state)
      state.sortable.option("disabled", m.target.hasAttribute("data-disabled"));
    return;
  }
  m.addedNodes.forEach((n) => {
    if (n.matches?.(".sortable"))
      upgrade6(n);
    all4(n);
  });
  m.removedNodes.forEach((n) => {
    if (n.isConnected)
      return;
    for (const el of mounted2)
      if (!el.isConnected)
        destroy4(el);
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
    id: item.getAttribute(states4.get(el).sortable.option("dataIdAttr")),
    oldIndex,
    newIndex
  }
}));
document.addEventListener("update", (e) => {
  if (e.from && e.target === e.from && states4.has(e.from))
    reorder(e.from, e.item, e.oldDraggableIndex, e.newDraggableIndex);
});
document.addEventListener("choose", (e) => {
  if (!states4.has(e.target))
    return;
  for (const cell of e.item.cells ?? [])
    cell.style.width = `${cell.getBoundingClientRect().width}px`;
});
document.addEventListener("unchoose", (e) => {
  if (!states4.has(e.target))
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
  const state = list && states4.get(list);
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
var ready3 = (el) => {
  if (!states4.has(el))
    mount9(el);
  return el;
};
(window.tsunami ??= {}).sortable = {
  mount: mount9,
  get: (el) => states4.get(el)?.sortable ?? null,
  destroy: destroy4,
  toArray: (el) => ready3(el).toArray(),
  sort: (el, order) => ready3(el).sort(order),
  disabled(el, value) {
    if (value !== undefined)
      ready3(el).disabled = value;
    return Boolean(ready3(el).disabled);
  }
};

// src/js/date-picker.js
var ROOT5 = ".date-picker";
var TO = " to ";
var states5 = new WeakMap;
var mounted3 = new Set;
var open2 = new Set;
var MEMBERS2 = ["value", "open", "close", "calendar"];
var uid6 = 0;
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
function parse4(text, count) {
  const parts = text.trim() === "" ? [] : text.split(TO).map((s) => s.trim());
  if (parts.length !== 0 && parts.length !== count)
    return null;
  return parts.every(isDate) ? parts.sort() : null;
}
var iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function shift(d, days) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}
var PRESETS = {
  today: (t) => [t, t],
  yesterday: (t) => [shift(t, -1), shift(t, -1)],
  tomorrow: (t) => [shift(t, 1), shift(t, 1)],
  "last-7-days": (t) => [shift(t, -6), t],
  "last-30-days": (t) => [shift(t, -29), t],
  "last-90-days": (t) => [shift(t, -89), t],
  "this-week": (t) => [shift(t, -((t.getDay() + 6) % 7)), t],
  "this-month": (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t],
  "last-month": (t) => [
    new Date(t.getFullYear(), t.getMonth() - 1, 1),
    new Date(t.getFullYear(), t.getMonth(), 0)
  ],
  "this-year": (t) => [new Date(t.getFullYear(), 0, 1), t],
  "last-year": (t) => [
    new Date(t.getFullYear() - 1, 0, 1),
    new Date(t.getFullYear() - 1, 11, 31)
  ]
};
function presetValue(name, count) {
  const [from, to] = PRESETS[name]?.(new Date) ?? [];
  if (!from)
    return "";
  const [a, b] = [iso(from), iso(to)];
  if (count === 2)
    return `${a}${TO}${b}`;
  return a === b ? a : "";
}
var parts4 = (root) => ({
  text: root.querySelector(':scope > input:not([type="hidden"])'),
  button: root.querySelector(":scope > button"),
  hidden: root.querySelector(':scope > input[type="hidden"]'),
  panel: root.querySelector(":scope > [data-popover]")
});
var wide = () => matchMedia("(min-width: 48rem)").matches;
function destroy5(root) {
  const state = states5.get(root);
  if (!state)
    return;
  states5.delete(root);
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
function mount10(root, options = {}) {
  if (!window.VanillaCalendarPro?.Calendar)
    throw new Error("A .date-picker needs Vanilla Calendar Pro: load dist/vanilla-calendar.min.js with its own <script> before the Tsunami script.");
  const { text, button, hidden, panel } = parts4(root);
  const span = button?.querySelector(":scope > span");
  if (!panel || !text && !span)
    throw new Error("A .date-picker needs a text input, or a button holding a span, and a [data-popover] panel.", { cause: root });
  destroy5(root);
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
  panel.id ||= `date-picker-${++uid6}`;
  panel.setAttribute("popover", "manual");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", range ? "Choose dates" : "Choose a date");
  panel.setAttribute("aria-hidden", "true");
  panel.tabIndex = -1;
  control.setAttribute("aria-haspopup", "dialog");
  control.setAttribute("aria-controls", panel.id);
  button?.setAttribute("aria-expanded", "false");
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
    presets();
    sync();
  }
  function presets() {
    for (const preset of panel.querySelectorAll("[data-presets] button")) {
      const name = preset.dataset.preset;
      if (name)
        preset.value = presetValue(name, count);
      preset.setAttribute("aria-pressed", String(preset.value === value()));
    }
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
    presets();
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
  Object.assign(state, { commit, show, close, parse: (t) => parse4(t, count) });
  states5.set(root, state);
  mounted3.add(root);
  build();
  const start = parse4(hidden?.value || text?.value || "", count);
  if (start) {
    dates = start;
    paint();
  } else
    presets();
  Object.defineProperties(root, {
    value: {
      configurable: true,
      get: () => value(),
      set(next) {
        commit(parse4(String(next ?? ""), count) ?? []);
      }
    },
    open: { configurable: true, value: show },
    close: { configurable: true, value: close },
    calendar: { configurable: true, get: () => state.calendar }
  });
  root.setAttribute("data-date-picker-initialized", "true");
}
var upgrade7 = (root) => {
  if (states5.has(root))
    return;
  try {
    mount10(root);
  } catch (error) {
    console.error(error.message, root);
  }
};
var all5 = (node) => node.querySelectorAll?.(ROOT5).forEach(upgrade7);
var scan8 = () => {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => all5(document), {
      once: true
    });
  else
    all5(document);
};
scan8();
new MutationObserver((list) => list.forEach((m) => {
  if (document.readyState === "loading")
    return;
  for (const n of m.addedNodes) {
    if (n.nodeType !== 1 || n.closest("[data-vc]"))
      continue;
    if (n.matches(ROOT5))
      upgrade7(n);
    all5(n);
  }
  for (const n of m.removedNodes)
    if (!n.isConnected) {
      for (const root of mounted3)
        if (!root.isConnected)
          destroy5(root);
    }
})).observe(document.documentElement, { childList: true, subtree: true });
var rootOf5 = (el) => el.closest?.(ROOT5);
var stateOf = (el) => {
  const root = rootOf5(el);
  return root && states5.has(root) ? [root, states5.get(root)] : [];
};
var choose4 = (state, dates) => {
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
    choose4(state, state.parse(preset.value) ?? []);
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
      states5.get(root).close();
});
document.addEventListener("focusout", (e) => {
  const [root, state] = stateOf(e.target);
  if (state && e.relatedTarget && !root.contains(e.relatedTarget))
    state.close();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" || e.defaultPrevented)
    return;
  const [root, state] = stateOf(e.target);
  if (!state || e.target !== state.control || open2.has(root))
    return;
  e.preventDefault();
  state.show();
});
var shifted = (iso, key, shift, first) => {
  const [y, m, d] = iso.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  const day = (at.getUTCDay() - first + 7) % 7;
  if (key === "Home")
    at.setUTCDate(d - day);
  else if (key === "End")
    at.setUTCDate(d - day + 6);
  else {
    const months = (shift ? 12 : 1) * (key === "PageUp" ? -1 : 1);
    const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
    at.setTime(Date.UTC(y, m - 1 + months, Math.min(d, last)));
  }
  return at.toISOString().slice(0, 10);
};
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !["Home", "End", "PageUp", "PageDown"].includes(e.key))
    return;
  const [root, state] = stateOf(e.target);
  const btn = e.target.closest?.("[data-vc-date-btn]");
  if (!state || !btn || !open2.has(root) || !state.host.contains(btn))
    return;
  if (e.shiftKey && !e.key.startsWith("Page"))
    return;
  e.preventDefault();
  const cal = state.calendar;
  const iso = shifted(btn.closest("[data-vc-date]").dataset.vcDate, e.key, e.shiftKey, cal.firstWeekday ?? 1);
  const find = () => [...state.host.querySelectorAll(`[data-vc-date="${iso}"]`)].find((c) => c.dataset.vcDateMonth === "current" && !c.querySelector("button:disabled, [aria-disabled='true']"))?.firstElementChild;
  let next = find();
  if (!next) {
    const [y, m] = iso.split("-").map(Number);
    cal.set({ selectedYear: y, selectedMonth: m - 1 }, { dates: true, month: true, year: true });
    next = find();
  }
  next?.focus();
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
  mount: mount10,
  get: (el) => states5.get(el)?.calendar ?? null,
  destroy: destroy5
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
var states6 = new Map;
var root3 = document.documentElement;
var reduce = matchMedia("(prefers-reduced-motion: reduce)");
var token = (name) => getComputedStyle(root3).getPropertyValue(name).trim();
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
var px = (value) => value.endsWith("rem") ? parseFloat(value) * parseFloat(getComputedStyle(root3).fontSize) : parseFloat(value);
var ready4 = false;
var setup2 = () => {
  if (ready4)
    return;
  ready4 = true;
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
          generateLabels: (chart) => (window.Chart.overrides?.[chart.config.type]?.plugins?.legend?.labels?.generateLabels ?? window.Chart.defaults.plugins.legend.labels.generateLabels)(chart).map((item) => ({ ...item, lineDash: [] }))
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
function destroy6(el) {
  const state = states6.get(el);
  if (!state)
    return;
  states6.delete(el);
  state.chart.destroy();
  delete el.dataset.chartInitialized;
}
function draw2(el, options, quiet) {
  const old = states6.get(el);
  if (old) {
    states6.delete(el);
    old.chart.destroy();
  }
  const { total, ...cfg } = config(options);
  if (quiet)
    cfg.options.animation = false;
  const chart = new window.Chart(el, cfg);
  chart.$total = total;
  states6.set(el, { chart, options });
  const family = chart.options.font.family;
  if (!document.fonts.check(`1em ${family}`))
    document.fonts.load(`1em ${family}`).then(() => states6.get(el)?.chart === chart && chart.update("none"));
  el.dataset.chartInitialized = "true";
  el.dispatchEvent(new CustomEvent("tsunami:chartready", { bubbles: true, detail: { chart } }));
  return chart;
}
function chart(target, options = {}) {
  if (!window.Chart)
    throw new Error("A chart needs Chart.js: load dist/chart.min.js with its own <script> before the Tsunami script.");
  setup2();
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!(el instanceof HTMLCanvasElement))
    throw new Error("A chart needs a <canvas> to draw in.", { cause: target });
  return draw2(el, options, false);
}
new MutationObserver((list) => list.forEach((m) => m.removedNodes.forEach((n) => {
  if (n.isConnected)
    return;
  for (const el of states6.keys())
    if (!el.isConnected)
      destroy6(el);
}))).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("tsunami:themechange", () => {
  for (const [el, state] of [...states6])
    draw2(el, state.options, true);
});
chart.get = (el) => states6.get(el)?.chart ?? null;
chart.destroy = destroy6;
(window.tsunami ??= {}).chart = chart;

// src/js/code-editor.js
var ROOT6 = ".code-editor";
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
var states7 = new WeakMap;
var mounted4 = new Set;
var loading = null;
var root4 = document.documentElement;
var token2 = (name) => getComputedStyle(root4).getPropertyValue(name).trim();
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
var files = (box) => [...box.querySelectorAll("textarea")].filter((t) => t.closest(ROOT6) === box);
var shown = (box) => files(box).find((t) => !t.hidden) ?? null;
var language = (box, ta) => {
  const name = ta.dataset.language ?? box.dataset.language;
  return LANGUAGES.includes(name) ? name : "plaintext";
};
var text2 = (id) => document.getElementById(id)?.textContent.trim() ?? "";
var labelOf2 = (box, ta) => ta.getAttribute("aria-label") || [...ta.labels ?? []].map((l) => l.textContent.trim()).join(" ") || (ta.getAttribute("aria-labelledby") ?? "").split(/\s+/).map(text2).join(" ").trim() || box.getAttribute("aria-label") || "Code editor";
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
function refresh6(box, state) {
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
function start6(box, state) {
  load2().then((monaco) => {
    if (states7.get(box) !== state)
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
    refresh6(box, state);
    box.dataset.loaded = "";
    state.observer = new MutationObserver(() => refresh6(box, state));
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
function destroy7(box) {
  const state = states7.get(box);
  if (!state)
    return;
  states7.delete(box);
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
function mount11(box, options = {}) {
  load2();
  destroy7(box);
  const state = {
    editor: null,
    options,
    files: new Map,
    current: null,
    quiet: false
  };
  states7.set(box, state);
  mounted4.add(box);
  Object.defineProperty(box, "editor", {
    configurable: true,
    get: () => state.editor
  });
  start6(box, state);
}
var upgrade8 = (box) => {
  if (!states7.has(box))
    mount11(box);
};
var all6 = (node) => node.querySelectorAll?.(ROOT6).forEach(upgrade8);
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => all6(document), {
    once: true
  });
else
  all6(document);
new MutationObserver((list) => list.forEach((m) => {
  if (document.readyState === "loading")
    return;
  m.addedNodes.forEach((n) => n.matches?.(ROOT6) ? upgrade8(n) : all6(n));
  if (m.removedNodes.length) {
    for (const box of mounted4)
      if (!box.isConnected)
        destroy7(box);
  }
})).observe(root4, { childList: true, subtree: true });
document.addEventListener("tsunami:themechange", () => {
  const state = [...mounted4].map((b) => states7.get(b)).find((s) => s.monaco);
  if (!state)
    return;
  defineTheme(state.monaco);
  state.monaco.editor.setTheme(themeName());
});
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    for (const box of mounted4) {
      const state = states7.get(box);
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
  const box = e.target.closest?.(`${ROOT6}[data-loaded]`);
  if (box && e.target.matches("textarea"))
    states7.get(box)?.editor?.focus();
});
(window.tsunami ??= {}).codeEditor = {
  mount: mount11,
  get: (box) => states7.get(box)?.editor ?? null,
  destroy: destroy7
};
