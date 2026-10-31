// Tag input: .tag-input holds chips and a text input. Enter or comma adds the
// typed text as a tag, Backspace in the empty box removes the last tag, a paste
// is split on commas and new lines, and a duplicate is ignored. A hidden input
// named by data-name keeps the tags joined with commas for a form. Options:
// data-value="a,b" (start tags), data-max (most tags allowed), data-disabled.
// Put aria-invalid="true" on .tag-input for the red border. Fires
// tsunami:tagschange ({ value: [...] }) on .tag-input. Reset restores the start tags.
const TAGS = ".tag-input";

const tags = (el) => (el._tags ??= []);
const text = (el) => el.querySelector('input[type="text"]');

function split(s) {
  return s
    .split(/[,\n\r]/)
    .map((t) => t.trim())
    .filter(Boolean);
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

function render(el) {
  for (const c of el.querySelectorAll(":scope > .chip")) c.remove();
  const input = text(el);
  for (const t of tags(el)) el.insertBefore(chip(el, t), input);
  const hidden = el.querySelector('input[type="hidden"]');
  if (hidden) hidden.value = tags(el).join(",");
}

// A screen reader hears the count after each change, and when the limit stops an add.
function say(el, text) {
  if (el._status) el._status.textContent = text;
}

function change(el) {
  render(el);
  const n = tags(el).length;
  say(el, n === 0 ? "No tags" : n === 1 ? "1 tag" : `${n} tags`);
  el.dispatchEvent(
    new CustomEvent("tsunami:tagschange", {
      bubbles: true,
      detail: { value: [...tags(el)] },
    }),
  );
}

// Adds each new tag (no duplicates, up to data-max); returns true if any was added.
function add(el, list) {
  const max = Number(el.dataset.max) || Infinity;
  let added = false;
  for (const t of list) {
    if (tags(el).length >= max) {
      say(el, `Limit of ${max} tags reached`);
      break;
    }
    if (tags(el).includes(t)) continue;
    tags(el).push(t);
    added = true;
  }
  if (added) change(el);
  return added;
}

function setDisabled(el) {
  const off = "disabled" in el.dataset;
  text(el).disabled = off;
}

function start(el) {
  const list = split(el.dataset.value ?? "");
  el._tags = [];
  for (const t of list) if (!el._tags.includes(t)) el._tags.push(t);
  render(el);
}

function mount(root = document) {
  for (const el of root.querySelectorAll(TAGS)) {
    if ("mounted" in el.dataset) continue; // data-mounted="" is falsy: test for the key
    el.dataset.mounted = "";
    if (!text(el)) {
      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      if (el.getAttribute("aria-label")) input.setAttribute("aria-label", el.getAttribute("aria-label"));
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
    start(el);
  }
}

const field = (e) => e.target.closest?.(`${TAGS} > input[type="text"]`);

document.addEventListener("keydown", (e) => {
  const input = field(e);
  if (!input || e.isComposing) return;
  const el = input.closest(TAGS);
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault(); // Enter must not submit the form
    if (add(el, split(input.value))) input.value = "";
    else if (input.value.trim() && tags(el).includes(input.value.trim())) input.value = "";
  } else if (e.key === "Backspace" && !input.value && tags(el).length) {
    tags(el).pop();
    change(el);
  }
});

document.addEventListener("paste", (e) => {
  const input = field(e);
  if (!input) return;
  const el = input.closest(TAGS);
  const pasted = e.clipboardData.getData("text");
  if (!/[,\n\r]/.test(pasted)) return; // a plain word is pasted into the box as usual
  e.preventDefault();
  add(el, split(input.value + pasted));
  input.value = "";
});

// Leaving the box with text in it keeps that text as a tag.
document.addEventListener("focusout", (e) => {
  const input = field(e);
  if (!input || !input.value.trim()) return;
  const el = input.closest(TAGS);
  add(el, split(input.value));
  input.value = "";
});

document.addEventListener("click", (e) => {
  const el = e.target.closest?.(TAGS);
  if (!el || "disabled" in el.dataset) return;
  const btn = e.target.closest("button");
  if (btn && btn.parentElement.matches(".chip") && btn.closest(TAGS) === el) {
    const chips = [...el.querySelectorAll(":scope > .chip")];
    tags(el).splice(chips.indexOf(btn.parentElement), 1);
    change(el);
    text(el).focus();
  } else if (!btn) text(el).focus();
});

// The reset event fires before fields are restored.
document.addEventListener("reset", (e) =>
  setTimeout(() => {
    for (const el of e.target.querySelectorAll(TAGS)) {
      text(el).value = "";
      start(el);
    }
  }),
);

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
else mount();
new MutationObserver((records) => {
  if (document.readyState === "loading") return;
  for (const r of records)
    for (const n of r.addedNodes)
      if (n.nodeType === 1 && (n.matches(TAGS) || n.querySelector(TAGS)))
        return mount();
}).observe(document.documentElement, { childList: true, subtree: true });

(window.tsunami ??= {}).tagInput = {
  mount,
  value: (el) => [...tags(el)],
  set(el, list) {
    el._tags = [];
    add(el, list.map((t) => String(t).trim()).filter(Boolean));
    change(el);
  },
  clear(el) {
    el._tags = [];
    change(el);
  },
};
