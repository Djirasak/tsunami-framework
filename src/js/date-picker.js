// Date picker: .date-picker holds a control, an empty [data-popover] panel and,
// optionally, a hidden input. The control is a text input.input (a date can be
// typed as YYYY-MM-DD) or a button holding a span that shows the dates.
// Focus or a click on the field, or a click on the button, opens the calendar.
// The calendar is Vanilla Calendar Pro, which is not in tsunami.js: load
// dist/vanilla-calendar.min.js with its own <script> before the Tsunami script
// on a page that has a .date-picker. Without it the picker logs an error.
// Options on .date-picker: data-mode="range" (two clicks; two months side by
// side from 768px), data-format="long|medium" (a written date, not typeable),
// data-min / data-max (YYYY-MM-DD), data-placeholder (the button's text while
// there are no dates). `value` on the text input or the hidden input is the
// starting date: YYYY-MM-DD, or "start to end" for a range; the hidden input
// wins, and it is what a form sends. A [data-presets] group in the panel holds
// buttons whose `value` is a date or a range; the one matching the chosen dates
// gets aria-pressed="true", and choosing one closes the panel. data-size="sm|lg"
// on the text input sets its height.
// The element gets value (read and set; "" clears), open(), close(), calendar
// (the library's Calendar, read only) and data-date-picker-initialized="true".
// A preset can name its dates instead of a value: data-preset="today |
// yesterday | tomorrow | last-7-days | last-30-days | last-90-days | this-week
// (from Monday) | this-month | last-month | this-year | last-year", worked out
// from today when the panel opens. A single picker takes only the one-day names.
// data-empty is set while there are no dates.
// A bubbling `change` (detail { value, dates }) fires from .date-picker when the
// dates change by a click, a preset, typing or setting value; the native change
// of the text input is stopped, and a bubbling `input` fires from the input that
// holds the value, so the form and the save bar hear it.
// Tab goes field, calendar, presets, then out (which closes the panel). Escape
// closes the panel, returns focus to the control and does not reach a dialog
// around it. API: window.tsunami.datePicker = { mount(el, options?), get(el),
// destroy(el) }; options are any other Vanilla Calendar Pro options, such as
// firstWeekday or disableWeekdays.
// Language: month and weekday names, the written date of data-format, the
// years in the calendar and the words (js/i18n.js, datePicker.* keys) follow
// options.locale, else data-locale on .date-picker (such as
// th-TH-u-ca-buddhist), else the nearest [lang], else English. Thai counts
// years in the Buddhist era, as Intl does, so lang="th" shows "15 พ.ย. 2569";
// the header and the year list are rewritten to match, while data-vc-year,
// the hidden input, value, the change event, data-min/max and presets stay
// Gregorian YYYY-MM-DD. A typeable field (no data-format) stays YYYY-MM-DD.
// data-label on .date-picker sets the panel's aria-label; options.labels
// replaces the library's own words.

import { langOf, say } from "./i18n.js";

const ROOT = ".date-picker";
const TO = " to ";
const states = new WeakMap(); // root -> state
const mounted = new Set(); // roots with a state, for removals
const open = new Set(); // roots whose panel is open
const MEMBERS = ["value", "open", "close", "calendar"];
let uid = 0;

const FORMATS = {
  long: { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" },
  medium: { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
};
const formatters = new Map(); // "locale|format" -> Intl.DateTimeFormat

// The language and calendar of a picker: options.locale (a tag), data-locale,
// the nearest [lang] ancestor, <html lang>, then "en". A tag Intl refuses is
// skipped, so a typo falls back instead of breaking the picker.
function localeOf(root, options) {
  for (const tag of [options.locale, root.dataset.locale, langOf(root)]) {
    if (typeof tag !== "string" || !tag) continue;
    try {
      new Intl.DateTimeFormat(tag);
      return tag;
    } catch {
      // not a locale Intl knows; try the next one
    }
  }
  return "en";
}

function formatter(locale, name) {
  if (!FORMATS[name]) return null;
  const key = `${locale}|${name}`;
  if (!formatters.has(key))
    formatters.set(key, new Intl.DateTimeFormat(locale, FORMATS[name]));
  return formatters.get(key);
}

// The year as the locale writes it ("2569" in th, a Buddhist-era year), or
// null when the locale counts years as the Gregorian calendar does.
function yearsOf(locale) {
  const f = new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: "UTC" });
  if (f.resolvedOptions().calendar === "gregory") return null;
  return (y) =>
    f.formatToParts(new Date(Date.UTC(y, 6, 1))).find((p) => p.type === "year")
      ?.value ?? String(y);
}

