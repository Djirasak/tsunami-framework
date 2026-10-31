// Types for filter-bar, chart, select, bulk-bar, date-picker, otp, validate,
// table, journey and code-editor. Global script: merges into Tsunami and
// TsunamiEventMap.

interface Tsunami {
  /** Filter bar: chips with remove buttons and a "Clear all" button. */
  filterBar: TsunamiFilterBar;
  /** Chart: a canvas becomes a Chart.js chart (Chart.js is loaded separately). */
  chart: TsunamiChart;
  /** Select: a combobox and listbox popover around a native select. */
  select: TsunamiSelect;
  /** Bulk bar: shows the count of selected table rows. */
  bulkBar: TsunamiBulkBar;
  /** Date picker: a Vanilla Calendar Pro calendar on a field or button. */
  datePicker: TsunamiDatePicker;
  /** One-time code: one input per character. */
  otp: TsunamiOtp;
  /** Validate: shows the browser's own validation under the field. */
  validate: TsunamiValidate;
  /** Table: sortable columns, selectable rows, paging, filters and column toggles. */
  table: TsunamiTable;
  /** Journey: pick a page in each step, with a path drawn between steps. */
  journey: TsunamiJourney;
  /** Code editor: a Monaco Editor in place of textareas (Monaco is loaded separately). */
  codeEditor: TsunamiCodeEditor;
}

// ---- filter-bar ----

interface TsunamiFilterBar {
  /** Starts every .filter-bar in root (default document): hides the clear button when there are no chips. */
  mount(root?: ParentNode): void;
  /** The data-value (or trimmed text) of every chip left in the bar. */
  values(bar: HTMLElement): string[];
  /** Removes every chip and fires tsunami:filterchange once. */
  clear(bar: HTMLElement): void;
}

// ---- chart ----

/** Minimal shape of a Chart.js instance (third party, not imported). */
interface TsunamiChartInstance {
  destroy(): void;
  update(mode?: string): void;
  [key: string]: any;
}

interface TsunamiChartSeries {
  /** Name in the legend and tooltip (default: the key). */
  label?: string;
  /** Any CSS colour or var(--token) (default: the palette). */
  color?: string;
  /** Draws this series as another chart type. */
  type?: TsunamiChartType;
  /** A scale id such as "y1" puts the series on a second axis. */
  axis?: string;
  /** Fills a flat translucent area under a line. */
  surface?: boolean;
  /** Lists the series last in the tooltip, under a line. */
  total?: boolean;
  /** Any Chart.js dataset option. */
  dataset?: Record<string, any>;
}

type TsunamiChartType = "bar" | "line" | "pie" | "doughnut" | "polarArea" | "radar";

interface TsunamiChartOptions {
  /** Chart type (default "bar"). */
  type?: TsunamiChartType;
  /** The row field that names a row (default "label"). */
  labelKey?: string;
  /** One object per point or slice; a slice row may carry its own `color`. */
  data?: Array<Record<string, any>>;
  /** Series by row field; with none, every field but the label and colour is drawn. */
  series?: Record<string, TsunamiChartSeries>;
  /** Show the legend under the chart (default false). */
  legend?: boolean;
  /** Legend alignment (default "center"). */
  legendAlign?: "start" | "center" | "end";
  /** Show the tooltip at the pointer (default true). */
  tooltip?: boolean;
  /** Any Chart.js options, merged over the defaults at any depth. */
  options?: Record<string, any>;
}

interface TsunamiChart {
  /** Draws a chart on a canvas (selector or element); calling again redraws. Throws without Chart.js or a canvas. */
  (target: string | HTMLCanvasElement, options?: TsunamiChartOptions): TsunamiChartInstance;
  /** The Chart.js instance of a canvas, or null. */
  get(el: HTMLCanvasElement): TsunamiChartInstance | null;
  /** Destroys the chart of a canvas. */
  destroy(el: HTMLCanvasElement): void;
}

// ---- select ----

interface TsunamiSelectOption {
  value: string;
  label: string;
}

