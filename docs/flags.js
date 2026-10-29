// Flags page: render every flag from flags.json, filter by code or name, click to copy.
const grid = document.getElementById("flag-grid");
const input = document.getElementById("flag-search");
const count = document.getElementById("flag-count");
const { flags } = await (await fetch("flags.json")).json();
const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

grid.innerHTML = flags
  .map(
    ([code, name]) =>
      `<button type="button" data-code="${code}" data-name="${attr(name.toLowerCase())}" title="${attr(name)}"><span class="flag flag-${code}" data-size="lg" aria-hidden="true"></span><code>${code}</code><span>${attr(name)}</span></button>`,
  )
  .join("");

function filter() {
  const q = input.value.trim().toLowerCase();
  let shown = 0;
  for (const el of grid.children) {
    const hit =
      !q || el.dataset.code.includes(q) || el.dataset.name.includes(q);
    el.hidden = !hit;
    if (hit) shown++;
  }
  count.textContent = `${shown} / ${flags.length}`;
}

input.addEventListener("input", filter);
filter();

grid.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const label = btn.title;
  try {
    await navigator.clipboard.writeText(
      `<span class="flag flag-${btn.dataset.code}" role="img" aria-label="${label}"></span>`,
    );
  } catch {
    return; // Clipboard blocked: nothing to copy to.
  }
  btn.dataset.copied = "";
  count.textContent = `คัดลอก flag-${btn.dataset.code} แล้ว Copied`;
  setTimeout(() => {
    delete btn.dataset.copied;
    filter();
  }, 1200);
});
