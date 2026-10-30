// Color field: .color-field holds input[type=color] and input[type=text].
// Picking a colour writes it to the text field (and fires input there, so the
// form and the save bar hear it); typing a valid colour sets the picker.
// data-empty is set while the text is empty. Reset puts the original text back.
// data-alpha adds opacity: #rgba, #rrggbbaa and rgb()/rgba() are read, and an
// input[type=range] in the group sets it. The text is then written as #rrggbb,
// or #rrggbbaa when the opacity is below 100%.
const FIELD = ".color-field";
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const HEX_ALPHA = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB =
  /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*(\d*\.?\d+)(%?)\s*)?\)$/i;

const parts = (field) => ({
  picker: field.querySelector('input[type="color"]'),
  text: field.querySelector('input[type="text"]'),
  range: field.querySelector('input[type="range"]'),
});

const byte = (n) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");

// Text -> { hex: "#rrggbb", a: 0..1 }, or null when it is not a colour.
function parse(value, alpha) {
  if (!alpha) {
    if (!HEX.test(value)) return null;
    return { hex: long(value), a: 1 };
  }
  if (HEX_ALPHA.test(value)) {
    const digits = value.slice(1);
    const full =
      digits.length <= 4 ? [...digits].map((c) => c + c).join("") : digits;
    const a = full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1;
    return { hex: `#${full.slice(0, 6)}`.toLowerCase(), a };
  }
  const m = RGB.exec(value);
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  if (r > 255 || g > 255 || b > 255) return null;
  let a = m[4] === undefined ? 1 : Number(m[4]) / (m[5] ? 100 : 1);
  a = Math.min(1, Math.max(0, a));
  return { hex: `#${byte(r)}${byte(g)}${byte(b)}`, a };
}

// "#abc" -> "#aabbcc"
function long(hex) {
  return hex.length === 7
    ? hex.toLowerCase()
    : `#${[...hex.slice(1)].map((c) => c + c).join("")}`.toLowerCase();
}

const format = (hex, a) => (a >= 1 ? hex : hex + byte(Math.round(a * 255)));

function sync(field) {
  const { picker, text, range } = parts(field);
  if (!picker || !text) return;
  const alpha = field.hasAttribute("data-alpha");
  const value = text.value.trim();
  field.toggleAttribute("data-empty", value === "");
  const color = parse(value, alpha);
  if (color) picker.value = color.hex;
  if (!alpha) return;
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
  const field = e.target.closest?.(FIELD);
  if (!field) return;
  const { picker, text, range } = parts(field);
  const alpha = field.hasAttribute("data-alpha");
  if (e.target === picker) {
    const a = alpha ? (parse(text.value.trim(), true)?.a ?? 1) : 1;
    write(field, text, picker.value, a);
  } else if (e.target === range && alpha) {
    write(field, text, picker.value, Number(range.value) / 100);
  } else if (e.target === text) sync(field);
});

document.addEventListener("change", (e) => {
  const field = e.target.closest?.(FIELD);
  const { picker, text, range } = field ? parts(field) : {};
  if (e.target === picker || e.target === range)
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
