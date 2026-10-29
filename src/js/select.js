// Select: <div class="select"> around a native <select>. The script draws a
// combobox control and a listbox popover next to it and keeps the native
// select's chosen options in sync (dispatching input + change on it), so
// forms submit and the Save bar work as usual. Without the script the native
// select is shown.
// Wrapper options: data-placeholder, data-size, data-search, data-input,
// data-tags, data-url (JSON lookup), data-empty. See demo/select.html.
const ROOT = ".select:not(select)";
const MSG = {
  empty: "ไม่พบผลลัพธ์ No results",
  busy: "กำลังค้นหา… Searching…",
  more: "กำลังโหลดเพิ่ม… Loading more…",
  error: "โหลดผลลัพธ์ไม่ได้ Could not load results",
};
const S = new WeakMap();
let uid = 0;
let opened = null;
let typed = "";
let typedAt = 0;

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}
const label = (o) => o.dataset.label || o.label;
const chosen = (sel) => [...sel.selectedOptions].filter((o) => o.value);
const fire = (el, name, detail) =>
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
const rootOf = (el) => el?.closest(ROOT);

function build(root) {
  const sel = root.querySelector(":scope > select");
  if (!sel || S.has(root)) return;
  const id = `select-${++uid}`;
  const d = root.dataset;
  const multi = sel.multiple;
  const inControl = multi || "input" in d;
  const list = h("div", { role: "listbox", id: `${id}-list` });
  if (multi) list.setAttribute("aria-multiselectable", "true");
  const pop = h("div", { popover: "manual" });
  const header = root.querySelector(":scope > header");
  if (header) pop.append(header);
  let control, input;
  if (inControl) {
    input = h("input", { type: "text", autocomplete: "off", form: "" });
    control = h("div", {}, input);
  } else {
    control = h("button", { type: "button", "aria-haspopup": "listbox" });
    control.append(h("span"));
    if ("search" in d || "url" in d || "tags" in d) {
      input = h("input", {
        type: "text",
        autocomplete: "off",
        form: "",
        placeholder: d.search || "ค้นหา Search",
      });
      input.setAttribute("aria-label", input.placeholder);
      const icon = h("i", { class: "icon icon-search", "aria-hidden": "true" });
      pop.append(
        h(
          "div",
          { class: "input-group", "data-variant": "ghost" },
          icon,
          input,
        ),
      );
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
  pop.append(list, h("p", { role: "status" }));
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
    q: "",
  });
  paint(root);
}

// Control: label, chips and disabled state from the native select.
function paint(root) {
  const st = S.get(root);
  if (!st) return;
  const { sel, control, input } = st;
  const on = chosen(sel);
  const ph =
    root.dataset.placeholder ?? sel.querySelector('option[value=""]')?.text;
  root.toggleAttribute("data-has-value", on.length > 0);
  if (st.multi) {
    for (const c of control.querySelectorAll(":scope > span")) c.remove();
    for (const o of on) {
      const x = h("button", {
        type: "button",
        tabindex: "-1",
        "aria-label": `ลบ Remove ${label(o)}`,
      });
      x.append(h("i", { class: "icon icon-x", "aria-hidden": "true" }));
      x.option = o;
      input.before(h("span", {}, label(o), x));
    }
    input.placeholder = on.length ? "" : (ph ?? "");
  } else if (st.inControl) {
    input.placeholder = ph ?? "";
    if (root !== opened) input.value = on[0] ? label(on[0]) : "";
  } else {
    control.firstChild.textContent = on[0] ? label(on[0]) : (ph ?? "");
  }
  (st.inControl ? input : control).disabled = sel.matches(":disabled");
  if (root === opened) render(root);
}

