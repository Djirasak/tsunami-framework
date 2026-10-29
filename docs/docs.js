// Docs sidebar search: Ctrl/Cmd+K focuses it; filters nav links by data-label and data-keywords.
const sidebar = document.getElementById("docs-nav");
const input = sidebar.querySelector('input[type="search"]');
const links = [...sidebar.querySelectorAll("nav a")];
const labels = [...sidebar.querySelectorAll("nav h2")];

function filter() {
  const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  for (const a of links) {
    const text = `${a.dataset.label} ${a.dataset.keywords}`.toLowerCase();
    a.hidden = !terms.every((t) => text.includes(t));
  }
  // Hide a group label when none of its links match.
  for (const h of labels) {
    let el = h.nextElementSibling;
    let any = false;
    while (el && el.tagName === "A") {
      any ||= !el.hidden;
      el = el.nextElementSibling;
    }
    h.hidden = !any;
  }
}

input.addEventListener("input", filter);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // Prefer a link whose label matches over a keyword-only match.
    const q = input.value.trim().toLowerCase();
    const shown = links.filter((a) => !a.hidden);
    (
      shown.find((a) => a.dataset.label.toLowerCase().includes(q)) ?? shown[0]
    )?.click();
  }
  if (e.key === "Escape" && input.value) {
    e.preventDefault();
    input.value = "";
    filter();
  }
});

document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
  e.preventDefault();
  // Below 48rem the sidebar is a closed popover.
  if (!sidebar.checkVisibility()) sidebar.showPopover();
  input.focus();
  input.select();
});
