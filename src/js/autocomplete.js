// Autocomplete: <div class="autocomplete"> around a text input (alone or in an
// .input-group). The value stays free text; suggestions come from a <datalist>
// (the input's list attribute, or a datalist inside the wrapper), from
// data-url (GET url?q=, JSON array of strings or { value, label, text }), or
// from a source function given to tsunami.autocomplete.mount. The script moves
// the native list link away (so only the styled list shows) and draws a
// listbox popover under the input. Without the script the datalist still works.
// Wrapper options: data-url, data-min-length (default 1), data-limit (default
// 8). Picking sets the value and fires input + change on the input, then
// tsunami:autocomplete with { value, item }. See docs/autocomplete.html.
const ROOT = ".autocomplete";
const S = new WeakMap();
const off = new WeakSet();
let uid = 0;

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}
const rootOf = (el) => el?.closest?.(ROOT);
// The state of a wrapper when el is its input.
const stOf = (el) => {
  const st = S.get(rootOf(el));
  return st?.input === el ? st : null;
};
const item = (x) =>
  typeof x === "object" && x
    ? {
        value: String(x.value ?? x.label ?? x.text ?? ""),
        label: String(x.label ?? x.value ?? ""),
        text: x.text === undefined || x.text === null ? "" : String(x.text),
      }
    : { value: String(x), label: String(x), text: "" };
const num = (v, d) => (v === undefined || v === "" || isNaN(v) ? d : Number(v));
const minLength = (root) => num(root.dataset.minLength, 1);
const limit = (root) => num(root.dataset.limit, 8) || 8;
const opened = (st) => st.pop.matches(":popover-open");
const attrs = ["autocomplete", "aria-autocomplete"];

function build(root, source) {
  if (S.has(root) || off.has(root)) return;
  const input = root.querySelector("input");
  if (!input) return;
  const id = `autocomplete-${++uid}`;
  const list = h("div", { role: "listbox", id: `${id}-list` });
  const pop = h("div", { popover: "manual" }, list);
  S.set(root, {
    input,
    list,
    pop,
    datalist: input.list ?? root.querySelector("datalist"),
    link: input.getAttribute("list"),
    prev: attrs.map((k) => input.getAttribute(k)),
    source,
    cache: new Map(),
  });
  // The native list link goes, so only the styled list shows.
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
  const st = S.get(root);
  if (!st) return;
  close(root);
  st.pop.remove();
  const { input } = st;
  for (const k of ["role", "aria-expanded", "aria-controls"])
    input.removeAttribute(k);
  attrs.forEach((k, i) => {
    if (st.prev[i] === null) input.removeAttribute(k);
    else input.setAttribute(k, st.prev[i]);
  });
  if (st.link !== null) input.setAttribute("list", st.link);
  S.delete(root);
  off.add(root);
}

function mount(root, opts = {}) {
  destroy(root);
  off.delete(root);
  build(root, opts.source);
}

// Items for a query: the source function, the url or the datalist.
async function fetchItems(root, q) {
  const st = S.get(root);
  if (!st.source && !root.dataset.url)
    return [...(st.datalist?.options ?? [])]
      .filter((o) => !o.disabled && o.value)
      .map((o) =>
        item({
          value: o.value,
          label: o.getAttribute("label") || o.textContent.trim() || o.value,
          text: o.dataset.text,
        }),
      );
  if (st.cache.has(q)) return st.cache.get(q);
  st.abort?.abort();
  const ac = (st.abort = new AbortController());
  let data;
  if (st.source) data = await st.source(q, { signal: ac.signal });
  else {
    const url = new URL(root.dataset.url, location.href);
    if (q) url.searchParams.set("q", q);
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    data = await res.json();
  }
  const items = (data ?? []).map(item);
  st.cache.set(q, items);
  return items;
}

// Look up what is typed now; remote sources wait 200 ms after the last key.
function update(root, now) {
  const st = S.get(root);
  const { input } = st;
  clearTimeout(st.timer);
  const q = input.value.trim();
  if (input.disabled || input.readOnly || q.length < minLength(root))
    return close(root);
  const remote = st.source || root.dataset.url;
  const run = async () => {
    const mine = (st.run = {});
    if (remote) busy(st, true);
    let items;
    try {
      items = await fetchItems(root, q);
    } catch (e) {
      if (st.run !== mine) return;
      console.error(e);
      return close(root);
    }
    if (st.run !== mine) return;
    busy(st, false);
    if (document.activeElement === input) show(root, items, q);
  };
  if (remote && !now && !st.cache.has(q)) st.timer = setTimeout(run, 200);
  else run();
}

function busy(st, on) {
  st.list.toggleAttribute("aria-busy", on);
  if (on) st.input.setAttribute("aria-busy", "true");
  else st.input.removeAttribute("aria-busy");
}