// List: options from the native select, filtered by the typed text.
function render(root) {
  const st = S.get(root);
  const { sel, list, q } = st;
  const term = q.toLowerCase();
  let n = 0;
  const option = (o, parent) => {
    if (o.hidden) return;
    const text = label(o);
    const hay = `${text} ${o.dataset.text ?? ""}`.toLowerCase();
    if (term && !hay.includes(term)) return;
    const el = h("div", {
      role: "option",
      id: `${list.id}-${n++}`,
      "aria-selected": String(o.selected),
    });
    if (o.disabled) el.setAttribute("aria-disabled", "true");
    const av = o.dataset.avatar;
    if (av) {
      const a = h("span", { class: "avatar", "data-size": "sm" });
      if (/[./]/.test(av)) a.append(h("img", { src: av, alt: "" }));
      else a.append(av);
      el.append(a);
    }
    const title = h("span", {}, text);
    if (o.dataset.badge)
      title.append(h("span", { class: "badge" }, o.dataset.badge));
    const body = h("span", {}, title);
    if (o.dataset.text) body.append(h("small", {}, o.dataset.text));
    el.append(body);
    el.option = o;
    parent.append(el);
  };
  const frag = document.createDocumentFragment();
  if ("tags" in root.dataset && q) {
    const exists = [...sel.options].some(
      (o) => label(o).toLowerCase() === term,
    );
    if (!exists) {
      const el = h("div", {
        role: "option",
        id: `${list.id}-tag`,
        "aria-selected": "false",
      });
      el.append(
        h("i", { class: "icon icon-plus", "aria-hidden": "true" }),
        h("span", {}, q),
      );
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
    const g = h("div", { role: "group", "aria-labelledby": gid });
    g.append(h("strong", { id: gid }, c.label));
    for (const o of c.children) option(o, g);
    if (g.childElementCount > 1) frag.append(g);
  }
  list.replaceChildren(frag);
  const items = [...list.querySelectorAll('[role="option"]')];
  const busy = list.hasAttribute("aria-busy");
  st.pop.lastChild.textContent = list.hasAttribute("data-error")
    ? MSG.error
    : items.length
      ? list.hasAttribute("data-more")
        ? MSG.more
        : ""
      : busy
        ? MSG.busy
        : (root.dataset.empty ?? MSG.empty);
  const prev = st.active;
  const keep = items.find((el) => prev && (el.option ?? el.tag) === prev);
  activate(
    root,
    keep ??
      (q
        ? enabled(root)[0]
        : items.find((el) => el.option?.selected && !st.multi)),
  );
}

const enabled = (root) => [
  ...S.get(root).list.querySelectorAll(
    '[role="option"]:not([aria-disabled="true"])',
  ),
];

function activate(root, el) {
  const st = S.get(root);
  st.list.querySelector("[data-active]")?.removeAttribute("data-active");
  st.active = el ? (el.option ?? el.tag) : null;
  for (const f of [st.combo, st.input]) {
    if (!f) continue;
    if (el) f.setAttribute("aria-activedescendant", el.id);
    else f.removeAttribute("aria-activedescendant");
  }
  if (!el) return;
  el.setAttribute("data-active", "");
  el.scrollIntoView({ block: "nearest" });
}

function place(root) {
  const { pop, control } = S.get(root);
  const r = control.getBoundingClientRect();
  pop.style.minWidth = `${r.width}px`;
  const below = innerHeight - r.bottom;
  const up = below < pop.offsetHeight + 8 && r.top > below;
  pop.style.top = `${up ? r.top - pop.offsetHeight - 4 : r.bottom + 4}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`;
}

function open(el) {
  const root = rootOf(el);
  const st = S.get(root);
  if (!st || root === opened || st.sel.matches(":disabled")) return;
  if (opened) close(opened);
  opened = root;
  st.q = "";
  st.active = null;
  if (st.input && !st.inControl) st.input.value = "";
  st.pop.showPopover();
  for (const f of [st.combo, st.input])
    f?.setAttribute("aria-expanded", "true");
  render(root);
  place(root);
  if (st.input) st.input.focus();
  if (root.dataset.url) load(root, 1);
  fire(root, "tsunami:select:open");
}

function close(el, focus) {
  const root = rootOf(el);
  const st = S.get(root);
  if (!st || root !== opened) return;
  opened = null;
  st.abort?.abort();
  st.q = "";
  st.pop.hidePopover();
  for (const f of [st.combo, st.input]) {
    f?.setAttribute("aria-expanded", "false");
    f?.removeAttribute("aria-activedescendant");
  }
  if (st.multi) st.input.value = "";
  paint(root);
  if (focus) st.combo.focus();
  fire(root, "tsunami:select:close");
}

function emit(root) {
  const { sel } = S.get(root);
  for (const t of ["input", "change"])
    sel.dispatchEvent(new Event(t, { bubbles: true }));
  fire(root, "tsunami:select:change", {
    value: value(root),
    selected: chosen(sel).map((o) => ({ value: o.value, label: label(o) })),
  });
}

function choose(root, o) {
  const st = S.get(root);
  if (typeof o === "string") {
    o = new Option(o, o);
    o.dataset.tag = "";
    st.sel.append(o);
  }
  if (o.disabled) return;
  if (st.multi) {
    o.selected = !o.selected;
    st.q = st.input.value = "";
    st.active = o;
    emit(root);
    if (root.dataset.url) load(root, 1);
  } else {
    const changed = !o.selected;
    o.selected = true;
    close(root, true);
    if (changed) emit(root);
  }
}

// Remote options: GET data-url with ?q=&page= ({page} in the URL is replaced
// too, so static files work). Reply: { results: [{ id, text }],
// pagination: { more } }. The list also filters by text on the page.
async function load(root, page) {
  const st = S.get(root);
  const { sel, list } = st;
  st.abort?.abort();
  const ac = (st.abort = new AbortController());
  const url = new URL(root.dataset.url.replace("{page}", page), location.href);
  if (st.q) url.searchParams.set("q", st.q);
  url.searchParams.set("page", page);
  list.setAttribute("aria-busy", "true");
  list.removeAttribute("data-error");
  if (page === 1) render(root);
  let more = false;
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const data = await res.json();
    if (page === 1)
      for (const o of [...sel.options])
        if (o.value) {
          if (o.selected) o.hidden = true;
          else o.remove();
        }
    for (const { id, text } of data.results ?? []) {
      const v = String(id);
      const o = [...sel.options].find((x) => x.value === v);
      if (o) o.hidden = false;
      sel.append(o ?? new Option(text, v));
    }
    more = !!data.pagination?.more;
    st.page = page;
  } catch (e) {
    if (ac.signal.aborted) return;
    console.error(e);
    list.setAttribute("data-error", "");
    for (const o of [...sel.options]) if (!o.selected && o.value) o.remove();
  }
  list.removeAttribute("aria-busy");
  list.toggleAttribute("data-more", more);
  if (root !== opened) return;
  render(root);
  place(root);
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
  for (const o of sel.options) o.selected = want.includes(o.value);
  if (String(value(root)) !== before) emit(root);
}

