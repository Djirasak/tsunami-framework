// Types for window.tsunami and the tsunami:* events. Each part below adds its
// modules to the Tsunami interface and its events to TsunamiEventMap.

interface Window {
  tsunami: Tsunami;
}

// The tsunami:* custom events, so addEventListener("tsunami:toastclose", e => e.detail.reason) is typed.
interface HTMLElementEventMap extends TsunamiEventMap {}
interface DocumentEventMap extends TsunamiEventMap {}

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

// Types for: autocomplete, sidebar, stepper, tabs, editor, tagInput, saveBar, jsonViewer, theme, tree.

interface Tsunami {
  /** Suggestion lists under a text input (datalist, data-url or a source function). */
  autocomplete: TsunamiAutocomplete;
  /** Collapse to icons with data-collapsed, and keep scroll position. */
  sidebar: TsunamiSidebar;
  /** Multi-step flow: one panel at a time, optional validation. */
  stepper: TsunamiStepper;
  /** Tabs with roving focus and closable tabs. */
  tabs: TsunamiTabs;
  /** textarea.editor as a TinyMCE rich text editor. */
  editor: TsunamiEditor;
  /** Chips plus a text input; the value is a list of tags. */
  tagInput: TsunamiTagInput;
  /** Bar that shows while a form differs from its saved values. */
  saveBar: TsunamiSaveBar;
  /** Read-only JSON tree over a textarea. */
  jsonViewer: TsunamiJsonViewer;
  /** Light, dark or system theme on the html element. */
  theme: TsunamiTheme;
  /** Filter for a file tree. */
  tree: TsunamiTree;
}

/** One suggestion as the autocomplete normalizes it. */
interface TsunamiAutocompleteItem {
  value: string;
  label: string;
  /** Secondary text; empty string when none. */
  text: string;
}

/** What a source function or data-url may return per entry: a string or an object. */
type TsunamiAutocompleteSourceEntry =
  | string
  | { value?: unknown; label?: unknown; text?: unknown };

/** Called with the trimmed query; may be async. A null or undefined result means no items. */
type TsunamiAutocompleteSource = (
  query: string,
  options: { signal: AbortSignal },
) =>
  | TsunamiAutocompleteSourceEntry[]
  | null
  | undefined
  | Promise<TsunamiAutocompleteSourceEntry[] | null | undefined>;

interface TsunamiAutocompleteOptions {
  /** Replaces the datalist and data-url as the suggestion source. */
  source?: TsunamiAutocompleteSource;
}

interface TsunamiAutocomplete {
  /** Sets up (or sets up again) a .autocomplete wrapper, optionally with a source function. */
  mount(root: HTMLElement, options?: TsunamiAutocompleteOptions): void;
  /** Removes the listbox and restores the input; the wrapper is not enhanced again afterwards. */
  destroy(root: HTMLElement): void;
}

interface TsunamiSidebar {
  /** Collapses the sidebar to icons (data-collapsed="true"). */
  collapse(sidebar: HTMLElement): void;
  /** Expands the sidebar (data-collapsed="false"). */
  expand(sidebar: HTMLElement): void;
  /** Flips the collapsed state. */
  toggle(sidebar: HTMLElement): void;
  /** Syncs aria-expanded on controls and starts scroll memory for .sidebar elements under root (default document). */
  mount(root?: ParentNode): void;
}

/** A stepper element, or a selector for one (the closest .stepper of the match is used). */
type TsunamiStepperTarget = Element | string;

interface TsunamiStepper {
  /** Moves to a step (0-based); forward moves validate first. False when blocked, out of range or not a stepper. */
  go(el: TsunamiStepperTarget, index: number, focus?: boolean): boolean;
  /** Moves to the next step, or fires tsunami:stepcomplete on the last one. False when validation blocks it. */
  next(el: TsunamiStepperTarget, focus?: boolean): boolean;
  /** Moves to the previous step. False when already on the first or not a stepper. */
  prev(el: TsunamiStepperTarget, focus?: boolean): boolean;
  /** Index of the current step, or -1 when el is not in a stepper. */
  index(el: TsunamiStepperTarget): number;
}

