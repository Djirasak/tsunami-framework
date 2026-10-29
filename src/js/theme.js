// Theme: [data-theme-toggle] buttons. Empty value flips light/dark;
// "light", "dark" or "system" sets it. Pressed state is kept in sync.
// Pair with an inline <head> script that applies the stored value before paint.
const KEY = "tsunami-theme";
const root = document.documentElement;
const prefersDark = matchMedia("(prefers-color-scheme: dark)");

const effective = () =>
  root.dataset.theme ?? (prefersDark.matches ? "dark" : "light");

function sync() {
  const chosen = root.dataset.theme ?? "system";
  for (const btn of document.querySelectorAll("[data-theme-toggle]")) {
    const value = btn.dataset.themeToggle;
    if (value) btn.setAttribute("aria-pressed", String(value === chosen));
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-theme-toggle]");
  if (!btn) return;
  let next =
    btn.dataset.themeToggle || (effective() === "dark" ? "light" : "dark");
  if (next === "system") {
    delete root.dataset.theme;
    next = null;
  } else {
    root.dataset.theme = next;
  }
  try {
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  sync();
});

sync();