interface TsunamiSelect {
  /** Opens the listbox of a .select (any element inside the wrapper). No-op when disabled or already open. */
  open(el: HTMLElement): void;
  /** Closes the listbox; focus returns to the control when `focus` is truthy. */
  close(el: HTMLElement, focus?: boolean): void;
  /** Reads the value (an array for a multiple select). */
  value(el: HTMLElement): string | string[];
  /** Sets the value (selects the options whose value matches); fires tsunami:select:change when it changed. */
  value(el: HTMLElement, value: string | number | Array<string | number>): void;
  /** Builds the control if needed and repaints it from the native select. */
  refresh(el: HTMLElement): void;
}

// ---- bulk-bar ----

interface TsunamiBulkBar {
  /** Counts the selected rows of the bar's table and updates data-active and [data-bulk-count]. */
  update(bar: HTMLElement): void;
  /** Unselects every row of the bar's table. */
  clear(bar: HTMLElement): void;
}

// ---- date-picker ----

/** Minimal shape of a Vanilla Calendar Pro Calendar (third party, not imported). */
interface TsunamiCalendarInstance {
  destroy(): void;
  [key: string]: any;
}

/** Members added to a mounted .date-picker element. */
interface TsunamiDatePickerElement extends HTMLElement {
  /** "YYYY-MM-DD", or "start to end" for a range; "" clears. */
  value: string;
  open(): void;
  close(): void;
  /** The library's Calendar (read only). */
  readonly calendar: TsunamiCalendarInstance;
}

/** Any Vanilla Calendar Pro option, such as firstWeekday or disableWeekdays. */
interface TsunamiDatePickerOptions {
  [option: string]: any;
}

/** detail of the bubbling `change` event fired from .date-picker (plain event name, not a tsunami: one). */
interface TsunamiDatePickerChangeDetail {
  value: string;
  /** Chosen dates as YYYY-MM-DD, sorted. */
  dates: string[];
}

interface TsunamiDatePicker {
  /** Mounts (or remounts) a .date-picker. Throws without Vanilla Calendar Pro or the required markup. */
  mount(el: HTMLElement, options?: TsunamiDatePickerOptions): void;
  /** The Vanilla Calendar instance, or null when not mounted. */
  get(el: HTMLElement): TsunamiCalendarInstance | null;
  /** Removes the calendar and the added members. */
  destroy(el: HTMLElement): void;
}

// ---- otp ----

interface TsunamiOtp {
  /** Starts every .otp in root (default document): makes boxes and the hidden input when missing. */
  mount(root?: ParentNode): void;
  /** The joined value of the boxes. */
  value(el: HTMLElement): string;
  /** Empties the boxes and spreads text over them; fires tsunami:otpcomplete when every box is filled. */
  set(el: HTMLElement, text: string): void;
  /** Empties the boxes and focuses the first. */
  clear(el: HTMLElement): void;
}

// ---- validate ----