// The library's own aria-labels, in the picker's language (js/i18n.js).
const LABELS = ["application", "navigation", "month", "months", "year", "years", "week", "dates"];
function labelsOf(lang) {
  const labels = Object.fromEntries(LABELS.map((k) => [k, say(lang, `datePicker.${k}`)]));
  for (const side of ["arrowPrev", "arrowNext"])
    labels[side] = Object.fromEntries(
      ["month", "year", "week"].map((k) => [k, say(lang, `datePicker.${side}.${k}`)]),
    );
  return labels;
}

const isDate = (text) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
  );
};

// "" -> [], "2026-05-29" -> ["2026-05-29"], a range -> [start, end] sorted.
// Anything else (or the wrong number of dates for the mode) is null.
function parse(text, count) {
  const parts = text.trim() === "" ? [] : text.split(TO).map((s) => s.trim());
  if (parts.length !== 0 && parts.length !== count) return null;
  return parts.every(isDate) ? parts.sort() : null;
}

// Named presets: data-preset="last-7-days" on a preset button sets its value
// from today's date in the visitor's time zone.
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function shift(d, days) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}
const PRESETS = {
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
    new Date(t.getFullYear(), t.getMonth(), 0),
  ],
  "this-year": (t) => [new Date(t.getFullYear(), 0, 1), t],
  "last-year": (t) => [
    new Date(t.getFullYear() - 1, 0, 1),
    new Date(t.getFullYear() - 1, 11, 31),
  ],
};
// A single picker takes only the one-day names; others give "".
function presetValue(name, count) {
  const [from, to] = PRESETS[name]?.(new Date()) ?? [];
  if (!from) return "";
  const [a, b] = [iso(from), iso(to)];
  if (count === 2) return `${a}${TO}${b}`;
  return a === b ? a : "";
}

const parts = (root) => ({
  text: root.querySelector(':scope > input:not([type="hidden"])'),
  button: root.querySelector(":scope > button"),
  hidden: root.querySelector(':scope > input[type="hidden"]'),
  panel: root.querySelector(":scope > [data-popover]"),
});

const wide = () => matchMedia("(min-width: 48rem)").matches;

