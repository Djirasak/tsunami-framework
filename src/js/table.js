// Table: sortable columns and selectable rows on .table.
// Sort: a <button> inside th[aria-sort]; click cycles ascending / descending and sorts
// the tbody rows by that column (number, date or text; th[data-sort-type] forces one,
// td[data-sort-value] overrides a cell's text). Fires cancelable tsunami:sort first.
// Select: a checkbox in the first cell of each row; the one in thead selects all.
// Rows get aria-selected, the header box goes indeterminate. Fires tsunami:select.
// Pages: data-page-size="10" on the table shows that many rows at a time. A
// nav.pagination[data-pagination-for="table-id"] is filled with buttons (without a
// value it is the one in the same .card); [data-table-info] shows "1–10 of 42";
// select[data-table-page-size="table-id"] changes the size. Sorting runs on every
// row first, then the page is cut. The select-all box selects every row that
// matches the filter, not only the visible page. Rows are never re-created: the
// ones outside the page get `hidden`. Fires tsunami:tablechange on the table.
// Filters: input[data-table-search="table-id"] keeps rows whose cells contain the text
// (case-insensitive, 150 ms debounce); an input or select in a cell of
// thead tr[data-filters] filters that column (input: contains, select: equals).
// Any filter goes back to page 1. With no match, an empty row shows: a
// tr[data-table-empty] in tbody, or a template[data-table-empty] (in the table or
// with data-table-empty="table-id") whose content goes in one cell.

const SORT_BUTTON = ".table th[aria-sort] > button";
const ROW_BOX = '.table tbody tr > td:first-child > input[type="checkbox"]';
const ALL_BOX = '.table thead tr > th:first-child > input[type="checkbox"]';

const EMPTY = "[data-table-empty]";

const rowsOf = (table) =>
  [...table.tBodies].flatMap((b) =>
    [...b.rows].filter((r) => !r.matches(EMPTY)),
  );

const states = new WeakMap();
const texts = new WeakMap();

// Lower-case cell text of a row, cached until refresh().
const rowTexts = (row) => {
  let list = texts.get(row);
  if (!list) {
    list = [...row.cells].map((c) => c.textContent.trim().toLowerCase());
    texts.set(row, list);
  }
  return list;
};

const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

// Elements that belong to a table: attr="table-id", or attr with no value in the same card.
function controls(table, selector, attr) {
  const own = [...document.querySelectorAll(`${selector}[${attr}]`)];
  const card = table.closest(".card");
  return own.filter((el) => {
    const id = el.getAttribute(attr);
    return id ? id === table.id : card?.contains(el);
  });
}

const cellValue = (row, i) => {
  const cell = row.cells[i];
  if (!cell) return "";
  return (cell.dataset.sortValue ?? cell.textContent).trim();
};

const toNumber = (s) => {
  const n = s.replace(/[^\d.+-]/g, "");
  return n === "" || !/\d/.test(n) ? NaN : Number(n);
};

function detectType(values) {
  const filled = values.filter((v) => v !== "" && v !== "-");
  if (!filled.length) return "text";
  // Figures with optional currency, sign or %; no letters, no date separators.
  if (filled.every((v) => /^[^\p{L}\d/:]*\d[\d,.\s]*[^\p{L}\d/:]*$/u.test(v)))
    return "number";
  if (filled.every((v) => !Number.isNaN(Date.parse(v)))) return "date";
  return "text";
}

function compareBy(type) {
  if (type === "number" || type === "date") {
    const parse = type === "number" ? toNumber : Date.parse;
    return (a, b) => {
      const x = parse(a);
      const y = parse(b);
      // Empty or "-" cells go last.
      if (Number.isNaN(x)) return Number.isNaN(y) ? 0 : 1;
      if (Number.isNaN(y)) return -1;
      return x - y;
    };
  }
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return (a, b) => collator.compare(a, b);
}

