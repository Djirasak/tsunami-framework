// Table: sortable columns and selectable rows on .table.
// Sort: a <button> inside th[aria-sort]; click cycles ascending / descending and sorts
// the tbody rows by that column (number, date or text; th[data-sort-type] forces one,
// td[data-sort-value] overrides a cell's text). Fires cancelable tsunami:sort first.
// Select: a checkbox in the first cell of each row; the one in thead selects all.
// Rows get aria-selected, the header box goes indeterminate. Fires tsunami:select.

const SORT_BUTTON = ".table th[aria-sort] > button";
const ROW_BOX = '.table tbody tr > td:first-child > input[type="checkbox"]';
const ALL_BOX = '.table thead tr > th:first-child > input[type="checkbox"]';

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
    const rows = [...body.rows];
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

const rowBoxes = (table) =>
  [...table.tBodies].flatMap((b) =>
    [...b.rows]
      .map((r) => r.cells[0]?.querySelector(':scope > input[type="checkbox"]'))
      .filter(Boolean),
  );

function selected(table) {
  return rowBoxes(table)
    .filter((box) => box.checked)
    .map((box) => box.closest("tr"));
}

// Bring row aria-selected and the select-all box in line with the row boxes.
function sync(table) {
  const boxes = rowBoxes(table);
  for (const box of boxes)
    box.closest("tr").setAttribute("aria-selected", String(box.checked));
  const all = table.querySelector(ALL_BOX.replace(".table ", ":scope > "));
  if (all) {
    const n = boxes.filter((b) => b.checked).length;
    all.checked = n > 0 && n === boxes.length;
    all.indeterminate = n > 0 && n < boxes.length;
  }
}

function select(table, rows, checked = true) {
  for (const row of rows) {
    const box = row.cells[0]?.querySelector(':scope > input[type="checkbox"]');
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
  if (all) for (const b of rowBoxes(table)) b.checked = all.checked;
  sync(table);
  announce(table);
});

// Pick up rows that start checked (server-rendered selection).
const syncAll = () => {
  for (const table of document.querySelectorAll(".table")) {
    if (table.querySelector(ROW_BOX.replace(".table ", ""))) sync(table);
  }
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", syncAll);
else syncAll();

(window.tsunami ??= {}).table = { sort, select, selected, sync };