function refresh(el) {
  const root = rootOf(el);
  build(root);
  paint(root);
}

(window.tsunami ??= {}).select = { open, close, value, refresh };

// Enhance wrappers present now and added later.
const scan = () => document.querySelectorAll(ROOT).forEach(build);
new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
scan();

document.addEventListener("click", (e) => {
  const root = rootOf(e.target);
  const st = S.get(root);
  if (!st) return;
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
  if (!st.control.contains(e.target)) return;
  if (root === opened && !st.inControl) close(root, true);
  else {
    open(root);
    st.input?.focus();
  }
});

// Keep focus in the field while picking with the mouse.
document.addEventListener("mousedown", (e) => {
  const st = S.get(rootOf(e.target));
  if (st?.pop.contains(e.target) && !e.target.closest("input, header"))
    e.preventDefault();
});

document.addEventListener("pointerdown", (e) => {
  if (opened && !opened.contains(e.target)) close(opened);
});

document.addEventListener("pointermove", (e) => {
  const opt = e.target.closest?.('[role="option"]');
  const root = rootOf(opt);
  if (root && opt.getAttribute("aria-disabled") !== "true") activate(root, opt);
});

document.addEventListener("focusout", (e) => {
  const root = rootOf(e.target);
  if (
    root &&
    root === opened &&
    e.relatedTarget &&
    !root.contains(e.relatedTarget)
  )
    close(root);
});

// Label clicks focus the hidden native select: pass focus to the control.
document.addEventListener("focusin", (e) => {
  const st = S.get(e.target.parentElement);
  if (st?.sel === e.target) st.combo.focus();
});

document.addEventListener("input", (e) => {
  const root = rootOf(e.target);
  const st = S.get(root);
  if (e.target !== st?.input) return;
  for (const o of st.sel.querySelectorAll("option[data-tag]"))
    if (!o.selected) o.remove();
  open(root);
  st.q = st.input.value.trim();
  st.active = null;
  render(root);
  if (root.dataset.url) load(root, 1);
});

document.addEventListener("keydown", (e) => {
  const root = rootOf(e.target);
  const st = S.get(root);
  if (!st || (e.target !== st.combo && e.target !== st.input)) return;
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
    const go =
      /^Arrow(Down|Up)$/.test(k) || (onButton && /^(Enter| )$/.test(k));
    if (!go && !char) return;
    e.preventDefault();
    open(root);
    if (char && st.input) {
      st.input.value = k;
      st.input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (!char || st.input) return;
  }
  const typing = e.timeStamp - typedAt < 500;
  const items = enabled(root);
  const i = items.findIndex((el) => el.hasAttribute("data-active"));
  const move = (to) => {
    e.preventDefault();
    activate(root, items[Math.max(0, Math.min(items.length - 1, to))]);
  };
  if (k === "ArrowDown") move(i < 0 ? 0 : i + 1);
  else if (k === "ArrowUp") move(i < 0 ? items.length - 1 : i - 1);
  else if (onButton && k === "Home") move(0);
  else if (onButton && k === "End") move(items.length - 1);
  else if (k === "Enter" || (k === " " && onButton && !typing)) {
    e.preventDefault();
    const el = items[i];
    if (el) choose(root, el.option ?? el.tag);
  } else if (k === "Escape") {
    e.preventDefault();
    close(root, true);
  } else if (char) {
    // Type-ahead: jump to the first option starting with the typed text.
    e.preventDefault();
    typed = (typing ? typed : "") + k.toLowerCase();
    typedAt = e.timeStamp;
    // Matches the start of any word, so "b" finds "กระเป๋า Bags".
    const hit = items.find((el) =>
      ` ${el.textContent.toLowerCase()}`.includes(` ${typed}`),
    );
    if (hit) activate(root, hit);
  }
});

// Native select changed by other code or a form reset: redraw the control.
document.addEventListener("change", (e) => paint(e.target.parentElement));
document.addEventListener("reset", (e) =>
  setTimeout(() => {
    for (const root of e.target.querySelectorAll(ROOT)) paint(root);
  }),
);
addEventListener("resize", () => opened && place(opened));
document.addEventListener(
  "scroll",
  (e) => {
    if (!opened) return;
    const { list, page } = S.get(opened);
    if (e.target !== list) return place(opened);
    const near = list.scrollHeight - list.clientHeight - list.scrollTop < 50;
    if (
      near &&
      list.hasAttribute("data-more") &&
      !list.hasAttribute("aria-busy")
    )
      load(opened, page + 1);
  },
  true,
);
