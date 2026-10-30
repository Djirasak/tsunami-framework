// Filter bar: .filter-bar holds .chip elements, each with a remove button, and
// an optional [data-clear] button ("Clear all"). Removing a chip takes it out
// of the page and fires tsunami:chipremove on the chip ({ value, label },
// value is the chip's data-value; cancelable, so preventDefault keeps the chip),
// then tsunami:filterchange on the bar ({ values }, the data-value of every chip
// left). "Clear all" removes every chip and fires tsunami:filterchange once.
// The clear button is hidden while there are no chips.
const BAR = ".filter-bar";

const chips = (bar) => [...bar.querySelectorAll(":scope > .chip")];
const values = (bar) => chips(bar).map((c) => c.dataset.value ?? c.textContent.trim());

function refresh(bar) {
  const clear = bar.querySelector(":scope > [data-clear]");
  if (clear) clear.hidden = !chips(bar).length;
}

function changed(bar) {
  refresh(bar);
  bar.dispatchEvent(
    new CustomEvent("tsunami:filterchange", {
      bubbles: true,
      detail: { values: values(bar) },
    }),
  );
}

function remove(bar, chip) {
  const next = chip.nextElementSibling;
  const ok = chip.dispatchEvent(
    new CustomEvent("tsunami:chipremove", {
      bubbles: true,
      cancelable: true,
      detail: {
        value: chip.dataset.value ?? chip.textContent.trim(),
        label: chip.textContent.trim(),
      },
    }),
  );
  if (!ok) return;
  chip.remove();
  changed(bar);
  // Keep keyboard focus inside the bar.
  (next?.querySelector("button") ?? chips(bar).at(-1)?.querySelector("button"))?.focus();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest?.(`${BAR} > .chip > button, ${BAR} > [data-clear]`);
  if (!btn) return;
  const bar = btn.closest(BAR);
  if (btn.matches("[data-clear]")) {
    for (const c of chips(bar)) c.remove();
    changed(bar);
  } else remove(bar, btn.parentElement);
});

function mount(root = document) {
  for (const bar of root.querySelectorAll(BAR)) refresh(bar);
}

// The script may run before the markup is parsed; chips added later are
// handled by the click delegation, a bar added later is refreshed here.
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
else mount();
new MutationObserver((records) => {
  if (document.readyState === "loading") return;
  for (const r of records)
    for (const n of r.addedNodes)
      if (n.nodeType === 1 && (n.matches(BAR) || n.querySelector(BAR)))
        return mount();
}).observe(document.documentElement, { childList: true, subtree: true });

(window.tsunami ??= {}).filterBar = {
  mount,
  values: (bar) => values(bar),
  clear(bar) {
    for (const c of chips(bar)) c.remove();
    changed(bar);
  },
};