function sort(table, columnIndex, direction = "ascending") {
  const th = table.tHead?.rows[0]?.cells[columnIndex];
  const event = new CustomEvent("tsunami:sort", {
    bubbles: true,
    cancelable: true,
    detail: { column: columnIndex, direction, header: th },
  });
  if (!table.dispatchEvent(event)) return false;

  for (const cell of table.tHead?.rows[0]?.cells ?? []) {
    if (cell.hasAttribute("aria-sort"))
      cell.setAttribute("aria-sort", cell === th ? direction : "none");
  }
  for (const body of table.tBodies) {
    const rows = [...body.rows].filter((r) => !r.matches(EMPTY));
    const values = rows.map((r) => cellValue(r, columnIndex));
    const type = th?.dataset.sortType ?? detectType(values);
    const cmp = compareBy(type);
    const sign = direction === "descending" ? -1 : 1;
    const order = rows
      .map((row, i) => ({ row, value: values[i], i }))
      .sort((a, b) => {
        const c = cmp(a.value, b.value);
        // Keep empty cells last in both directions; stable otherwise.
        const emptyA = a.value === "" || a.value === "-";
        const emptyB = b.value === "" || b.value === "-";
        if (emptyA !== emptyB) return emptyA ? 1 : -1;
        return c * sign || a.i - b.i;
      });
    body.append(...order.map((o) => o.row));
  }
  const state = states.get(table);
  if (state) {
    state.sort = { column: columnIndex, direction };
    update(table);
  }
  return true;
}

document.addEventListener("click", (e) => {
  const button = e.target.closest(SORT_BUTTON);
  if (!button) return;
  const th = button.parentElement;
  const table = th.closest("table");
  const next =
    th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
  sort(table, th.cellIndex, next);
});

const boxOf = (row) =>
  row.cells[0]?.querySelector(':scope > input[type="checkbox"]');

const rowBoxes = (table, rows = rowsOf(table)) =>
  rows.map(boxOf).filter(Boolean);

function selected(table) {
  return rowBoxes(table)
    .filter((box) => box.checked)
    .map((box) => box.closest("tr"));
}

// Rows the select-all box acts on: the ones matching the filter, on every page.
const matching = (table) => states.get(table)?.matched ?? rowsOf(table);

// Bring row aria-selected and the select-all box in line with the row boxes.
function sync(table) {
  for (const box of rowBoxes(table))
    box.closest("tr").setAttribute("aria-selected", String(box.checked));
  const all = table.querySelector(ALL_BOX.replace(".table ", ":scope > "));
  if (all) {
    const boxes = rowBoxes(table, matching(table));
    const n = boxes.filter((b) => b.checked).length;
    all.checked = n > 0 && n === boxes.length;
    all.indeterminate = n > 0 && n < boxes.length;
  }
}

function select(table, rows, checked = true) {
  for (const row of rows) {
    const box = boxOf(row);
    if (box) box.checked = checked;
  }
  sync(table);
  announce(table);
}

function announce(table) {
  const rows = selected(table);
  table.dispatchEvent(
    new CustomEvent("tsunami:select", {
      bubbles: true,
      detail: { rows, count: rows.length },
    }),
  );
}

document.addEventListener("change", (e) => {
  const all = e.target.closest(ALL_BOX);
  const box = all ?? e.target.closest(ROW_BOX);
  if (!box) return;
  const table = box.closest("table");
  if (all)
    for (const b of rowBoxes(table, matching(table))) b.checked = all.checked;
  sync(table);
  announce(table);
});

// ---- Pages ----

const pageSizeOf = (table) => {
  const n = Number.parseInt(table.dataset.pageSize, 10);
  return n > 0 ? n : 0;
};

// Page numbers to show: first, last, the current one and its neighbours; null is a gap.
function pageList(page, pages) {
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  const list = [];
  let last = 0;
  for (let n = 1; n <= pages; n++) {
    if (!keep.has(n)) continue;
    if (n - last > 1) list.push(n - last === 2 ? n - 1 : null);
    list.push(n);
    last = n;
  }
  return list;
}