interface TsunamiTabs {
  /** Selects an enabled tab and shows its panel. No-op for a null or disabled tab. */
  select(tab: HTMLElement | null | undefined): void;
  /** Closes a tab after a cancelable tsunami:closetab; returns the tab that takes its place (or null), or false when a listener cancelled it. */
  close(tab: HTMLElement): HTMLElement | null | false;
}

/**
 * Minimal view of a TinyMCE editor instance (TinyMCE is third-party and loaded separately).
 * Only members the framework uses are listed; anything else is available as any.
 */
interface TsunamiTinyMCEEditor {
  getContent(args?: object): string;
  setContent(html: string, args?: object): void;
  save(): void;
  focus(): void;
  remove(): void;
  setDirty(state: boolean): void;
  on(names: string, callback: (event: any) => void): unknown;
  [key: string]: any;
}

/** TinyMCE init options (data-* attributes are merged below these); init_instance_callback runs after Tsunami's own. */
interface TsunamiEditorOptions {
  init_instance_callback?: (editor: TsunamiTinyMCEEditor) => void;
  [option: string]: any;
}

/** A textarea.editor; .editor is the TinyMCE instance, null until it has started. */
interface HTMLTextAreaElement {
  readonly editor?: TsunamiTinyMCEEditor | null;
}

interface TsunamiEditor {
  /** Starts TinyMCE on the textarea (again if already mounted). Throws when TinyMCE is not loaded. */
  mount(el: HTMLTextAreaElement, options?: TsunamiEditorOptions): void;
  /** The TinyMCE instance, or null when not mounted or not started yet. */
  get(el: HTMLTextAreaElement): TsunamiTinyMCEEditor | null;
  /** Removes the editor and its state from the textarea. */
  destroy(el: HTMLTextAreaElement): void;
}

interface TsunamiTagInput {
  /** Sets up .tag-input elements under root (default document); already mounted ones are skipped. */
  mount(root?: ParentNode): void;
  /** A copy of the current tags. */
  value(el: HTMLElement): string[];
  /** Replaces the tags: entries are trimmed as strings, blanks and duplicates dropped, data-max applies. */
  set(el: HTMLElement, tags: unknown[]): void;
  /** Removes every tag. */
  clear(el: HTMLElement): void;
}

interface TsunamiSaveBar {
  /** Compares the form now, updates its bars and returns whether it is dirty. Takes a form or a .save-bar; false when none is found. */
  check(target: HTMLElement | null | undefined): boolean;
  /** Takes the form's current values as its saved values. Takes a form or a .save-bar. */
  markClean(target: HTMLElement | null | undefined): void;
}

/** "parsed" shows the tree, "raw" shows the textarea. */
type TsunamiJsonViewerView = "parsed" | "raw";

interface TsunamiJsonViewer {
  /** Opens every folded node. */
  expand(el: HTMLElement): void;
  /** Folds every node but the outermost. */
  collapse(el: HTMLElement): void;
  /** Reads the current view. */
  view(el: HTMLElement): TsunamiJsonViewerView | undefined;
  /** Switches the view (invalid JSON falls back to raw) and returns the resulting data-view. */
  view(el: HTMLElement, view: TsunamiJsonViewerView): TsunamiJsonViewerView | undefined;
  /** Reads the JSON text. */
  value(el: HTMLElement): string;
  /** Sets the JSON (a string as is, anything else with JSON.stringify) and returns the text now in the textarea. */
  value(el: HTMLElement, value: unknown): string;
}

interface TsunamiTheme {
  /** The theme in effect: "dark" or "light" (system resolved). */
  get(): "light" | "dark";
  /** "light" or "dark" pins the theme and stores it; anything else (use "system") follows the OS. Fires tsunami:themechange. */
  set(name: "light" | "dark" | "system"): void;
  /** Flips light and dark. */
  toggle(): void;
}

interface TsunamiTree {
  /** Shows only files whose text contains the query (case-insensitive) and opens their folders; an empty query restores everything. */
  filter(tree: HTMLElement, query: string): void;
}

