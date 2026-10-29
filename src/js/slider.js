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
syncAll();

(window.tsunami ??= {}).slider = { sync };