function pageButton(label, page, props = {}) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.page = String(page);
  Object.assign(button, props);
  if (typeof label === "string") button.textContent = label;
  else button.append(label);
  li.append(button);
  return li;
}

const chevron = (name) => {
  const i = document.createElement("i");
  i.className = `icon icon-${name}`;
  i.setAttribute("aria-hidden", "true");
  return i;
};

function renderPagination(table, state) {
  const { page, pages } = state;
  for (const nav of controls(table, ".pagination", "data-pagination-for")) {
    nav.hidden = pages <= 1;
    const ul = document.createElement("ul");
    const prev = pageButton(chevron("chevron-left"), page - 1, {
      disabled: page <= 1,
    });
    prev.firstChild.setAttribute("aria-label", "Previous page");
    const next = pageButton(chevron("chevron-right"), page + 1, {
      disabled: page >= pages,
    });
    next.firstChild.setAttribute("aria-label", "Next page");
    ul.append(prev);
    for (const n of pageList(page, pages)) {
      if (n === null) {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.setAttribute("aria-hidden", "true");
        span.append(chevron("ellipsis"));
        li.append(span);
        ul.append(li);
        continue;
      }
      const li = pageButton(String(n), n);
      if (n === page) li.firstChild.setAttribute("aria-current", "page");
      ul.append(li);
    }
    ul.append(next);
    nav.replaceChildren(ul);
  }
}

function renderInfo(table, state) {
  const { page, size, matched } = state;
  const total = matched.length;
  const from = total ? (size ? (page - 1) * size + 1 : 1) : 0;
  const to = size ? Math.min(page * size, total) : total;
  const text = total ? `${from}–${to} of ${total}` : "0 of 0";
  for (const el of controls(table, "[data-table-info]", "data-table-info"))
    el.textContent = text;
}

// ---- State and update ----

function stateFor(table) {
  let state = states.get(table);
  if (!state) {
    state = {
      page: 1,
      pages: 1,
      matched: [],
      sort: null,
      query: "",
      columns: new Map(),
      empty: null,
    };
    states.set(table, state);
    table.dataset.enhanced = "";
  }
  return state;
}

const colSpan = (table) =>
  [...(table.tHead?.rows[0]?.cells ?? [])].filter((c) => !c.hidden).length || 1;

// The row shown when nothing matches; made once, kept as the last row of the first tbody.
function emptyRow(table, state) {
  if (state.empty) return state.empty;
  let row = table.querySelector(`tbody > tr${EMPTY}`);
  if (!row) {
    const id = CSS.escape(table.id || "");
    const tpl =
      table.querySelector(`template${EMPTY}`) ??
      (table.id &&
        document.querySelector(`template[data-table-empty="${id}"]`));
    row = document.createElement("tr");
    row.setAttribute("data-table-empty", "");
    const cell = row.insertCell();
    if (tpl) cell.append(tpl.content.cloneNode(true));
    else cell.textContent = "No results";
    (table.tBodies[0] ?? table.createTBody()).append(row);
  }
  state.empty = row;
  return row;
}

