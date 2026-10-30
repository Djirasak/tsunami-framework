// Color field: .color-field holds input[type=color] and input[type=text].
// Picking a colour writes it to the text field (and fires input there, so the
// form and the save bar hear it); typing a valid #rgb or #rrggbb sets the picker.
// data-empty is set while the text is empty. Reset puts the original text back.
const FIELD = ".color-field";
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const parts = (field) => ({
  picker: field.querySelector('input[type="color"]'),
  text: field.querySelector('input[type="text"]'),
});

// "#abc" -> "#aabbcc"
const long = (hex) =>
  hex.length === 7
    ? hex.toLowerCase()
    : `#${[...hex.slice(1)].map((c) => c + c).join("")}`.toLowerCase();

function sync(field) {
  const { picker, text } = parts(field);
  if (!picker || !text) return;
  const value = text.value.trim();
  field.toggleAttribute("data-empty", value === "");
  if (HEX.test(value)) picker.value = long(value);
}

document.addEventListener("input", (e) => {
  const field = e.target.closest?.(FIELD);
  if (!field) return;
  const { picker, text } = parts(field);
  if (e.target === picker) {
    text.value = picker.value;
    text.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (e.target === text) sync(field);
});

document.addEventListener("change", (e) => {
  const field = e.target.closest?.(FIELD);
  const { picker, text } = field ? parts(field) : {};
  if (e.target === picker)
    text.dispatchEvent(new Event("change", { bubbles: true }));
});

// After a reset the text field holds its original value again.
document.addEventListener("reset", (e) => {
  setTimeout(() => e.target.querySelectorAll(FIELD).forEach(sync));
});

const syncAll = (root = document) => root.querySelectorAll(FIELD).forEach(sync);
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => syncAll());
else syncAll();

new MutationObserver((records) => {
  for (const r of records)
    for (const n of r.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches(FIELD)) sync(n);
      else syncAll(n);
    }
}).observe(document.documentElement, { childList: true, subtree: true });
