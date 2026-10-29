// Theme: <html data-theme="light|dark">; no attribute follows the system.
// [data-theme-toggle] buttons: empty value flips light/dark; "light", "dark"
// or "system" sets it. Pressed state is kept in sync. The choice is stored
// in localStorage "tsunami-theme" and applied as soon as the script runs, so
// load it as a plain blocking <script> in <head> to avoid a flash. API: window.tsunami.theme = { get, set, toggle }.
// Every change fires tsunami:themechange on document with { theme, choice }.
const KEY = "tsunami-theme";
const root = document.documentElement;
const prefersDark = matchMedia("(prefers-color-scheme: dark)");

// The theme in effect: "dark" or "light".
const get = () =>
  root.dataset.theme === "dark" ||
  (root.dataset.theme !== "light" && prefersDark.matches)
    ? "dark"
    : "light";

// The stored choice: "light", "dark" or "system".
const choice = () =>
  root.dataset.theme === "dark" || root.dataset.theme === "light"
    ? root.dataset.theme
    : "system";

function announce() {
  document.dispatchEvent(
    new CustomEvent("tsunami:themechange", {
      bubbles: true,
      detail: { theme: get(), choice: choice() },
    }),
  );
}

function sync() {
  const chosen = choice();
  for (const btn of document.querySelectorAll("[data-theme-toggle]")) {
    const value = btn.dataset.themeToggle;
    if (value) btn.setAttribute("aria-pressed", String(value === chosen));
  }
}

// "light" or "dark" pins the theme; anything else ("system") follows the OS.
function set(name) {
  const next = name === "light" || name === "dark" ? name : null;
  if (next) root.dataset.theme = next;
  else delete root.dataset.theme;
  try {
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  sync();
  announce();
}

const toggle = () => set(get() === "dark" ? "light" : "dark");

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-theme-toggle]");
  if (!btn) return;
  if (btn.dataset.themeToggle) set(btn.dataset.themeToggle);
  else toggle();
});

// Following the system: a system switch is a theme change too.
prefersDark.addEventListener("change", () => {
  if (choice() === "system") announce();
});

(window.tsunami ??= {}).theme = { get, set, toggle };

// Apply the stored choice before the first paint.
try {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
} catch {
  // Storage blocked: follow the system.
}

// The toggles may not be parsed yet when the script sits in <head>.
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", sync);
else sync();
