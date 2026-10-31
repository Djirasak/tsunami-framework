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