// Work out the matching rows and show the current page of them.
function update(table, { page } = {}) {
  const state = stateFor(table);
  const rows = rowsOf(table);
  const size = pageSizeOf(table);
  const query = state.query.toLowerCase();
  const filters = [...state.columns];
  state.matched = rows.filter((row) => {
    const cells = rowTexts(row);
    if (query && !cells.some((t) => t.includes(query))) return false;
    return filters.every(([i, f]) =>
      f.exact ? cells[i] === f.value : (cells[i] ?? "").includes(f.value),
    );
  });
  const empty = emptyRow(table, state);
  empty.hidden = state.matched.length > 0;
  empty.firstElementChild?.setAttribute("colspan", String(colSpan(table)));
  state.pages = size ? Math.max(1, Math.ceil(state.matched.length / size)) : 1;
  if (page !== undefined) state.page = page;
  state.page = Math.min(Math.max(1, state.page), state.pages);
  const start = size ? (state.page - 1) * size : 0;
  const end = size ? start + size : state.matched.length;
  const shown = new Set(state.matched.slice(start, end));
  for (const row of rows) row.hidden = !shown.has(row);
  state.size = size;
  renderPagination(table, state);
  renderInfo(table, state);
  for (const select of controls(table, "select", "data-table-page-size"))
    if (size && select.value !== String(size)) select.value = String(size);
  sync(table);
  table.dispatchEvent(
    new CustomEvent("tsunami:tablechange", {
      bubbles: true,
      detail: {
        page: state.page,
        pageSize: size,
        total: rows.length,
        filtered: state.matched.length,
        sort: state.sort,
        hidden: [],
      },
    }),
  );
}

// Show only rows containing the text (the global search); "" clears it.
function filter(table, text = "") {
  const state = stateFor(table);
  state.query = String(text).trim();
  if (table.id)
    for (const input of document.querySelectorAll(
      `[data-table-search="${CSS.escape(table.id)}"]`,
    ))
      if (input.value !== text) input.value = text;
  update(table, { page: 1 });
}

function setPage(table, n) {
  update(table, { page: Number(n) });
}

// Re-read the rows after you add, remove or change them.
function refresh(table) {
  for (const row of rowsOf(table)) texts.delete(row);
  update(table);
}

// A column filter in thead tr[data-filters] changed.
function columnFilter(field) {
  const cell = field.closest("tr[data-filters] > *");
  const table = cell?.closest("table");
  if (!table) return;
  const state = stateFor(table);
  const value = field.value.trim().toLowerCase();
  if (value)
    state.columns.set(cell.cellIndex, {
      value,
      exact: field.tagName === "SELECT",
    });
  else state.columns.delete(cell.cellIndex);
  update(table, { page: 1 });
}

const searchLater = debounce((input) => {
  const table = document.getElementById(input.dataset.tableSearch);
  if (table) filter(table, input.value);
}, 150);
const columnLater = debounce(columnFilter, 150);

document.addEventListener("input", (e) => {
  if (e.target.matches?.("input[data-table-search]")) searchLater(e.target);
  else if (e.target.matches?.("tr[data-filters] input")) columnLater(e.target);
});

document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-page]");
  const nav = button?.closest(".pagination[data-pagination-for]");
  if (!nav || button.disabled) return;
  const id = nav.getAttribute("data-pagination-for");
  const table = id
    ? document.getElementById(id)
    : nav.closest(".card")?.querySelector(".table");
  if (table) setPage(table, button.dataset.page);
});

document.addEventListener("change", (e) => {
  if (e.target.matches?.("tr[data-filters] select")) columnFilter(e.target);
  const select = e.target.closest("select[data-table-page-size]");
  if (!select) return;
  const id = select.getAttribute("data-table-page-size");
  const table = id
    ? document.getElementById(id)
    : select.closest(".card")?.querySelector(".table");
  if (!table) return;
  table.dataset.pageSize = select.value;
  update(table, { page: 1 });
});

const wanted = (table) =>
  table.hasAttribute("data-page-size") ||
  table.querySelector("thead > tr[data-filters]") ||
  (table.id &&
    document.querySelector(
      ["pagination-for", "table-page-size", "table-search"]
        .map((a) => `[data-${a}="${CSS.escape(table.id)}"]`)
        .join(","),
    ));

// Pick up rows that start checked (server-rendered selection) and set up paged tables.
const init = () => {
  for (const table of document.querySelectorAll(".table")) {
    if (wanted(table)) update(table);
    else if (table.querySelector(ROW_BOX.replace(".table ", ""))) sync(table);
  }
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init);
else init();

(window.tsunami ??= {}).table = {
  sort,
  select,
  selected,
  sync,
  refresh,
  page: setPage,
  filter,
};
