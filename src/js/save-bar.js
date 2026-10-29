// Save bar: .save-bar[data-form="form-id"] shows while the form differs from
// its loaded values (defaultValue / defaultChecked / defaultSelected).
// Use <button type="reset" form="form-id"> as Discard.
const isDirty = (form) =>
  [...form.elements].some((el) => {
    if (el.type === "checkbox" || el.type === "radio")
      return el.checked !== el.defaultChecked;
    if (el.tagName === "SELECT")
      return [...el.options].some((o) => o.selected !== o.defaultSelected);
    if (el.matches("input, textarea")) return el.value !== el.defaultValue;
    return false;
  });

function sync(form) {
  if (!form?.id) return;
  const bars = document.querySelectorAll(
    `.save-bar[data-form="${CSS.escape(form.id)}"]`,
  );
  if (!bars.length) return;
  const dirty = isDirty(form);
  for (const bar of bars) bar.hidden = !dirty;
}

document.addEventListener("input", (e) => sync(e.target.form));
document.addEventListener("change", (e) => sync(e.target.form));
// The reset event fires before fields are restored.
document.addEventListener("reset", (e) => setTimeout(() => sync(e.target)));