interface TsunamiEventMap {
  /** Bubbles, not cancelable. Fired on the input after the input and change events when a suggestion is picked. */
  "tsunami:autocomplete": CustomEvent<{ value: string; item: TsunamiAutocompleteItem }>;
  /** Bubbles, not cancelable. Fired on the stepper when the current step changes. */
  "tsunami:stepchange": CustomEvent<{ index: number; step: HTMLLIElement; panel: HTMLElement }>;
  /** Bubbles, not cancelable. Fired on the stepper when Next is used on the last step and validation passes. */
  "tsunami:stepcomplete": CustomEvent<{ index: number }>;
  /** Bubbles and is cancelable (preventDefault keeps the tab). Fired on the tab; panel is null when the tab has none. */
  "tsunami:closetab": CustomEvent<{ tab: HTMLElement; panel: HTMLElement | null }>;
  /** Bubbles, not cancelable. Fired on the textarea once TinyMCE has started. */
  "tsunami:editorready": CustomEvent<{ editor: TsunamiTinyMCEEditor }>;
  /** Bubbles, not cancelable. Fired on .tag-input after the tags change. */
  "tsunami:tagschange": CustomEvent<{ value: string[] }>;
  /** Bubbles, not cancelable. Fired on the form when it goes from clean to dirty. */
  "tsunami:dirty": CustomEvent<{ form: HTMLFormElement; bars: HTMLElement[] }>;
  /** Bubbles, not cancelable. Fired on the form when it goes from dirty to clean. */
  "tsunami:clean": CustomEvent<{ form: HTMLFormElement; bars: HTMLElement[] }>;
  /** Bubbles, not cancelable. Fired on document when the theme or the system preference (while following it) changes. */
  "tsunami:themechange": CustomEvent<{ theme: "light" | "dark"; choice: "light" | "dark" | "system" }>;
}

// Part C: copy, phoneInput, toast, slider, sortable, timePicker, plus events
// from scripts without a window.tsunami module (pressed.js).
// Global script (no import/export): merges into Tsunami and TsunamiEventMap.

interface Tsunami {
  /** Copies text to the clipboard (falls back to execCommand); resolves true on success. */
  copy: TsunamiCopy;
  /** Phone input: read and set the country and number of a .phone-input. */
  phoneInput: TsunamiPhoneInput;
  /** Toast: short messages in a top-layer toaster; callable, with clear(). */
  toast: TsunamiToast;
  /** Slider: keeps --value and linked output elements in sync on input.slider. */
  slider: TsunamiSlider;
  /** Sortable: drag-to-reorder lists built on SortableJS. */
  sortable: TsunamiSortable;
  /** Time picker: segmented HH:MM(:SS) field built on .time-picker. */
  timePicker: TsunamiTimePicker;
}

/** window.tsunami.copy(text): the value is coerced with String(text ?? ""). */
interface TsunamiCopy {
  /** Copies text; resolves true when it was copied, false when both methods failed. */
  (text?: unknown): Promise<boolean>;
}

/** Value read from a phone input. */
interface TsunamiPhoneValue {
  /** ISO 3166-1 alpha-2 code, e.g. "TH". */
  country: string;
  /** Dial code with a leading plus, e.g. "+66". */
  dial: string;
  /** Digits of the national number (trunk 0 dropped where it applies). */
  number: string;
  /** "+" + dial code + digits, or "" while the field is empty. */
  value: string;
}

interface TsunamiPhoneInput {
  /** Current value of the .phone-input holding el (or el itself); null if it is not built. */
  get(el: HTMLElement): TsunamiPhoneValue | null;
  /** Sets the number from a full "+66812345678" string or a { country, number } object; fires events. */
  set(el: HTMLElement, value: string | { country?: string; number?: string }): void;
}

/** Action button of a toast. */
interface TsunamiToastAction {
  /** Button label. */
  label: string;
  /** Runs on click (receives the toast element), then the toast closes. */
  onClick?: (toast: TsunamiToastElement) => void;
}

interface TsunamiToastOptions {
  /** Bold first line. */
  title?: string;
  /** Second line. */
  text?: string;
  /** Icon and colour; none means no icon. */
  variant?: "ok" | "danger" | "warning" | "info" | "neutral";
  /** Milliseconds before it closes. Default 5000; 0 stays; danger defaults to 0. */
  duration?: number;
  /** Button that runs onClick and closes the toast. */
  action?: TsunamiToastAction;
  /** A toast with the same id is replaced. */
  id?: string | number;
}

