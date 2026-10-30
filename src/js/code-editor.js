// Code editor: .code-editor holds one <textarea> per file and becomes a Monaco
// Editor once the page has loaded Monaco. Monaco is not in tsunami.js: load
// dist/monaco/vs/loader.js with its own <script> before the Tsunami script.
// (The loader defines the globals `require` and `define`; a page that loads
// another AMD library must load the two in a known order, see the docs.)
// Until Monaco has started, the textarea is the editor. After that the box
// gets data-loaded, Monaco takes the textarea's place on screen, and the
// textarea keeps the code: the form sends it and it gets a bubbling `input`
// event after each edit. Options: data-language on the box or on a textarea
// (html, css, scss, javascript or json; plain text by default), readonly and
// disabled (the editor is read only), aria-label or a <label for>.
// Several textareas in one box are several files: the one that is not
// `hidden` is shown, and the editor follows hidden, added and removed
// textareas, keeping each file's cursor, scroll and undo history.
// The element gets .editor (the Monaco instance, null until it has started)
// and a bubbling tsunami:codeeditorready (detail { editor }) fires when it
// has. Monaco has one theme per page: two themes are built from the tokens and
// the page switches on tsunami:themechange.
// API: window.tsunami.codeEditor = { mount(el, options?), get(el),
// destroy(el) }; options are Monaco editor options over the defaults.

const ROOT = ".code-editor";
const LANGUAGES = ["html", "css", "scss", "javascript", "json"];
// Colouring needs no language service for JavaScript, and its 7 MB worker is
// not shipped: every JavaScript feature that would start it is off.
const NO_SERVICE = {
  completionItems: false,
  hovers: false,
  documentSymbols: false,
  definitions: false,
  references: false,
  documentHighlights: false,
  rename: false,
  diagnostics: false,
  documentRangeFormattingEdits: false,
  signatureHelp: false,
  onTypeFormattingEdits: false,
  codeActions: false,
  inlayHints: false,
};

const states = new WeakMap(); // box -> state
const mounted = new Set(); // boxes with a state
let loading = null; // the one promise that loads Monaco

const root = document.documentElement;
const token = (name) => getComputedStyle(root).getPropertyValue(name).trim();

