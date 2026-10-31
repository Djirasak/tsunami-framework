// Copy button: a button that copies text on click.
// <button class="btn" data-copy="text"> or data-copy-target="#id" (copies the
// value of an input or textarea, else the textContent of that element).
// For 1.5 s the button has data-copied; children with data-idle hide and
// children with data-done show (icon or label swap, see copy.scss).
// data-copy-toast="Copied" also shows a toast (needs toast.js). A polite
// live region announces "Copied" either way.
// API: window.tsunami.copy(text) returns a Promise<boolean>.
// Event (bubbles from the button): tsunami:copy, detail { text }.
const RESET = 1500;
const timers = new WeakMap();
let region;

function announce(msg) {
  if (!region || !region.isConnected) {
    region = document.createElement("span");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.style.cssText =
      "position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
    document.body.append(region);
  }
  region.textContent = "";
  setTimeout(() => (region.textContent = msg), 50);
}

// Fallback for pages without navigator.clipboard (not a secure context).
function legacy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(ta);
  const prev = document.activeElement;
  ta.select();
  let ok;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  prev?.focus?.();
  return ok;
}

async function copy(text) {
  text = String(text ?? "");
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied: try the old way.
    }
  }
  return legacy(text);
}

function source(btn) {
  if (btn.dataset.copy !== undefined) return btn.dataset.copy;
  const el = document.querySelector(btn.dataset.copyTarget || "");
  if (!el) return null;
  return "value" in el ? el.value : el.textContent.trim();
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest?.("[data-copy], [data-copy-target]");
  if (!btn || btn.disabled) return;
  const text = source(btn);
  if (text === null) return;
  if (!(await copy(text))) return;
  btn.setAttribute("data-copied", "");
  clearTimeout(timers.get(btn));
  timers.set(
    btn,
    setTimeout(() => btn.removeAttribute("data-copied"), RESET),
  );
  announce("Copied");
  const label = btn.dataset.copyToast;
  if (label !== undefined) window.tsunami?.toast?.(label || "Copied");
  btn.dispatchEvent(
    new CustomEvent("tsunami:copy", { bubbles: true, detail: { text } }),
  );
});

(window.tsunami ??= {}).copy = copy;
