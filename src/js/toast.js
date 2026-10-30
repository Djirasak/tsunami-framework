// Toast: short messages shown in a <section class="toaster" popover="manual">
// (created if missing) that lives in the top layer, above dialogs. While a
// modal dialog is open the toaster moves into it, so its buttons stay usable.
// API: window.tsunami.toast(options | "message") returns the .toast element,
// which has .dismiss(). window.tsunami.toast.clear() removes every toast.
// Options:
//   title     bold first line (a plain string argument becomes the title)
//   text      second line
//   variant   ok | danger | warning | info | neutral (icon + colour; none = no icon)
//   duration  ms before it closes. Default 5000; 0 stays. Danger defaults to 0.
//             Hovering, focusing or hiding the page pauses the timer.
//   action    { label, onClick } button; clicking it runs onClick and closes
//   id        a toast with the same id is replaced
// At most 3 toasts show; the oldest leaves first.
// Declarative: <button data-toast="Message" data-toast-title="Saved"
// data-toast-variant="ok"> shows a toast on click.
// Position: data-position on .toaster (bottom-end, top-end, bottom-center, top-center).
// Events (bubble from the toast): tsunami:toast on show and tsunami:toastclose
// on dismiss, detail { reason: "timeout" | "close" | "action" | "api" }.
const MAX = 3;
const DURATION = 5000;
const ICONS = {
  ok: "circle-check",
  danger: "circle-alert",
  warning: "triangle-alert",
  info: "info",
  neutral: "bell",
};

const state = new WeakMap();
let toaster;

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}

const toasts = () =>
  toaster ? [...toaster.querySelectorAll(":scope > .toast")] : [];
const live = () => toasts().filter((t) => !t.hasAttribute("data-leaving"));

// Modal dialogs make everything outside them inert, so the toaster moves into
// the top-most one; showing it again puts it above that dialog in the top layer.
function place() {
  if (!toaster) return;
  const modals = document.querySelectorAll("dialog:modal");
  const host = modals[modals.length - 1] || document.body;
  if (toaster.parentNode !== host) host.append(toaster);
  if (toasts().length && !toaster.matches(":popover-open"))
    toaster.showPopover();
}

function container() {
  if (!toaster || !toaster.isConnected) {
    toaster = document.querySelector(".toaster[popover]");
    if (!toaster) {
      toaster = h("section", {
        class: "toaster",
        popover: "manual",
        "aria-live": "polite",
      });
      document.body.append(toaster);
    }
  }
  return toaster;
}

function finish(toast, reason) {
  const s = state.get(toast);
  if (!s || s.done) return;
  s.done = true;
  clearTimeout(s.timer);
  toast.setAttribute("data-leaving", "");
  toast.dispatchEvent(
    new CustomEvent("tsunami:toastclose", {
      bubbles: true,
      detail: { reason },
    }),
  );
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    toast.remove();
    if (toaster && !toasts().length && toaster.matches(":popover-open"))
      toaster.hidePopover();
  };
  toast.addEventListener("transitionend", remove, { once: true });
  setTimeout(remove, 400);
}

// Runs the timer unless the toast is hovered, focused or the page is hidden.
function schedule(toast) {
  const s = state.get(toast);
  if (!s || s.done || !s.duration) return;
  const paused = s.hover || s.focus || document.hidden;
  if (paused && s.timer) {
    clearTimeout(s.timer);
    s.timer = 0;
    s.left -= Date.now() - s.started;
  } else if (!paused && !s.timer) {
    s.started = Date.now();
    s.timer = setTimeout(() => finish(toast, "timeout"), Math.max(s.left, 0));
  }
}

function toast(input = {}) {
  const o = typeof input === "string" ? { title: input } : input;
  const variant = o.variant;
  const duration = o.duration ?? (variant === "danger" ? 0 : DURATION);
  const root = container();

  if (o.id !== undefined && o.id !== null) {
    for (const t of toasts()) {
      if (t.dataset.toastId === String(o.id)) {
        finish(t, "api");
        t.remove();
      }
    }
  }

  const el = h("div", {
    class: "toast",
    role: variant === "danger" ? "alert" : "status",
  });
  if (variant) el.dataset.variant = variant;
  if (o.id !== undefined && o.id !== null) el.dataset.toastId = o.id;
  if (variant && ICONS[variant])
    el.append(
      h("i", { class: `icon icon-${ICONS[variant]}`, "aria-hidden": "true" }),
    );

  const body = h("div");
  if (o.title) body.append(h("strong", {}, o.title));
  if (o.text) body.append(h("p", {}, o.text));
  el.append(body);

  const s = {
    duration,
    left: duration,
    started: 0,
    timer: 0,
    hover: false,
    focus: false,
    done: false,
  };
  state.set(el, s);

  if (o.action?.label) {
    const btn = h(
      "button",
      { type: "button", class: "btn", "data-size": "sm" },
      o.action.label,
    );
    btn.addEventListener("click", () => {
      o.action.onClick?.(el);
      finish(el, "action");
    });
    el.append(btn);
  }
  const close = h(
    "button",
    {
      type: "button",
      class: "btn",
      "data-variant": "ghost",
      "data-size": "icon-xs",
      "aria-label": "Close",
    },
    h("i", { class: "icon icon-x", "aria-hidden": "true" }),
  );
  close.addEventListener("click", () => finish(el, "close"));
  el.append(close);

  el.addEventListener("pointerenter", () => {
    s.hover = true;
    schedule(el);
  });
  el.addEventListener("pointerleave", () => {
    s.hover = false;
    schedule(el);
  });
  el.addEventListener("focusin", () => {
    s.focus = true;
    schedule(el);
  });
  el.addEventListener("focusout", (e) => {
    if (el.contains(e.relatedTarget)) return;
    s.focus = false;
    schedule(el);
  });
  el.dismiss = () => finish(el, "api");

  root.append(el);
  place();
  for (const t of live().slice(0, -MAX)) finish(t, "api");
  schedule(el);
  el.dispatchEvent(
    new CustomEvent("tsunami:toast", { bubbles: true, detail: {} }),
  );
  return el;
}

toast.clear = () => {
  for (const t of live()) finish(t, "api");
};

document.addEventListener("visibilitychange", () => {
  for (const t of toasts()) schedule(t);
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest?.("[data-toast]");
  if (!btn || btn.disabled) return;
  const message = btn.dataset.toast;
  const title = btn.dataset.toastTitle;
  toast({
    title: title || message,
    text: title ? message : undefined,
    variant: btn.dataset.toastVariant,
  });
});

// Follow modal dialogs as they open and close.
new MutationObserver(() => place()).observe(document, {
  subtree: true,
  attributes: true,
  attributeFilter: ["open"],
});

(window.tsunami ??= {}).toast = toast;
