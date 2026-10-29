// Tabs: .tabs (or [data-tabs]) containing role="tablist" / "tab" / "tabpanel".
// Tabs name their panel with aria-controls. Arrows (Up/Down when the tablist
// is aria-orientation="vertical"), Home and End move between enabled tabs.
// A tab with popovertarget opens a .dropdown; choosing an entry selects it.
// A [data-close] element inside a tab, or Delete on it, closes the tab after a
// cancelable, bubbling "tsunami:closetab" event with detail { tab, panel }.
const TAB = ':is(.tabs, [data-tabs]) [role="tab"]';

const enabled = (t) =>
  !t.disabled && t.getAttribute("aria-disabled") !== "true";
const listOf = (tab) => tab.closest('[role="tablist"]');
const tabsOf = (list) =>
  [...list.querySelectorAll('[role="tab"]')].filter((t) => listOf(t) === list);
const panelOf = (tab) =>
  document.getElementById(tab.getAttribute("aria-controls"));

function select(tab) {
  if (!tab || !enabled(tab)) return;
  for (const t of tabsOf(listOf(tab))) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = panelOf(t);
    if (panel) panel.hidden = !on;
  }
}

// Removes the tab and its panel unless a listener calls preventDefault().
// Returns the tab that takes its place (or null), or false when kept.
function close(tab) {
  const list = listOf(tab);
  const panel = panelOf(tab);
  const ok = tab.dispatchEvent(
    new CustomEvent("tsunami:closetab", {
      bubbles: true,
      cancelable: true,
      detail: { tab, panel },
    }),
  );
  if (!ok) return false;
  const tabs = tabsOf(list).filter((t) => t === tab || enabled(t));
  const i = tabs.indexOf(tab);
  const next = tabs[i + 1] ?? tabs[i - 1] ?? null;
  const selected = tab.getAttribute("aria-selected") === "true";
  tab.remove();
  panel?.remove();
  if (selected) select(next);
  return next;
}

document.addEventListener("click", (e) => {
  const tab = e.target.closest(TAB);
  if (tab) {
    if (e.target.closest("[data-close]")) {
      e.preventDefault();
      close(tab);
    } else if (!tab.hasAttribute("popovertarget")) {
      select(tab);
    }
    return;
  }
  // An entry in a tab's dropdown selects that tab.
  const entry = e.target.closest(".dropdown[popover][id] :is(a, button)");
  if (!entry) return;
  const id = CSS.escape(entry.closest(".dropdown").id);
  select(document.querySelector(`[role="tab"][popovertarget="${id}"]`));
});

document.addEventListener("keydown", (e) => {
  const tab = e.target.closest(TAB);
  if (!tab) return;
  if (e.key === "Delete" && tab.querySelector("[data-close]")) {
    e.preventDefault();
    const next = close(tab);
    if (next) next.focus();
    return;
  }
  const list = listOf(tab);
  const vertical = list.getAttribute("aria-orientation") === "vertical";
  const tabs = tabsOf(list).filter(enabled);
  const i = tabs.indexOf(tab);
  const to = {
    [vertical ? "ArrowDown" : "ArrowRight"]: i + 1,
    [vertical ? "ArrowUp" : "ArrowLeft"]: i - 1,
    Home: 0,
    End: tabs.length - 1,
  }[e.key];
  if (to === undefined) return;
  e.preventDefault();
  const next = tabs[(to + tabs.length) % tabs.length];
  select(next);
  next.focus();
});

(window.tsunami ??= {}).tabs = { select, close };