function destroy(root) {
  const state = states.get(root);
  if (!state) return;
  states.delete(root);
  mounted.delete(root);
  open.delete(root);
  for (const name of MEMBERS) delete root[name];
  state.observer?.disconnect();
  state.calendar.destroy();
  state.host.remove();
  const { panel, control } = state;
  if (panel.matches(":popover-open")) panel.hidePopover();
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

function mount(root, options = {}) {
  if (!window.VanillaCalendarPro?.Calendar)
    throw new Error(
      "A .date-picker needs Vanilla Calendar Pro: load dist/vanilla-calendar.min.js with its own <script> before the Tsunami script.",
    );
  const { text, button, hidden, panel } = parts(root);
  const span = button?.querySelector(":scope > span");
  if (!panel || (!text && !span))
    throw new Error(
      "A .date-picker needs a text input, or a button holding a span, and a [data-popover] panel.",
      { cause: root },
    );
  destroy(root);

  const control = text ?? button;
  const range = root.dataset.mode === "range";
  const count = range ? 2 : 1;
  const locale = localeOf(root, options);
  const format = formatter(locale, root.dataset.format);
  const years = yearsOf(locale);
  const labels = labelsOf(locale);
  const carrier = hidden ?? text;
  let dates = [];
  let months = 0; // months the calendar shows side by side, 0 until built

  const state = {
    panel,
    control,
    host: document.createElement("div"),
    quiet: false,
    calendar: null,
  };
  panel.prepend(state.host);
  panel.id ||= `date-picker-${++uid}`;
  panel.setAttribute("popover", "manual");
  panel.setAttribute("role", "dialog");
  panel.setAttribute(
    "aria-label",
    root.dataset.label ||
      say(locale, range ? "datePicker.labelRange" : "datePicker.label"),
  );
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

  // Show the chosen dates in the control, the hidden input, the presets and
  // the calendar.
  function paint() {
    const shown = dates.map((d) => {
      const date = new Date(`${d}T00:00:00Z`);
      return format ? format.format(date) : d;
    });
    if (text) {
      // A written range is not typed back, so its "to" follows the language.
      text.value = shown.join(format ? say(locale, "datePicker.to") : TO);
      text.removeAttribute("aria-invalid");
    }
    if (span)
      span.textContent = shown.join(" → ") || root.dataset.placeholder || "";
    root.toggleAttribute("data-empty", dates.length === 0);
    if (hidden) hidden.value = value();
    presets();
    sync();
  }

  // Named presets get today's dates; the matching one is pressed.
  function presets() {
    for (const preset of panel.querySelectorAll("[data-presets] button")) {
      const name = preset.dataset.preset;
      if (name) preset.value = presetValue(name, count);
      preset.setAttribute("aria-pressed", String(preset.value === value()));
    }
  }

  // The library writes Gregorian years in the header and the year list; a
  // locale with another calendar (th: Buddhist era) gets its own years in the
  // text and the aria-labels. data-vc-year and the values stay Gregorian.
  function relabel() {
    const cal = state.calendar;
    if (!years || !cal) return;
    const put = (el, text, label) => {
      if (el.textContent !== text) el.textContent = text;
      if (el.ariaLabel !== label) el.ariaLabel = label;
    };
    for (const el of state.host.querySelectorAll("[data-vc-years-year]")) {
      const shown = years(Number(el.dataset.vcYearsYear));
      put(el, shown, shown);
    }
    for (const el of state.host.querySelectorAll('[data-vc="year"]')) {
      const y = el.dataset.vcYear;
      const shown = years(Number(y));
      put(el, shown, `${cal.labels.year} ${shown}`);
      const column = el.closest('[data-vc="column"]');
      const label = column?.ariaLabel;
      if (label?.endsWith(` ${y}`))
        column.ariaLabel = `${label.slice(0, -y.length)}${shown}`;
    }
  }

  function sync() {
    const first = dates[0];
    state.calendar.set({
      selectedDates: range && dates.length === 2 ? [dates.join(":")] : dates,
      ...(first
        ? {
            selectedMonth: Number(first.slice(5, 7)) - 1,
            selectedYear: Number(first.slice(0, 4)),
          }
        : {}),
    });
    relabel();
  }

  function commit(next) {
    const before = value();
    dates = next;
    paint();
    if (value() === before) return;
    carrier?.dispatchEvent(new Event("input", { bubbles: true }));
    root.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: { value: value(), dates: [...dates] },
      }),
    );
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
      ...(root.dataset.min ? { dateMin: root.dataset.min } : {}),
      ...(root.dataset.max ? { dateMax: root.dataset.max } : {}),
      ...options,
      // A locale object from options goes to the library as it is.
      locale: typeof options.locale === "object" ? options.locale : locale,
      labels: {
        ...labels,
        ...options.labels,
        arrowPrev: { ...labels.arrowPrev, ...options.labels?.arrowPrev },
        arrowNext: { ...labels.arrowNext, ...options.labels?.arrowNext },
      },
      onClickDate(self, event) {
        options.onClickDate?.(self, event);
        const picked = self.context.selectedDates.filter(Boolean).sort();
        if (picked.length < count) return;
        const next = [picked[0], picked[picked.length - 1]].slice(0, count);
        state.quiet = true;
        commit(next);
        control.focus();
        state.quiet = false;
        close();
      },
    });
    state.calendar.init();
    sync();
  }

  function show() {
    if (open.has(root) || control.disabled) return;
    presets(); // named presets follow today's date
    // A narrow window and a wide one show a different number of months.
    if ((range && wide() ? 2 : 1) !== months) build();
    else sync(); // drops a half-chosen range
    open.add(root);
    panel.setAttribute("aria-hidden", "false");
    panel.showPopover();
    button?.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (!open.has(root)) return;
    open.delete(root);
    panel.hidePopover();
    panel.setAttribute("aria-hidden", "true");
    button?.setAttribute("aria-expanded", "false");
  }

  Object.assign(state, { commit, show, close, parse: (t) => parse(t, count) });
  states.set(root, state);
  mounted.add(root);
  build();
  // The library redraws the header and the year list on its own (arrows,
  // keys, a pick in the lists): put the locale's years back after each redraw.
  if (years) {
    state.observer = new MutationObserver(relabel);
    state.observer.observe(state.host, { childList: true, subtree: true });
  }

  const start = parse(hidden?.value || text?.value || "", count);
  if (start) {
    dates = start;
    paint();
  } else presets();

  Object.defineProperties(root, {
    value: {
      configurable: true,
      get: () => value(),
      set(next) {
        commit(parse(String(next ?? ""), count) ?? []);
      },
    },
    open: { configurable: true, value: show },
    close: { configurable: true, value: close },
    calendar: { configurable: true, get: () => state.calendar },
  });
  root.setAttribute("data-date-picker-initialized", "true");
}

const upgrade = (root) => {
  if (states.has(root)) return;
  try {
    mount(root);
  } catch (error) {
    console.error(error.message, root);
  }
};
const all = (node) => node.querySelectorAll?.(ROOT).forEach(upgrade);

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
    for (const n of m.addedNodes) {
      if (n.nodeType !== 1 || n.closest("[data-vc]")) continue;
      if (n.matches(ROOT)) upgrade(n);
      all(n);
    }
    for (const n of m.removedNodes)
      if (!n.isConnected)
        for (const root of mounted) if (!root.isConnected) destroy(root);
  }),
).observe(document.documentElement, { childList: true, subtree: true });