/** The .toast element returned by toast(). */
interface TsunamiToastElement extends HTMLDivElement {
  /** Closes the toast (reason "api"). */
  dismiss(): void;
}

interface TsunamiToast {
  /** Shows a toast; a plain string becomes the title. Returns the .toast element. */
  (options?: TsunamiToastOptions | string): TsunamiToastElement;
  /** Closes every toast that is showing. */
  clear(): void;
}

interface TsunamiSlider {
  /** Updates --value on an input.slider and the value of every <output for="its-id">. */
  sync(el: HTMLInputElement): void;
}

/** Minimal shape of a SortableJS instance (third party, see sortable.min.js). */
interface TsunamiSortableJS {
  /** Reads a SortableJS option. */
  option(name: string): any;
  /** Sets a SortableJS option. */
  option(name: string, value: any): void;
  /** Ids (data-id by default) of the rows in order. */
  toArray(): string[];
  /** Reorders rows by id. */
  sort(order: string[], useAnimation?: boolean): void;
  /** Removes the SortableJS instance. */
  destroy(): void;
  [key: string]: any;
}

/**
 * Options for mount(): any SortableJS option (functions allowed); wins over
 * data-options. Defaults: animation 150, forceFallback, filter "[data-sortable-ignore]".
 */
interface TsunamiSortableOptions {
  animation?: number;
  forceFallback?: boolean;
  handle?: string | null;
  filter?: string;
  preventOnFilter?: boolean;
  disabled?: boolean;
  draggable?: string;
  /** Any other SortableJS option. */
  [option: string]: any;
}

interface TsunamiSortable {
  /** Makes el a sortable list (re-mounts if already mounted); throws when SortableJS is not loaded. */
  mount(el: HTMLElement, options?: TsunamiSortableOptions): void;
  /** The SortableJS instance of el, or null when it is not mounted. */
  get(el: HTMLElement): TsunamiSortableJS | null;
  /** Removes the sortable behaviour and the added members from el. */
  destroy(el: HTMLElement): void;
  /** Ids (data-id) of the rows in order. */
  toArray(el: HTMLElement): string[];
  /** Reorders the rows by id. */
  sort(el: HTMLElement, order: string[]): void;
  /** Returns whether el is disabled; with a value, sets it first. */
  disabled(el: HTMLElement, value?: boolean): boolean;
}

interface TsunamiTimePicker {
  /** Builds the segments on a .time-picker (no-op if already built). */
  mount(el: HTMLElement): void;
  /** Removes the segments and the value property from el. */
  destroy(el: HTMLElement): void;
  /** Current time as "HH:MM" or "HH:MM:SS" ("" while a segment is empty); null if not mounted. */
  get(el: HTMLElement): string | null;
  /** Sets the time ("HH:MM" or "HH:MM:SS"); an invalid time clears it. No-op if not mounted. */
  set(el: HTMLElement, value: string): void;
}

interface TsunamiEventMap {
  /** Bubbles from the copy button; not cancelable. */
  "tsunami:copy": CustomEvent<{ text: string }>;
  /** Bubbles from the .phone-input wrapper when the number or country changes; not cancelable. */
  "tsunami:phonechange": CustomEvent<TsunamiPhoneValue>;
  /** Bubbles from the .toast when it is shown; not cancelable. */
  "tsunami:toast": CustomEvent<Record<string, never>>;
  /** Bubbles from the .toast when it is dismissed; not cancelable. */
  "tsunami:toastclose": CustomEvent<{ reason: "timeout" | "close" | "action" | "api" }>;
  /** Bubbles from the .time-picker when the value changes; not cancelable. */
  "tsunami:timechange": CustomEvent<{ value: string }>;
  /** Bubbles from the .sortable list after a move by pointer or key; not cancelable. id is the row's data-id attribute (null if none). */
  "tsunami:reorder": CustomEvent<{
    item: HTMLElement;
    id: string | null;
    oldIndex: number | undefined;
    newIndex: number | undefined;
  }>;
  /** Bubbles from the [data-pressed] group when a toggle button is clicked; not cancelable. pressed is the clicked button's new state. */
  "tsunami:pressedchange": CustomEvent<{ button: HTMLElement; pressed: boolean }>;
}
