// Pressed: toggle buttons ([aria-pressed]) inside a [data-pressed] group.
// data-pressed="single": one button on at a time; "multiple": each flips.
// Fires tsunami:pressedchange on the group with { button, pressed }.
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
  group.dispatchEvent(
    new CustomEvent("tsunami:pressedchange", {
      bubbles: true,
      detail: { button: btn, pressed },
    }),
  );
});