const rootOf = (el) => el.closest?.(ROOT);
const stateOf = (el) => {
  const root = rootOf(el);
  return root && states.has(root) ? [root, states.get(root)] : [];
};

const choose = (state, dates) => {
  state.commit(dates);
  state.quiet = true;
  state.control.focus();
  state.quiet = false;
  state.close();
};

// The field or the button opens the calendar.
document.addEventListener("focusin", (e) => {
  const [, state] = stateOf(e.target);
  if (
    state &&
    e.target === state.control &&
    !state.quiet &&
    e.target.localName === "input"
  )
    state.show();
});
document.addEventListener("click", (e) => {
  const [root, state] = stateOf(e.target);
  if (!state) return;
  const hit = e.target.closest("button, input");
  if (hit === state.control) {
    if (hit.localName === "button")
      open.has(root) ? state.close() : state.show();
    else state.show();
    return;
  }
  // A preset chooses its dates and closes the panel.
  const preset = e.target.closest("[data-presets] button");
  if (preset && state.panel.contains(preset))
    choose(state, state.parse(preset.value) ?? []);
});

// Typed text is a change only once it is a date; the native event stops here.
document.addEventListener(
  "change",
  (e) => {
    const [root, state] = stateOf(e.target);
    if (!state || e.target !== state.control || e.target.localName !== "input")
      return;
    e.stopPropagation();
    const next = state.parse(e.target.value);
    const { min, max } = root.dataset;
    const inside =
      next && next.every((d) => (!min || d >= min) && (!max || d <= max));
    if (inside) state.commit(next);
    else e.target.setAttribute("aria-invalid", "true");
  },
  true,
);

// A pointer press outside, or focus moving out of the picker (Tab), closes it.
document.addEventListener("pointerdown", (e) => {
  for (const root of [...open])
    if (!root.contains(e.target)) states.get(root).close();
});
document.addEventListener("focusout", (e) => {
  const [root, state] = stateOf(e.target);
  // A null target is a calendar redraw or a click on the panel's padding.
  if (state && e.relatedTarget && !root.contains(e.relatedTarget))
    state.close();
});

// After Escape the field has focus but the panel is closed: ArrowDown reopens it.
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" || e.defaultPrevented) return;
  const [root, state] = stateOf(e.target);
  if (!state || e.target !== state.control || open.has(root)) return;
  e.preventDefault();
  state.show();
});

// Home, End, PageUp and PageDown on a day, as in the WAI-ARIA date grid. The
// library handles the arrow keys; these go to a computed date, which is shown
// (the month is redrawn when it is not on screen) and focused.
const shifted = (iso, key, shift, first) => {
  const [y, m, d] = iso.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  const day = (at.getUTCDay() - first + 7) % 7; // days since the week began
  if (key === "Home") at.setUTCDate(d - day);
  else if (key === "End") at.setUTCDate(d - day + 6);
  else {
    const months = (shift ? 12 : 1) * (key === "PageUp" ? -1 : 1);
    const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
    at.setTime(Date.UTC(y, m - 1 + months, Math.min(d, last)));
  }
  return at.toISOString().slice(0, 10);
};
document.addEventListener("keydown", (e) => {
  if (
    e.defaultPrevented ||
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    !["Home", "End", "PageUp", "PageDown"].includes(e.key)
  )
    return;
  const [root, state] = stateOf(e.target);
  const btn = e.target.closest?.("[data-vc-date-btn]");
  if (!state || !btn || !open.has(root) || !state.host.contains(btn)) return;
  if (e.shiftKey && !e.key.startsWith("Page")) return;
  e.preventDefault();
  const cal = state.calendar;
  const iso = shifted(
    btn.closest("[data-vc-date]").dataset.vcDate,
    e.key,
    e.shiftKey,
    cal.firstWeekday ?? 1,
  );
  const find = () =>
    [...state.host.querySelectorAll(`[data-vc-date="${iso}"]`)].find(
      (c) =>
        c.dataset.vcDateMonth === "current" &&
        !c.querySelector("button:disabled, [aria-disabled='true']"),
    )?.firstElementChild;
  let next = find();
  if (!next) {
    const [y, m] = iso.split("-").map(Number);
    cal.set({ selectedYear: y, selectedMonth: m - 1 }, { dates: true, month: true, year: true });
    next = find();
  }
  next?.focus();
});

// Escape closes the panel first and goes no further, so a dialog stays open.
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Escape") return;
    const [root, state] = stateOf(e.target);
    if (!state || !open.has(root)) return;
    e.preventDefault();
    e.stopPropagation();
    state.close();
    state.quiet = true;
    state.control.focus();
    state.quiet = false;
  },
  true,
);

(window.tsunami ??= {}).datePicker = {
  mount,
  get: (el) => states.get(el)?.calendar ?? null,
  destroy,
};
