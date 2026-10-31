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