interface TsunamiValidate {
  /** Checks a form (all fields) or one field and shows its error; returns true when valid. */
  check(target: HTMLFormElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean;
  /** Resets the error state of a form or one field. */
  clear(target: HTMLFormElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void;
}

// ---- table ----

type TsunamiSortDirection = "ascending" | "descending";

interface TsunamiTable {
  /** Sorts by a column of the first thead row; returns false when tsunami:sort was cancelled. Direction defaults to "ascending". */
  sort(table: HTMLTableElement, columnIndex: number, direction?: TsunamiSortDirection): boolean;
  /** Checks or unchecks the boxes of the given rows (checked defaults to true) and fires tsunami:select. */
  select(table: HTMLTableElement, rows: HTMLTableRowElement[], checked?: boolean): void;
  /** The checked rows. */
  selected(table: HTMLTableElement): HTMLTableRowElement[];
  /** Syncs aria-selected and the header box from the row boxes. */
  sync(table: HTMLTableElement): void;
  /** Re-reads the rows after you add, remove or change them. */
  refresh(table: HTMLTableElement): void;
  /** Goes to a page (1-based). */
  page(table: HTMLTableElement, n: number): void;
  /** Filters rows by text (case-insensitive, any cell) and goes to page 1; text defaults to "". */
  filter(table: HTMLTableElement, text?: string): void;
}

// ---- journey ----

interface TsunamiJourney {
  /** Picks a page button: sets aria-pressed in its step and later steps, fires tsunami:pick, redraws. */
  pick(button: HTMLButtonElement): void;
  /** Redraws the SVG path joining the picked pages. */
  draw(journey: HTMLElement): void;
}

// ---- code-editor ----

/** Minimal shape of a Monaco standalone editor (third party, not imported). */
interface TsunamiMonacoEditor {
  focus(): void;
  dispose(): void;
  [key: string]: any;
}

/** Members added to a .code-editor element. */
interface TsunamiCodeEditorElement extends HTMLElement {
  /** The Monaco instance, null until it has started. */
  readonly editor: TsunamiMonacoEditor | null;
}

/** Any Monaco editor option, over the defaults. */
interface TsunamiCodeEditorOptions {
  [option: string]: any;
}

interface TsunamiCodeEditor {
  /** Mounts (or remounts) a .code-editor. Throws when the Monaco loader is missing. */
  mount(el: HTMLElement, options?: TsunamiCodeEditorOptions): void;
  /** The Monaco instance, or null until it has started. */
  get(el: HTMLElement): TsunamiMonacoEditor | null;
  /** Disposes the editor and restores the textareas. */
  destroy(el: HTMLElement): void;
}

// ---- events ----

interface TsunamiEventMap {
  /** Bubbles, not cancelable. Fired on the .filter-bar after a chip or all chips are removed; values are the data-values left. */
  "tsunami:filterchange": CustomEvent<{ values: string[] }>;
  /** Bubbles, cancelable (preventDefault keeps the chip). Fired on the chip; value is its data-value (or text). */
  "tsunami:chipremove": CustomEvent<{ value: string; label: string }>;
  /** Bubbles, not cancelable. Fired on the canvas once a chart is drawn. */
  "tsunami:chartready": CustomEvent<{ chart: TsunamiChartInstance }>;
  /** Bubbles, not cancelable. Fired on the .select wrapper when its listbox opens (no detail). */
  "tsunami:select:open": CustomEvent<undefined>;
  /** Bubbles, not cancelable. Fired on the .select wrapper when its listbox closes (no detail). */
  "tsunami:select:close": CustomEvent<undefined>;
  /** Bubbles, not cancelable. Fired on the .select wrapper when the chosen options change. */
  "tsunami:select:change": CustomEvent<{
    value: string | string[];
    selected: TsunamiSelectOption[];
  }>;
  /** Bubbles, not cancelable. Fired on .otp when every box is filled. */
  "tsunami:otpcomplete": CustomEvent<{ value: string }>;
  /** Bubbles, cancelable (preventDefault stops the sort). Fired on the table before sorting; header is the th (undefined when none). */
  "tsunami:sort": CustomEvent<{
    column: number;
    direction: TsunamiSortDirection;
    header: HTMLTableCellElement | undefined;
  }>;
  /** Bubbles, not cancelable. Fired on the table when row selection changes; rows are the checked rows. */
  "tsunami:select": CustomEvent<{ rows: HTMLTableRowElement[]; count: number }>;
  /** Bubbles, not cancelable. Fired on the table after paging, sorting, filtering or column changes. */
  "tsunami:tablechange": CustomEvent<{
    page: number;
    pageSize: number;
    /** Rows in the table. */
    total: number;
    /** Rows matching the filters. */
    filtered: number;
    /** Current sort, or null. */
    sort: { column: number; direction: TsunamiSortDirection } | null;
    /** Hidden column indexes, ascending. */
    hidden: number[];
  }>;
  /** Bubbles, not cancelable. Fired on the picked page button; step is the 0-based step index. */
  "tsunami:pick": CustomEvent<{ step: number; value: string }>;
  /** Bubbles, not cancelable. Fired on the .code-editor once Monaco has started. */
  "tsunami:codeeditorready": CustomEvent<{ editor: TsunamiMonacoEditor }>;
}
