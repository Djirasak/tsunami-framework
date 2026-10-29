// Tabs: [data-tabs] containing role="tablist" / "tab" / "tabpanel" markup.
// Tabs link to panels with aria-controls; arrows, Home and End move between tabs.
const TAB = '[data-tabs] [role="tab"]';

function select(tab) {
  for (const t of tab
    .closest('[role="tablist"]')
    .querySelectorAll('[role="tab"]')) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute("aria-controls"));
    if (panel) panel.hidden = !on;
  }
}

document.addEventListener("click", (e) => {
  const tab = e.target.closest(TAB);
  if (tab) select(tab);
});

document.addEventListener("keydown", (e) => {
  const tab = e.target.closest(TAB);
  if (!tab) return;
  const tabs = [
    ...tab
      .closest('[role="tablist"]')
      .querySelectorAll('[role="tab"]:not(:disabled)'),
  ];
  const i = tabs.indexOf(tab);
  const to = {
    ArrowRight: i + 1,
    ArrowLeft: i - 1,
    Home: 0,
    End: tabs.length - 1,
  }[e.key];
  if (to === undefined) return;
  e.preventDefault();
  const next = tabs[(to + tabs.length) % tabs.length];
  select(next);
  next.focus();
});