// Matches keep their order; the matched part of the label gets a <mark>.
function show(root, items, q) {
  const st = S.get(root);
  const term = q.toLowerCase();
  const found = items
    .filter((i) =>
      `${i.label} ${i.value} ${i.text}`.toLowerCase().includes(term),
    )
    .slice(0, limit(root));
  if (!found.length) return close(root);
  const frag = document.createDocumentFragment();
  found.forEach((i, n) => {
    const title = h("span");
    const at = term ? i.label.toLowerCase().indexOf(term) : -1;
    if (at < 0) title.append(i.label);
    else
      title.append(
        i.label.slice(0, at),
        h("mark", {}, i.label.slice(at, at + term.length)),
        i.label.slice(at + term.length),
      );
    const body = h("span", {}, title);
    if (i.text) body.append(h("small", {}, i.text));
    const el = h("div", { role: "option", id: `${st.list.id}-${n}` }, body);
    el.item = i;
    frag.append(el);
  });
  st.list.replaceChildren(frag);
  activate(root, null);
  if (!opened(st)) st.pop.showPopover();
  st.input.setAttribute("aria-expanded", "true");
  place(root);
}

function close(root) {
  const st = S.get(root);
  if (!st) return;
  clearTimeout(st.timer);
  st.run = null;
  st.abort?.abort();
  busy(st, false);
  if (opened(st)) st.pop.hidePopover();
  st.input.setAttribute("aria-expanded", "false");
  st.input.removeAttribute("aria-activedescendant");
}

function activate(root, el) {
  const { list, input } = S.get(root);
  list.querySelector("[data-active]")?.removeAttribute("data-active");
  if (el) {
    el.setAttribute("data-active", "");
    input.setAttribute("aria-activedescendant", el.id);
    el.scrollIntoView({ block: "nearest" });
  } else input.removeAttribute("aria-activedescendant");
}

function place(root) {
  const { pop, input } = S.get(root);
  const r = (input.closest(".input-group") ?? input).getBoundingClientRect();
  pop.style.minWidth = `${r.width}px`;
  const below = innerHeight - r.bottom;
  const up = below < pop.offsetHeight + 8 && r.top > below;
  pop.dataset.side = up ? "top" : "bottom";
  pop.style.top = `${up ? r.top - pop.offsetHeight - 4 : r.bottom + 4}px`;
  pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8))}px`;
}

function pick(root, i) {
  const st = S.get(root);
  st.picking = true;
  st.input.value = i.value;
  close(root);
  for (const t of ["input", "change"])
    st.input.dispatchEvent(new Event(t, { bubbles: true }));
  st.input.dispatchEvent(
    new CustomEvent("tsunami:autocomplete", {
      bubbles: true,
      detail: { value: i.value, item: i },
    }),
  );
  st.picking = false;
}

(window.tsunami ??= {}).autocomplete = { mount, destroy };

// Enhance wrappers present now and added later.
const scan = () =>
  document.querySelectorAll(ROOT).forEach((root) => build(root));
new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
scan();

document.addEventListener("input", (e) => {
  const st = stOf(e.target);
  if (st && !st.picking) update(rootOf(e.target));
});

document.addEventListener("focusin", (e) => {
  const root = rootOf(e.target);
  if (stOf(e.target) && minLength(root) === 0) update(root, true);
});

document.addEventListener("click", (e) => {
  const root = rootOf(e.target);
  const st = S.get(root);
  if (!st) return;
  const opt = e.target.closest('[role="option"]');
  if (opt?.item && st.pop.contains(opt)) pick(root, opt.item);
  else if (e.target === st.input && !opened(st) && minLength(root) === 0)
    update(root, true);
});

// Keep focus in the input while picking with the mouse.
document.addEventListener("mousedown", (e) => {
  if (S.get(rootOf(e.target))?.pop.contains(e.target)) e.preventDefault();
});

document.addEventListener("pointermove", (e) => {
  const opt = e.target.closest?.('[role="option"]');
  const root = rootOf(opt);
  if (root && S.get(root)?.pop.contains(opt)) activate(root, opt);
});

document.addEventListener("focusout", (e) => {
  if (stOf(e.target)) close(rootOf(e.target));
});

document.addEventListener("keydown", (e) => {
  const st = stOf(e.target);
  if (!st || e.isComposing) return;
  const root = rootOf(e.target);
  const k = e.key;
  if (!opened(st)) {
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
    activate(root, els[Math.max(0, Math.min(els.length - 1, to))]);
  };
  if (k === "ArrowDown") move(i + 1);
  else if (k === "ArrowUp") move(i < 0 ? els.length - 1 : i - 1);
  else if (k === "Enter") {
    if (els[i]) {
      e.preventDefault();
      pick(root, els[i].item);
    } else close(root);
  } else if (k === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    close(root);
  } else if (k === "Tab") close(root);
});

// Keep an open list under its input.
const replace = (skip) => {
  for (const root of document.querySelectorAll(ROOT)) {
    const st = S.get(root);
    if (st && opened(st) && !st.list.contains(skip)) place(root);
  }
};
addEventListener("resize", () => replace());
document.addEventListener("scroll", (e) => replace(e.target), true);
