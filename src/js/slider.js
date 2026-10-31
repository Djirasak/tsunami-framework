// Slider: keeps --value (the value as a percentage) on input.slider so the
// track fills up to the thumb, and writes the value into any
// <output for="slider-id">. Runs on load, on input and after a form reset.
function sync(el) {
  const min = el.min === "" ? 0 : Number(el.min);
  const max = el.max === "" ? 100 : Number(el.max);
  const pct = max > min ? ((Number(el.value) - min) / (max - min)) * 100 : 0;
  el.style.setProperty("--value", `${pct}%`);
  if (!el.id) return;
  for (const out of document.querySelectorAll("output")) {
    if (out.htmlFor.contains(el.id)) out.value = el.value;
  }
}

const syncAll = (root = document) => {
  for (const el of root.querySelectorAll(".slider")) sync(el);
};

document.addEventListener("input", (e) => {
  if (e.target.matches?.(".slider")) sync(e.target);
});
// The reset event fires before fields are restored.
document.addEventListener("reset", (e) => setTimeout(() => syncAll(e.target)));

// The script may run before the sliders are parsed; later ones are started too.
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => syncAll(), {
    once: true,
  });
else syncAll();
new MutationObserver((records) => {
  if (document.readyState === "loading") return;
  for (const r of records) {
    if (r.type === "attributes") {
      if (r.target.matches(".slider")) sync(r.target);
      continue;
    }
    for (const n of r.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches(".slider")) sync(n);
      for (const el of n.querySelectorAll(".slider")) sync(el);
    }
  }
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["min", "max", "value", "class"],
});

(window.tsunami ??= {}).slider = { sync };
