// Icons page: render the Lucide grid from icons.json, filter by name or tag, click to copy.
const grid = document.getElementById("icon-grid");
const input = document.getElementById("icon-search");
const count = document.getElementById("icon-count");
const status = document.getElementById("icon-status");
const { icons } = await (await fetch("icons.json")).json();
const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

grid.innerHTML = icons
  .map(
    ([name, tags]) =>
      `<button type="button" data-name="${name}" data-tags="${attr(tags)}" title="${attr(tags)}"><i class="icon icon-${name}" aria-hidden="true"></i><code>${name}</code></button>`,
  )
  .join("");

function filter() {
  const q = input.value.trim().toLowerCase();
  let shown = 0;
  for (const el of grid.children) {
    const hit =
      !q || el.dataset.name.includes(q) || el.dataset.tags.includes(q);
    el.hidden = !hit;
    if (hit) shown++;
  }
  count.textContent = `${shown} / ${icons.length}`;
}

input.addEventListener("input", filter);
filter();

grid.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(
      `<i class="icon icon-${btn.dataset.name}" aria-hidden="true"></i>`,
    );
    // "Copied" shows on the icon that was clicked (see .docs-icons in docs.css).
    btn.dataset.copied = "";
    status.textContent = `Copied icon-${btn.dataset.name}`;
    setTimeout(() => {
      delete btn.dataset.copied;
      status.textContent = "";
    }, 1200);
  } catch {
    // Clipboard blocked (e.g. insecure context): nothing to copy to.
  }
});
