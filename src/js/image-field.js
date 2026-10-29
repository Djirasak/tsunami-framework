// Image field: .image-field with [data-change], [data-clear], input[type=file] and an optional checkbox.
// Change opens the picker and previews the chosen file; clear empties the field and ticks the checkbox.
// Both fire input + change on the file input so the form (and the save bar) hear it.
const FIELD = ".image-field";
const parts = (field) => ({
  img: field.querySelector(":scope > img"),
  file: field.querySelector(':scope > input[type="file"]'),
  box: field.querySelector(':scope > input[type="checkbox"]'),
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest(
    `${FIELD} > [data-change], ${FIELD} > [data-clear]`,
  );
  if (!btn) return;
  const field = btn.parentElement;
  const { img, file, box } = parts(field);
  if (btn.matches("[data-change]")) {
    file?.click();
    return;
  }
  if (img?.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  img?.removeAttribute("src");
  field.dataset.empty = "";
  if (box) box.checked = true;
  if (file) {
    file.value = "";
    file.dispatchEvent(new Event("input", { bubbles: true }));
    file.dispatchEvent(new Event("change", { bubbles: true }));
  }
  field.querySelector(":scope > [data-change]")?.focus();
});

document.addEventListener("change", (e) => {
  const file = e.target.closest(`${FIELD} > input[type="file"]`);
  const chosen = file?.files?.[0];
  if (!chosen) return;
  const field = file.parentElement;
  const { img, box } = parts(field);
  if (img) {
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(chosen);
  }
  delete field.dataset.empty;
  if (box) box.checked = false;
});
