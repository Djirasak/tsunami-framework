// Validate: form[data-validate] shows the browser's own validation as an error
// under the field, in place of the browser bubble. A field is checked when it
// loses focus, then again as it is typed in; submitting checks them all and
// moves focus to the first one that fails. The field gets aria-invalid, and its
// message sits in a small[data-error] (made if the .field has none) that is
// linked with aria-describedby and announced as an alert. data-message on a
// field replaces the browser's text. window.tsunami.validate.check(form or
// field) returns true when it is valid; .clear(form or field) resets it. A form that
// fails the check never reaches your own submit handlers.
const FIELD = "input:not([type='hidden']), select, textarea";

const fieldsOf = (form) => [...form.querySelectorAll(FIELD)];
const box = (f) => f.closest(".field");

function errorOf(f) {
  const wrap = box(f);
  if (!wrap) return null;
  let el = wrap.querySelector(":scope [data-error]");
  if (!el) {
    el = document.createElement("small");
    el.setAttribute("data-error", "");
    wrap.append(el);
  }
  el.id ||= `${f.id || f.name || "field"}-error`;
  return el;
}

function describe(f, el, on) {
  const ids = new Set((f.getAttribute("aria-describedby") || "").split(/\s+/));
  ids.delete("");
  if (on) ids.add(el.id);
  else ids.delete(el.id);
  if (ids.size) f.setAttribute("aria-describedby", [...ids].join(" "));
  else f.removeAttribute("aria-describedby");
}

function check(target) {
  if (target.matches?.("form"))
    return fieldsOf(target).map(check).every(Boolean);
  const f = target;
  if (!f.willValidate) return true;
  const ok = f.checkValidity();
  const el = errorOf(f);
  if (ok) f.removeAttribute("aria-invalid");
  else f.setAttribute("aria-invalid", "true");
  if (el) {
    const text = ok ? "" : f.dataset.message || f.validationMessage;
    if (el.textContent !== text) el.textContent = text;
    if (ok) el.removeAttribute("role");
    else el.setAttribute("role", "alert");
    describe(f, el, !ok);
  }
  return ok;
}

function clear(target) {
  const list = target.matches?.("form") ? fieldsOf(target) : [target];
  for (const f of list) {
    touched.delete(f);
    f.removeAttribute("aria-invalid");
    const el = box(f)?.querySelector(":scope [data-error]");
    if (el) {
      el.textContent = "";
      el.removeAttribute("role");
      describe(f, el, false);
    }
  }
}

const touched = new WeakSet();
const formOf = (e) => {
  const f = e.target.closest?.("form[data-validate]");
  return f && e.target.matches?.(FIELD) ? f : null;
};

const mount = (node) => {
  if (node.matches?.("form[data-validate]")) node.noValidate = true;
  node.querySelectorAll?.("form[data-validate]").forEach((f) => {
    f.noValidate = true;
  });
};
mount(document);
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => mount(document));
new MutationObserver((records) => {
  for (const r of records) r.addedNodes.forEach(mount);
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("focusout", (e) => {
  if (!formOf(e)) return;
  touched.add(e.target);
  check(e.target);
});

// Once a field has been checked, fix it as the user types.
document.addEventListener("input", (e) => {
  if (formOf(e) && touched.has(e.target)) check(e.target);
});
document.addEventListener("change", (e) => {
  if (formOf(e)) {
    touched.add(e.target);
    check(e.target);
  }
});

document.addEventListener("submit", (e) => {
  const form = e.target.closest?.("form[data-validate]");
  if (!form) return;
  const bad = fieldsOf(form).filter((f) => {
    touched.add(f);
    return !check(f);
  });
  if (!bad.length) return;
  e.preventDefault();
  // Stop it here: a framework's onsubmit (React, Vue, Svelte) sits on the form or
  // its root and would otherwise run for a form that failed the check.
  e.stopPropagation();
  bad[0].focus();
}, true); // capture: before any handler on the form

document.addEventListener("reset", (e) => {
  if (e.target.matches?.("form[data-validate]")) clear(e.target);
});

(window.tsunami ??= {}).validate = { check, clear };