// Any CSS colour to [r, g, b] (a canvas turns every colour syntax to pixels).
const pixel = document.createElement("canvas").getContext("2d", {
  willReadFrequently: true,
});
function rgb(css) {
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillStyle = "#000";
  pixel.fillStyle = css;
  pixel.fillRect(0, 0, 1, 1);
  return [...pixel.getImageData(0, 0, 1, 1).data];
}
const hex = (css, alpha = 255) =>
  `#${[...rgb(css).slice(0, 3), alpha]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;

const themeName = () =>
  window.tsunami.theme.get() === "dark" ? "tsunami-dark" : "tsunami-light";

// The theme for the mode in effect, built from the tokens as they are now.
function defineTheme(monaco) {
  const dark = window.tsunami.theme.get() === "dark";
  const c = (name) => hex(token(name));
  const [bg, fg, line, muted, accent, subtle] = [
    "--surface",
    "--fg",
    "--line",
    "--muted",
    "--accent",
    "--subtle",
  ].map(c);
  const [ok, warn, danger, info] = [
    "--ok-fg",
    "--warning-fg",
    "--danger-fg",
    "--info-fg",
  ].map(c);
  const rule = (name, color, fontStyle) => ({
    token: name,
    foreground: color.slice(1, 7),
    ...(fontStyle && { fontStyle }),
  });
  monaco.editor.defineTheme(themeName(), {
    base: dark ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      rule("", fg),
      rule("comment", muted, "italic"),
      rule("keyword", accent),
      rule("keyword.json", accent),
      rule("string", ok),
      rule("string.key.json", info),
      rule("string.value.json", ok),
      rule("number", warn),
      rule("tag", info),
      rule("metatag", info),
      rule("attribute.name", warn),
      rule("attribute.value", ok),
      rule("type", info),
      rule("regexp", danger),
      rule("delimiter", muted),
      rule("delimiter.html", muted),
      rule("delimiter.bracket", muted),
      rule("variable", fg),
      rule("variable.predefined", info),
    ],
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
      "editorLineNumber.foreground": muted,
      "editorLineNumber.activeForeground": fg,
      "editor.selectionBackground": hex(token("--accent"), 64),
      "editor.inactiveSelectionBackground": hex(token("--accent"), 32),
      "editor.lineHighlightBackground": subtle,
      "editor.lineHighlightBorder": "#00000000",
      "editorCursor.foreground": fg,
      "editorIndentGuide.background1": line,
      "editorIndentGuide.activeBackground1": muted,
      "editorWhitespace.foreground": line,
      "editorWidget.background": bg,
      "editorWidget.border": line,
      "editorSuggestWidget.background": bg,
      "editorSuggestWidget.border": line,
      "editorSuggestWidget.selectedBackground": subtle,
      "editorHoverWidget.background": bg,
      "editorHoverWidget.border": line,
      "input.background": bg,
      "input.border": line,
      focusBorder: accent,
      "scrollbarSlider.background": hex(token("--muted"), 56),
      "scrollbarSlider.hoverBackground": hex(token("--muted"), 96),
      "scrollbarSlider.activeBackground": hex(token("--muted"), 128),
      "scrollbar.shadow": "#00000000",
      "widget.shadow": "#00000000",
    },
  });
}

function load() {
  if (window.monaco?.editor) return Promise.resolve(window.monaco);
  if (typeof window.require?.config !== "function")
    throw new Error(
      "A code editor needs Monaco: load dist/monaco/vs/loader.js with its own <script> before the Tsunami script.",
    );
  loading ??= new Promise((ok, fail) => {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    // The modules and the stylesheet sit next to the loader.
    const loader = [...document.scripts].find((s) =>
      /\/vs\/loader\.js(?:[?#]|$)/.test(s.src),
    );
    if (loader) {
      const vs = new URL(".", loader.src).href.replace(/\/$/, "");
      window.require.config({ paths: { vs } });
      style.href = `${vs}/editor/editor.main.css`;
      document.head.append(style);
    }
    window.require(
      ["vs/editor/editor.main"],
      () => {
        const monaco = window.monaco;
        monaco.languages.typescript?.javascriptDefaults.setModeConfiguration(
          NO_SERVICE,
        );
        ok(monaco);
      },
      fail,
    );
  });
  return loading;
}

const defaults = () => ({
  automaticLayout: true,
  fontSize: 13,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontFamily: token("--font-mono"),
  tabSize: 2,
  padding: { top: 8, bottom: 8 },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: { useShadows: false },
});

const files = (box) =>
  [...box.querySelectorAll("textarea")].filter((t) => t.closest(ROOT) === box);
const shown = (box) => files(box).find((t) => !t.hidden) ?? null;
const language = (box, ta) => {
  const name = ta.dataset.language ?? box.dataset.language;
  return LANGUAGES.includes(name) ? name : "plaintext";
};
const text = (id) => document.getElementById(id)?.textContent.trim() ?? "";
const labelOf = (box, ta) =>
  ta.getAttribute("aria-label") ||
  [...(ta.labels ?? [])].map((l) => l.textContent.trim()).join(" ") ||
  (ta.getAttribute("aria-labelledby") ?? "")
    .split(/\s+/)
    .map(text)
    .join(" ")
    .trim() ||
  box.getAttribute("aria-label") ||
  "Code editor";

// One model (the code and its undo history) per textarea.
function track(box, state, ta) {
  const model = state.monaco.editor.createModel(ta.value, language(box, ta));
  const file = { model, view: null };
  file.listener = model.onDidChangeContent(() => {
    if (state.quiet) return;
    ta.value = model.getValue();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  state.files.set(ta, file);
}

// Shows the file whose textarea is not hidden, and adds or drops files.
function refresh(box, state) {
  const { editor, monaco } = state;
  const list = files(box);
  for (const [ta, file] of state.files)
    if (!list.includes(ta)) {
      if (state.current === ta) state.current = null;
      file.listener.dispose();
      if (editor.getModel() === file.model) editor.setModel(null);
      file.model.dispose();
      state.files.delete(ta);
    }
  for (const ta of list) if (!state.files.has(ta)) track(box, state, ta);
  for (const [ta, file] of state.files) {
    const lang = language(box, ta);
    if (file.model.getLanguageId() !== lang)
      monaco.editor.setModelLanguage(file.model, lang);
  }
  const next = shown(box);
  if (next !== state.current || !editor.getModel()) {
    const prev = state.files.get(state.current);
    if (prev) prev.view = editor.saveViewState();
    state.current = next;
    const file = state.files.get(next);
    editor.setModel(file?.model ?? null);
    if (file?.view) editor.restoreViewState(file.view);
  }
  editor.updateOptions({
    readOnly: !!next && (next.readOnly || next.disabled),
    ariaLabel: next ? labelOf(box, next) : "Code editor",
    ...state.options,
  });
}

function start(box, state) {
  load().then(
    (monaco) => {
      if (states.get(box) !== state) return;
      const host = document.createElement("div");
      host.className = "code-editor-host";
      box.append(host);
      state.host = host;
      state.monaco = monaco;
      defineTheme(monaco);
      state.editor = monaco.editor.create(host, {
        ...defaults(),
        model: null,
        theme: themeName(),
        ...state.options,
      });
      monaco.editor.setTheme(themeName());
      refresh(box, state);
      box.dataset.loaded = "";
      state.observer = new MutationObserver(() => refresh(box, state));
      state.observer.observe(box, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "hidden",
          "readonly",
          "disabled",
          "data-language",
          "aria-label",
        ],
      });
      box.dispatchEvent(
        new CustomEvent("tsunami:codeeditorready", {
          bubbles: true,
          detail: { editor: state.editor },
        }),
      );
    },
    (error) => console.error("Tsunami code editor could not start:", error),
  );
}

function destroy(box) {
  const state = states.get(box);
  if (!state) return;
  states.delete(box);
  mounted.delete(box);
  delete box.editor;
  delete box.dataset.loaded;
  state.observer?.disconnect();
  if (!state.editor) return;
  state.editor.setModel(null);
  for (const file of state.files.values()) {
    file.listener.dispose();
    file.model.dispose();
  }
  state.editor.dispose();
  state.host.remove();
}

function mount(box, options = {}) {
  load(); // throws a clear error when the loader is missing
  destroy(box);
  const state = {
    editor: null,
    options,
    files: new Map(),
    current: null,
    quiet: false,
  };
  states.set(box, state);
  mounted.add(box);
  Object.defineProperty(box, "editor", {
    configurable: true,
    get: () => state.editor,
  });
  start(box, state);
}

const upgrade = (box) => {
  if (!states.has(box)) mount(box);
};
const all = (node) => node.querySelectorAll?.(ROOT).forEach(upgrade);

// The text of a textarea is still arriving while the page is parsed.
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => all(document), {
    once: true,
  });
else all(document);
new MutationObserver((list) =>
  list.forEach((m) => {
    if (document.readyState === "loading") return;
    m.addedNodes.forEach((n) => (n.matches?.(ROOT) ? upgrade(n) : all(n)));
    if (m.removedNodes.length)
      for (const box of mounted) if (!box.isConnected) destroy(box);
  }),
).observe(root, { childList: true, subtree: true });

// Monaco has one theme for the page.
document.addEventListener("tsunami:themechange", () => {
  const state = [...mounted].map((b) => states.get(b)).find((s) => s.monaco);
  if (!state) return;
  defineTheme(state.monaco);
  state.monaco.editor.setTheme(themeName());
});

// Reset puts the textarea's default back; the editor follows.
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    for (const box of mounted) {
      const state = states.get(box);
      if (!state.editor || box.closest("form") !== e.target) continue;
      state.quiet = true;
      for (const [ta, file] of state.files) file.model.setValue(ta.value);
      state.quiet = false;
    }
  });
});

// A label, or the browser's validation message, focuses the textarea.
document.addEventListener("focusin", (e) => {
  const box = e.target.closest?.(`${ROOT}[data-loaded]`);
  if (box && e.target.matches("textarea")) states.get(box)?.editor?.focus();
});

(window.tsunami ??= {}).codeEditor = {
  mount,
  get: (box) => states.get(box)?.editor ?? null,
  destroy,
};
