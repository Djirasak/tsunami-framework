// Chart: a <canvas> becomes a Chart.js chart. Chart.js is not in tsunami.js:
// load dist/chart.min.js with its own <script> first. Each chart is a
// <canvas id aria-label> (name it for screen readers) inside a .chart box,
// drawn by one call: window.tsunami.chart(selector | element, options).
// Calling it again on the same canvas redraws it. Options:
//   type        bar (default), line, pie, doughnut, polarArea, radar
//   labelKey    the row field that names a row (default "label")
//   data        an array of rows, one object per point or slice
//   series      { key: { label, color, type, axis, surface, total, dataset } }
//               label: name in the legend and tooltip (default the key)
//               color: any CSS colour or var(--token) (default: the palette)
//               type: draws this series as another chart type
//               axis: a scale id such as "y1" puts the series on a second axis
//               surface: true fills a flat translucent area under a line
//               total: true lists the series last in the tooltip, under a line
//               dataset: any Chart.js dataset option, e.g. { borderDash: [4, 4] }
//               With no series, every field of the rows but the label and
//               colour is drawn.
//   legend      show the legend under the chart (default false)
//   legendAlign "start", "center" (default) or "end"
//   tooltip     show the tooltip at the pointer (default true)
//   options     any Chart.js options, merged over the defaults at any depth
// Pie, doughnut and polarArea take one series; each row is a slice and may
// carry its own `color`. Colours are read from the tokens when the chart is
// drawn, and every chart is drawn again on tsunami:themechange.
// The canvas gets data-chart-initialized="true" and a bubbling
// tsunami:chartready (detail { chart }). A chart is destroyed when its canvas
// leaves the page. Animation is off under prefers-reduced-motion.
// API: window.tsunami.chart(selector | el, options?) returns the Chart.js
// instance; chart.get(el) and chart.destroy(el).

const PALETTE = [
  "--accent",
  "--info-fg",
  "--ok-fg",
  "--warning-fg",
  "--danger-fg",
];
const SLICES = ["pie", "doughnut", "polarArea"];
const RADIAL = [...SLICES, "radar"];

const states = new Map();
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const token = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

function merge(base, extra) {
  for (const [key, value] of Object.entries(extra ?? {}))
    base[key] =
      isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  return base;
}

// var(--token) becomes the token's value; the canvas cannot read custom
// properties.
const resolve = (color) =>
  String(color).replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, name) => token(name));

// The same colour with an alpha. The 2D context turns any CSS colour into
// "#rrggbb" or "rgba(...)".
const ctx2d = document.createElement("canvas").getContext("2d");
function alpha(color, a) {
  ctx2d.fillStyle = "#000";
  ctx2d.fillStyle = color;
  const c = ctx2d.fillStyle;
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  return c.replace(/rgba?\(([^)]+)\)/, (_, v) => {
    const [r, g, b] = v.split(",");
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  });
}

const px = (value) =>
  value.endsWith("rem")
    ? parseFloat(value) * parseFloat(getComputedStyle(root).fontSize)
    : parseFloat(value);

// The tooltip sits at the pointer. Registered with the first chart, so a page
// without Chart.js is not affected.
let ready = false;
const setup = () => {
  if (ready) return;
  ready = true;
  window.Chart.Tooltip.positioners.pointer = (_items, point) => point;
};

// A line between the tooltip's body and its footer (the totals).
const separator = {
  id: "tsunamiSeparator",
  afterTooltipDraw(chart) {
    const tip = chart.tooltip;
    if (!tip?.opacity || !tip.footer?.length || !chart.$total) return;
    const o = tip.options;
    const { toFont, toPadding } = window.Chart.helpers;
    const font = toFont(o.footerFont);
    const pad = toPadding(o.padding);
    const footer =
      tip.footer.length * font.lineHeight +
      (tip.footer.length - 1) * o.footerSpacing;
    const y = tip.y + tip.height - pad.bottom - footer - o.footerMarginTop / 2;
    const c = chart.ctx;
    c.save();
    c.strokeStyle = o.borderColor;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(tip.x + pad.left, Math.round(y) + 0.5);
    c.lineTo(tip.x + tip.width - pad.right, Math.round(y) + 0.5);
    c.stroke();
    c.restore();
  },
};

