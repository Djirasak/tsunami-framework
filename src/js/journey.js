// Journey: a click picks a page in its step (aria-pressed) and clears the later steps;
// arrows move focus; an SVG under the steps joins the picked page of each step to the next.
const PAGE = ".journey > ol > li button";
const NS = "http://www.w3.org/2000/svg";

const stepsOf = (journey) => [...journey.querySelectorAll(":scope > ol > li")];
const pagesIn = (root) =>
  [...root.querySelectorAll("button")].filter((b) => b.checkVisibility());
const pickedIn = (step) => step?.querySelector('button[aria-pressed="true"]');
const isVertical = (journey) => journey.dataset.orientation === "vertical";
const isRtl = (journey) => getComputedStyle(journey).direction === "rtl";

function pick(button) {
  const journey = button.closest(".journey");
  const steps = stepsOf(journey);
  const index = steps.indexOf(button.closest(".journey > ol > li"));
  for (const step of steps.slice(index)) {
    for (const b of step.querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b === button));
    }
  }
  const value =
    button.value || (button.querySelector("span") ?? button).textContent.trim();
  button.dispatchEvent(
    new CustomEvent("tsunami:pick", {
      bubbles: true,
      detail: { step: index, value },
    }),
  );
  draw(journey);
}

function draw(journey) {
  let svg = journey.querySelector(":scope > svg");
  if (!svg) {
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.append(document.createElementNS(NS, "path"));
    journey.prepend(svg);
  }
  const box = journey.getBoundingClientRect();
  const ox = journey.scrollLeft - box.left - journey.clientLeft;
  const oy = journey.scrollTop - box.top - journey.clientTop;
  // The picked page's row: a page with outcomes is met at its row.
  const rows = stepsOf(journey).map((step) => {
    const b = pickedIn(step);
    if (!b?.checkVisibility()) return null;
    const r = (b.closest("[data-outcomes]") ?? b).getBoundingClientRect();
    return {
      left: r.left + ox,
      right: r.right + ox,
      top: r.top + oy,
      bottom: r.bottom + oy,
      mid: r.top + oy + r.height / 2,
    };
  });
  const vertical = isVertical(journey);
  const rtl = isRtl(journey);
  let d = "";
  for (let i = 0; i + 1 < rows.length; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (!a || !b) continue;
    if (vertical) {
      // Down from the picked row, then into the next one.
      const x = rtl ? a.right - 12 : a.left + 12;
      const x2 = rtl ? b.right : b.left;
      const sign = x2 >= x ? 1 : -1;
      const r = Math.min(6, Math.abs(x2 - x), Math.max(b.mid - a.bottom, 0));
      d += `M${x} ${a.bottom}V${b.mid - r}Q${x} ${b.mid} ${x + sign * r} ${b.mid}H${x2}`;
    } else {
      const x1 = rtl ? a.left : a.right;
      const x2 = rtl ? b.right : b.left;
      const xm = (x1 + x2) / 2;
      d += `M${x1} ${a.mid}C${xm} ${a.mid} ${xm} ${b.mid} ${x2} ${b.mid}`;
    }
  }
  svg.setAttribute("width", journey.scrollWidth);
  svg.setAttribute("height", journey.scrollHeight);
  svg.firstElementChild.setAttribute("d", d);
}

// Redraw at most once a frame, when a journey's size, picks or steps change.
const queued = new Set();
let frame = 0;
const seen = new WeakSet();
const resize = new ResizeObserver((entries) => {
  for (const e of entries) schedule(e.target.closest(".journey"));
});

function schedule(journey) {
  if (!journey) return;
  if (!seen.has(journey)) {
    seen.add(journey);
    resize.observe(journey);
    const ol = journey.querySelector(":scope > ol");
    if (ol) resize.observe(ol);
  }
  queued.add(journey);
  frame ||= requestAnimationFrame(() => {
    frame = 0;
    for (const j of queued) if (j.isConnected) draw(j);
    queued.clear();
  });
}

const drawAll = () => document.querySelectorAll(".journey").forEach(schedule);

new MutationObserver((records) => {
  for (const r of records) {
    const nodes = [...r.addedNodes, ...r.removedNodes];
    if (nodes.length && nodes.every((n) => n.nodeName === "svg")) continue;
    const journey = r.target.closest?.(".journey");
    if (journey) schedule(journey);
    else if (
      nodes.some(
        (n) => n.querySelector?.(".journey") || n.matches?.(".journey"),
      )
    )
      drawAll();
  }
}).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: [
    "aria-pressed",
    "data-view",
    "data-orientation",
    "hidden",
    "dir",
  ],
});
drawAll();
document.fonts?.ready.then(drawAll);

document.addEventListener("click", (e) => {
  const button = e.target.closest(PAGE);
  if (button) pick(button);
});

document.addEventListener("keydown", (e) => {
  const button = e.target.closest?.(PAGE);
  if (!button) return;
  const journey = button.closest(".journey");
  const step = button.closest(".journey > ol > li");
  const vertical = isVertical(journey);
  let to;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const pages = pagesIn(
      vertical ? journey.querySelector(":scope > ol") : step,
    );
    to = pages[pages.indexOf(button) + (e.key === "ArrowDown" ? 1 : -1)];
  } else if (!vertical && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    const forward = (e.key === "ArrowRight") !== isRtl(journey);
    const steps = stepsOf(journey);
    const next = steps[steps.indexOf(step) + (forward ? 1 : -1)];
    to = next && (pickedIn(next) ?? pagesIn(next)[0]);
    if (to && !to.checkVisibility()) to = pagesIn(next)[0];
  } else return;
  e.preventDefault();
  to?.focus();
});

(window.tsunami ??= {}).journey = { pick, draw };
