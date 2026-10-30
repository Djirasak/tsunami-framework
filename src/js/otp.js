// One-time code: .otp holds one input per character. Typing moves to the next
// box, Backspace on an empty box goes back, the arrows, Home and End move, and
// a paste (or an SMS autofill, which lands in one box) is spread over the
// boxes. A hidden input named by data-name keeps the joined value for a form.
// data-length sets the count (default 6) when the boxes are not in the markup;
// data-type="text" accepts letters too (default: digits). Fires
// tsunami:otpcomplete ({ value }) on .otp when every box is filled. Reset
// empties the boxes.
const OTP = ".otp";

const keep = (el, text) =>
  el.dataset.type === "text"
    ? text.replace(/[^a-z0-9]/gi, "")
    : text.replace(/\D/g, "");

const boxes = (el) => [...el.querySelectorAll('input[type="text"]')];

function sync(el) {
  const value = boxes(el)
    .map((b) => b.value)
    .join("");
  const hidden = el.querySelector('input[type="hidden"]');
  if (hidden) hidden.value = value;
  return value;
}

function spread(el, from, text) {
  const all = boxes(el);
  const chars = [...keep(el, text)];
  chars.slice(0, all.length - from).forEach((c, i) => {
    all[from + i].value = c;
  });
  const end = Math.min(from + chars.length, all.length - 1);
  all[end].focus();
  all[end].select();
  const value = sync(el);
  if (value.length === all.length)
    el.dispatchEvent(
      new CustomEvent("tsunami:otpcomplete", { bubbles: true, detail: { value } }),
    );
}

function mount(root = document) {
  for (const el of root.querySelectorAll(OTP)) {
    if (el.dataset.mounted) continue;
    el.dataset.mounted = "";
    if (!boxes(el).length) {
      const count = Number(el.dataset.length) || 6;
      const mode = el.dataset.type === "text" ? "text" : "numeric";
      for (let i = 1; i <= count; i++) {
        const box = document.createElement("input");
        box.type = "text";
        box.inputMode = mode;
        box.autocomplete = i === 1 ? "one-time-code" : "off";
        box.setAttribute("aria-label", `Character ${i} of ${count}`);
        if ("disabled" in el.dataset) box.disabled = true;
        el.append(box);
      }
    }
    if (el.dataset.name && !el.querySelector('input[type="hidden"]')) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = el.dataset.name;
      el.append(hidden);
    }
    sync(el);
  }
}

const box = (e) => e.target.closest?.(`${OTP} > input[type="text"]`);

document.addEventListener("input", (e) => {
  const b = box(e);
  if (!b) return;
  const el = b.closest(OTP);
  const at = boxes(el).indexOf(b);
  // Typing into a filled box brings in just the new character.
  const text = e.inputType === "insertText" && e.data ? e.data : b.value;
  b.value = "";
  if (keep(el, text)) spread(el, at, text);
  else sync(el);
});

document.addEventListener("paste", (e) => {
  const b = box(e);
  if (!b) return;
  e.preventDefault();
  const el = b.closest(OTP);
  const text = e.clipboardData.getData("text");
  const all = boxes(el);
  // A whole code replaces what is there; anything shorter goes in from here.
  const whole = keep(el, text).length >= all.length;
  if (whole) for (const x of all) x.value = "";
  spread(el, whole ? 0 : all.indexOf(b), text);
});

document.addEventListener("keydown", (e) => {
  const b = box(e);
  if (!b || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = b.closest(OTP);
  const all = boxes(el);
  const at = all.indexOf(b);
  const go = (i) => {
    e.preventDefault();
    all[Math.max(0, Math.min(all.length - 1, i))].focus();
  };
  if (e.key === "Backspace") {
    if (b.value) {
      b.value = "";
      sync(el);
      e.preventDefault();
    } else if (at > 0) {
      all[at - 1].value = "";
      sync(el);
      go(at - 1);
    }
  } else if (e.key === "ArrowLeft") go(at - 1);
  else if (e.key === "ArrowRight") go(at + 1);
  else if (e.key === "Home") go(0);
  else if (e.key === "End") go(all.length - 1);
});

document.addEventListener("focusin", (e) => {
  const b = box(e);
  if (b) b.select();
});

// The reset event fires before fields are restored.
document.addEventListener("reset", (e) =>
  setTimeout(() => {
    for (const el of e.target.querySelectorAll(OTP)) {
      for (const b of boxes(el)) b.value = "";
      sync(el);
    }
  }),
);

mount();

(window.tsunami ??= {}).otp = {
  mount,
  value: (el) => sync(el),
  set(el, text) {
    for (const b of boxes(el)) b.value = "";
    spread(el, 0, text);
  },
  clear(el) {
    for (const b of boxes(el)) b.value = "";
    sync(el);
    boxes(el)[0]?.focus();
  },
};