function config(options) {
  const type = options.type ?? "bar";
  const key = options.labelKey ?? "label";
  const rows = options.data ?? [];
  const radial = RADIAL.includes(type);
  const c = Object.fromEntries(
    ["fg", "muted", "line", "surface"].map((n) => [n, token(`--${n}`)]),
  );
  const series =
    options.series ??
    Object.fromEntries(
      Object.keys(rows[0] ?? {})
        .filter((k) => k !== key && k !== "color")
        .map((k) => [k, {}]),
    );
  const colour = (spec, i) =>
    resolve(spec.color ?? token(PALETTE[i % PALETTE.length]));
  const scales = {};
  const tick = { color: c.muted, padding: 8 };

  if (type === "radar" || type === "polarArea")
    scales.r = {
      grid: { color: c.line },
      angleLines: { color: c.line },
      border: { display: false },
      ticks: { ...tick, backdropColor: "transparent" },
      pointLabels: { color: c.muted },
    };
  else if (!radial) {
    scales.x = {
      grid: { display: false },
      border: { color: c.line },
      ticks: tick,
    };
    scales.y = {
      beginAtZero: true,
      grid: { color: c.line },
      border: { display: false },
      ticks: { ...tick, maxTicksLimit: 6 },
    };
  }

  const datasets = Object.entries(series).map(([field, spec], i) => {
    const ds = {
      label: spec.label ?? field,
      data: rows.map((row) => row[field]),
      _total: !!spec.total,
    };
    if (SLICES.includes(type)) {
      ds.backgroundColor = rows.map((row, n) => colour(row, n));
      ds.borderColor = c.surface;
      ds.borderWidth = 2;
    } else {
      const own = colour(spec, i);
      const kind = spec.type ?? type;
      ds.type = spec.type;
      if (kind === "line" || kind === "radar") {
        ds.borderColor = own;
        ds.backgroundColor = spec.surface ? alpha(own, 0.15) : own;
        ds.fill = !!spec.surface;
        ds.borderWidth = 2;
        ds.tension = 0.3;
        ds.pointRadius = 0;
        ds.pointHoverRadius = 4;
        ds.pointHoverBackgroundColor = own;
        ds.pointHoverBorderColor = c.surface;
        ds.pointHoverBorderWidth = 2;
      } else {
        ds.backgroundColor = own;
        ds.hoverBackgroundColor = own;
        ds.borderRadius = px(token("--radius-sm"));
        ds.maxBarThickness = 48;
      }
    }
    if (spec.axis && spec.axis !== "y") {
      ds.yAxisID = spec.axis;
      scales[spec.axis] ??= {
        position: "right",
        grid: { drawOnChartArea: false },
        border: { display: false },
        ticks: tick,
      };
    }
    return merge(ds, spec.dataset);
  });

  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    font: { family: token("--font-sans"), size: px(token("--text-sm")) },
    color: c.muted,
    interaction:
      radial && type !== "radar"
        ? { mode: "nearest", intersect: true }
        : { mode: "index", intersect: false },
    scales,
    plugins: {
      legend: {
        display: !!options.legend,
        position: "bottom",
        align: options.legendAlign ?? "center",
        labels: {
          color: c.muted,
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          borderRadius: 2,
          padding: 16,
          // Pie, doughnut and polarArea name the slices; the generic one names
          // the datasets, so ask the chart type's own first.
          generateLabels: (chart) =>
            (
              window.Chart.overrides?.[chart.config.type]?.plugins?.legend
                ?.labels?.generateLabels ??
              window.Chart.defaults.plugins.legend.labels.generateLabels
            )(chart).map((item) => ({ ...item, lineDash: [] })),
        },
      },
      tooltip: {
        enabled: options.tooltip !== false,
        position: "pointer",
        backgroundColor: c.surface,
        borderColor: c.line,
        borderWidth: 1,
        titleColor: c.fg,
        bodyColor: c.fg,
        footerColor: c.fg,
        cornerRadius: px(token("--radius-md")),
        padding: 10,
        caretSize: 0,
        caretPadding: 12,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
        titleFont: { family: token("--font-sans"), weight: "600" },
        bodyFont: { family: token("--font-sans") },
        footerFont: { family: token("--font-sans"), weight: "600" },
        footerMarginTop: 10,
        itemSort: (a, b) => a.dataset._total - b.dataset._total,
        filter: (item) => !item.dataset._total,
        callbacks: {
          footer(items) {
            const chart = this.chart;
            if (!items.length) return [];
            return chart.data.datasets.flatMap((dataset, datasetIndex) => {
              if (!dataset._total) return [];
              const index = items[0].dataIndex;
              const controller = chart.getDatasetMeta(datasetIndex).controller;
              const info = controller.getLabelAndValue(index);
              return this.options.callbacks.label.call(this, {
                chart,
                dataset,
                datasetIndex,
                dataIndex: index,
                label: info.label,
                formattedValue: info.value,
                raw: dataset.data[index],
                parsed: controller.getParsed(index),
              });
            });
          },
        },
      },
    },
  };
  if (reduce.matches) defaults.animation = false;
  return {
    type,
    plugins: [separator],
    data: { labels: rows.map((row) => row[key]), datasets },
    options: merge(defaults, options.options),
    total: datasets.some((d) => d._total),
  };
}

function destroy(el) {
  const state = states.get(el);
  if (!state) return;
  states.delete(el);
  state.chart.destroy();
  delete el.dataset.chartInitialized;
}

function draw(el, options, quiet) {
  const old = states.get(el);
  if (old) {
    states.delete(el);
    old.chart.destroy();
  }
  const { total, ...cfg } = config(options);
  if (quiet) cfg.options.animation = false;
  const chart = new window.Chart(el, cfg);
  chart.$total = total;
  states.set(el, { chart, options });
  // The canvas does not load a font by itself; draw again when it is there.
  const family = chart.options.font.family;
  if (!document.fonts.check(`1em ${family}`))
    document.fonts
      .load(`1em ${family}`)
      .then(() => states.get(el)?.chart === chart && chart.update("none"));
  el.dataset.chartInitialized = "true";
  el.dispatchEvent(
    new CustomEvent("tsunami:chartready", { bubbles: true, detail: { chart } }),
  );
  return chart;
}

function chart(target, options = {}) {
  if (!window.Chart)
    throw new Error(
      "A chart needs Chart.js: load dist/chart.min.js with its own <script> before the Tsunami script.",
    );
  setup();
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  if (!(el instanceof HTMLCanvasElement))
    throw new Error("A chart needs a <canvas> to draw in.", { cause: target });
  return draw(el, options, false);
}

new MutationObserver((list) =>
  list.forEach((m) =>
    m.removedNodes.forEach((n) => {
      if (n.isConnected) return;
      for (const el of states.keys()) if (!el.isConnected) destroy(el);
    }),
  ),
).observe(document.documentElement, { childList: true, subtree: true });

// Colours are read from the tokens, so the charts are drawn again.
document.addEventListener("tsunami:themechange", () => {
  for (const [el, state] of [...states]) draw(el, state.options, true);
});

chart.get = (el) => states.get(el)?.chart ?? null;
chart.destroy = destroy;
(window.tsunami ??= {}).chart = chart;
