// Save bar: .save-bar[data-form="form-id"] shows while the form differs from
// its saved values and sets data-dirty="true|false" on the bar.
// Saved values are the native defaults (value / checked / selected
// attributes), so <button type="reset" form="form-id"> is Discard.
// A bar written without `hidden` always shows. data-warn-on-leave asks before
// the page is left with unsaved changes. The form receives bubbling
// tsunami:dirty and tsunami:clean events.
// API: window.tsunami.saveBar.check(barOrForm), .markClean(barOrForm).

// Fields not compared: buttons, fieldsets, outputs, anything in a dialog,
// the filter box of a styled select, and [data-save-bar-ignore].
const SKIP =
  "button, fieldset, output, object, [type=submit], [type=reset], [type=button], [type=image], dialog *, .select [role=combobox], [data-save-bar-ignore]";

const fields = (form) => [...form.elements].filter((el) => !el.matches(SKIP));

// Hidden and file inputs have no usable default, so their saved value is a
// snapshot; so is the number of fields (a row added or removed is a change).
const snapshots = new WeakMap();
const autoHide = new WeakMap();
const leaving = new WeakSet();
const lastState = new WeakMap();

const fileKey = (el) =>
  [...el.files].map((f) => `${f.name}:${f.size}:${f.lastModified}`).join("|");
const snapped = (el) => el.type === "hidden" || el.type === "file";
const current = (el) => (el.type === "file" ? fileKey(el) : el.value);

function snapshot(form) {
  const values = new Map();
  const list = fields(form);
  for (const el of list) if (snapped(el)) values.set(el, current(el));
  snapshots.set(form, { values, count: list.length });
}

function isDirty(form) {
  if (!snapshots.has(form)) snapshot(form);
  const { values, count } = snapshots.get(form);
  const list = fields(form);
  if (list.length !== count) return true;
  return list.some((el) => {
    if (snapped(el))
      return current(el) !== (values.has(el) ? values.get(el) : "");
    if (el.type === "checkbox" || el.type === "radio")
      return el.checked !== el.defaultChecked;
    if (el.tagName === "SELECT")
      return [...el.options].some((o) => o.selected !== o.defaultSelected);
    if ("defaultValue" in el) return el.value !== el.defaultValue;
    return false;
  });
}

const barsFor = (form) =>
  form?.id
    ? [...document.querySelectorAll(".save-bar[data-form]")].filter(
        (bar) => bar.dataset.form === form.id,
      )
    : [];

const formOf = (el) => {
  if (el instanceof HTMLFormElement) return el;
  const form = el?.dataset?.form && document.getElementById(el.dataset.form);
  return form instanceof HTMLFormElement ? form : null;
};

// Compares the form now, updates its bars and sends dirty/clean on a change.
function check(target) {
  const form = formOf(target);
  if (!form) return false;
  const bars = barsFor(form);
  const dirty = isDirty(form);
  for (const bar of bars) {
    if (!autoHide.has(bar)) autoHide.set(bar, bar.hidden);
    if (autoHide.get(bar)) bar.hidden = !dirty;
    bar.dataset.dirty = String(dirty);
  }
  const was = lastState.get(form) ?? false;
  lastState.set(form, dirty);
  if (was !== dirty)
    form.dispatchEvent(
      new CustomEvent(dirty ? "tsunami:dirty" : "tsunami:clean", {
        bubbles: true,
        detail: { form, bars },
      }),
    );
  return dirty;
}

// Takes the form as it stands as its saved values.
function markClean(target) {
  const form = formOf(target);
  if (!form) return;
  for (const el of fields(form)) {
    if (el.type === "checkbox" || el.type === "radio")
      el.defaultChecked = el.checked;
    else if (el.tagName === "SELECT")
      for (const o of el.options) o.defaultSelected = o.selected;
    else if (!snapped(el) && "defaultValue" in el) el.defaultValue = el.value;
  }
  snapshot(form);
  check(form);
}

const watched = (form) => form && barsFor(form).length > 0;

// Snapshot before the first edit: a styled select writes its hidden input
// only after the trigger has been focused.
document.addEventListener("focusin", (e) => {
  const form = e.target.form;
  if (watched(form) && !snapshots.has(form)) snapshot(form);
});
const onEdit = (e) => {
  const form =
    e.target.form ?? (e.target instanceof HTMLFormElement && e.target);
  if (!watched(form)) return;
  leaving.delete(form);
  check(form);
};
document.addEventListener("input", onEdit);
document.addEventListener("change", onEdit);
// The reset event fires before fields are restored.
document.addEventListener("reset", (e) => {
  if (watched(e.target)) setTimeout(() => check(e.target));
});
// After a submit the values count as saved.
document.addEventListener("submit", (e) => {
  if (watched(e.target)) markClean(e.target);
});
// A link in the bar (Discard as href="") leaves without asking.
document.addEventListener("click", (e) => {
  const bar = e.target.closest?.(".save-bar[data-form]");
  if (bar && e.target.closest("a[href]")) {
    const form = formOf(bar);
    if (form) leaving.add(form);
  }
});
window.addEventListener("beforeunload", (e) => {
  for (const bar of document.querySelectorAll(
    ".save-bar[data-form][data-warn-on-leave]",
  )) {
    const form = formOf(bar);
    if (form && !leaving.has(form) && isDirty(form)) {
      e.preventDefault();
      e.returnValue = "";
      return;
    }
  }
});

for (const bar of document.querySelectorAll(".save-bar[data-form]")) check(bar);

(window.tsunami ??= {}).saveBar = { check, markClean };
