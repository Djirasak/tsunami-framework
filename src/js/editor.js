// Editor: textarea.editor becomes a TinyMCE rich text editor. TinyMCE is not in
// tsunami.js: load dist/tinymce.min.js with its own <script> first.
// The textarea keeps its name, required, disabled and readonly, holds the HTML
// (the form sends it) and is the element the page works with. Options:
//   data-toolbar="bold italic | link" ("none" hides it), data-min-height,
//   data-max-height (px), data-menubar, data-statusbar (boolean attributes);
//   any other TinyMCE option goes through window.tsunami.editor.mount().
// The element gets .editor (the TinyMCE instance, null until it has started)
// and data-editor-ready; a bubbling tsunami:editorready (detail { editor })
// fires when it has. Edits send a bubbling `input` event from the textarea,
// so the save bar sees them. Theme changes switch the skin and the content.
// API: window.tsunami.editor = { mount(el, options?), get(el), destroy(el) }.
// Source code: when the page has also loaded Monaco (see code-editor.js), the
// code button opens a dialog with a code editor; without it TinyMCE's own
// dialog stays.

// The HTML may be rendered by other apps, so the editor only produces a short
// list of elements, attributes, styles and link protocols. Everything else is
// dropped on paste, on load and on save, whatever the options say.
const ELEMENTS = [
  "@[style]",
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "blockquote",
  "strong/b",
  "em/i",
  "u",
  "s/strike",
  "code",
  "sub",
  "sup",
  "ul",
  "ol",
  "li",
  "span",
  "a[href|title|target|rel]",
  "img[!src|alt|title|width|height]",
  "video[!src|controls|width|height]",
  "audio[!src|controls]",
].join(",");
const STYLES = {
  "*": "text-align,padding-left,padding-right",
  img: "width,height",
  video: "width,height",
};
// Relative and fragment URLs pass, and so do http, https and mailto.
// Anything else with a scheme (javascript:, data:, vbscript:, file:, ...) is
// emptied. Browsers ignore control characters and spaces inside a scheme,
// so those are dropped before looking.
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const url = (value) => {
  const clean = [...value]
    .filter((c) => c.charCodeAt(0) > 32 && c !== "\x7f")
    .join("");
  return SCHEME.test(clean) && !/^(?:https?|mailto):/i.test(clean) ? "" : value;
};
const VIDEO = /\.(?:mp4|webm|ogv|mov)(?:[?#].*)?$/i;
const AUDIO = /\.(?:mp3|ogg|oga|wav|m4a|aac|flac)(?:[?#].*)?$/i;
const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Media: the dialog takes the address of a video or audio file and nothing
// else (no embed code, no iframes).
const resolve = (data) =>
  new Promise((ok, fail) => {
    const src = data.url;
    if (url(src) !== src || !/^https?:/i.test(src)) {
      fail({ msg: "Use an https:// address." });
    } else if (VIDEO.test(src)) {
      ok({ html: `<video src="${esc(src)}" controls></video>` });
    } else if (AUDIO.test(src)) {
      ok({ html: `<audio src="${esc(src)}" controls></audio>` });
    } else {
      fail({ msg: "Use the address of a video or audio file." });
    }
  });

const DEFAULTS = {
  menubar: false,
  statusbar: false,
  branding: false,
  promotion: false,
  license_key: "gpl",
  plugins: "image link fullscreen media autoresize lists code",
  toolbar:
    "blocks | bold italic underline | bullist numlist link image media | alignleft aligncenter alignright alignjustify | outdent indent | removeformat | code fullscreen",
  toolbar_mode: "wrap",
  min_height: 200,
  max_height: 800,
  body_class: "typography",
  content_style:
    "html, body { background: var(--surface); } body { margin: 0.75rem; font-family: var(--font-sans); font-size: var(--text-base); } html:focus-visible, body:focus-visible, body:focus { outline: none !important; }",
  // Safety.
  valid_elements: ELEMENTS,
  valid_styles: STYLES,
  invalid_elements:
    "script,style,iframe,object,embed,form,input,textarea,link,meta,base,svg,math",
  allow_script_urls: false,
  allow_unsafe_link_target: false,
  convert_unsafe_embeds: true,
  xss_sanitization: true,
  urlconverter_callback: (value) => url(value),
  paste_data_images: false,
  paste_webkit_styles: "none",
  link_default_protocol: "https",
  link_target_list: false,
  link_title: false,
  image_title: false,
  image_advtab: false,
  image_uploadtab: false,
  media_live_embeds: false,
  media_dimensions: false,
  media_alt_source: false,
  media_poster: false,
  media_url_resolver: resolve,
  sandbox_iframes: true,
};

const states = new WeakMap(); // textarea -> { editor, options, id }
const mounted = new Set(); // textareas with a state, for the theme switch
let serial = 0;

const dark = () => window.tsunami.theme.get() === "dark";
const flag = (v) => v !== undefined && v !== "false";
const num = (v) => (v === undefined ? undefined : Number(v));

// Options written as data-* attributes.
function fromData(el) {
  const d = el.dataset;
  const o = {};
  if (d.toolbar !== undefined)
    o.toolbar = d.toolbar === "none" || d.toolbar === "" ? false : d.toolbar;
  if (d.minHeight !== undefined) o.min_height = num(d.minHeight);
  if (d.maxHeight !== undefined) o.max_height = num(d.maxHeight);
  if (d.menubar !== undefined) o.menubar = flag(d.menubar);
  if (d.statusbar !== undefined) o.statusbar = flag(d.statusbar);
  return o;
}

const labelOf = (el) =>
  el.getAttribute("aria-label") ||
  [...(el.labels ?? [])].map((l) => l.textContent.trim()).join(" ") ||
  "";

// The framework stylesheet styles the text being edited.
function sheet() {
  const link = document.querySelector(
    'link[rel="stylesheet"][href*="tsunami"]',
  );
  return link ? link.href : null;
}

const sync = (el, editor) => {
  editor.save();
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

function theme(editor) {
  editor.getDoc().documentElement.dataset.theme = window.tsunami.theme.get();
}

const monaco = () => typeof window.require?.config === "function";

// The source code dialog: HTML in a code editor, set back on Save.
function source(editor) {
  const id = `editor-source-${++serial}`;
  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.dataset.size = "xl";
  dialog.setAttribute("aria-labelledby", `${id}-title`);
  dialog.innerHTML = `<header><h2 id="${id}-title">Source code</h2><button type="button" class="btn" data-variant="ghost" data-size="icon" aria-label="Close" commandfor="${id}" command="close"><i class="icon icon-x" aria-hidden="true"></i></button></header><div class="code-editor" data-language="html" style="height: 24rem"><textarea aria-label="Source code" spellcheck="false"></textarea></div><footer><button type="button" class="btn" commandfor="${id}" command="close">Cancel</button><button type="button" class="btn" data-variant="primary" data-save>Save</button></footer>`;
  dialog.id = id;
  const box = dialog.querySelector(".code-editor");
  const area = box.querySelector("textarea");
  area.value = editor.getContent({ source_view: true });
  dialog.querySelector("[data-save]").addEventListener("click", () => {
    editor.undoManager.transact(() => editor.setContent(area.value));
    dialog.close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    editor.focus();
  });
  document.body.append(dialog);
  dialog.showModal();
}

function start(el, state) {
  const tinymce = window.tinymce;
  const isDark = dark();
  const label = labelOf(el);
  tinymce
    .init({
      ...DEFAULTS,
      skin: isDark ? "oxide-dark" : "oxide",
      content_css: sheet() ?? (isDark ? "dark" : "default"),
      readonly: el.readOnly,
      disabled: el.matches(":disabled"),
      ...(label && { iframe_aria_text: `${label}. Rich text area.` }),
      ...fromData(el),
      ...state.options,
      target: el,
      init_instance_callback(editor) {
        // A remount or a destroy may have happened while TinyMCE started.
        if (states.get(el) !== state) return editor.remove();
        state.editor = editor;
        theme(editor);
        const plain = editor.editorCommands.commands.exec.mcecodeeditor;
        if (plain)
          editor.addCommand("mceCodeEditor", (...args) =>
            monaco() ? source(editor) : plain.apply(editor, args),
          );
        // The editor writes tidy HTML; take it as the default too, so Reset
        // and the save bar compare the same text.
        if (el.value === el.defaultValue)
          el.defaultValue = el.value = editor.getContent();
        // TinyMCE hides the textarea; keep it out of sight but focusable, so
        // a required field can show the browser's message next to the editor.
        el.style.removeProperty("display");
        el.dataset.editorReady = "";
        let queued = false;
        editor.on("input change undo redo", () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => {
            queued = false;
            if (state.editor === editor) sync(el, editor);
          });
        });
        el.dispatchEvent(
          new CustomEvent("tsunami:editorready", {
            bubbles: true,
            detail: { editor },
          }),
        );
        state.options.init_instance_callback?.(editor);
      },
    })
    .catch((error) => console.error("Tsunami editor could not start:", error));
}

function destroy(el) {
  const state = states.get(el);
  if (!state) return;
  states.delete(el);
  mounted.delete(el);
  delete el.editor;
  delete el.dataset.editorReady;
  state.editor?.remove();
}

function mount(el, options = {}) {
  if (!window.tinymce)
    throw new Error(
      "A textarea.editor needs TinyMCE: load dist/tinymce.min.js with its own <script> before the Tsunami script.",
    );
  destroy(el);
  const state = { editor: null, options, id: ++serial };
  states.set(el, state);
  mounted.add(el);
  Object.defineProperty(el, "editor", {
    configurable: true,
    get: () => state.editor,
  });
  start(el, state);
}

const upgrade = (el) => {
  if (!states.has(el)) mount(el);
};
const all = (root) =>
  root.querySelectorAll?.("textarea.editor").forEach(upgrade);

// The text of a textarea is still arriving while the page is parsed.
const scan = () => {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => all(document), {
      once: true,
    });
  else all(document);
};
scan();
new MutationObserver((list) =>
  list.forEach((m) => {
    if (document.readyState === "loading") return;
    m.addedNodes.forEach((n) =>
      n.matches?.("textarea.editor") ? upgrade(n) : all(n),
    );
    m.removedNodes.forEach((n) => {
      if (n.isConnected) return;
      for (const el of mounted) if (!el.isConnected) destroy(el);
    });
  }),
).observe(document.documentElement, { childList: true, subtree: true });

// Skin and content follow the theme. The skin is chosen when the editor
// starts, so the editor starts again (its text lives in the textarea).
document.addEventListener("tsunami:themechange", () => {
  for (const el of mounted) {
    const state = states.get(el);
    if (!state.editor) continue;
    state.editor.save();
    mount(el, state.options);
  }
});

// A form sent by the browser, or read with new FormData(form), carries the
// HTML as it stands.
document.addEventListener(
  "submit",
  (e) => {
    for (const el of mounted)
      if (el.form === e.target) states.get(el).editor?.save();
  },
  true,
);
document.addEventListener("formdata", (e) => {
  for (const el of mounted) {
    const editor = states.get(el).editor;
    if (el.form === e.target && el.name && !el.disabled && editor)
      e.formData.set(el.name, editor.getContent());
  }
});
// Reset puts the textarea's default back; the editor follows.
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    for (const el of mounted) {
      const editor = states.get(el).editor;
      if (el.form !== e.target || !editor) continue;
      editor.setContent(el.value);
      editor.undoManager.clear();
      editor.setDirty(false);
    }
  });
});
// A label, or the browser's validation message, focuses the textarea.
document.addEventListener("focusin", (e) => {
  if (e.target.matches?.("textarea[data-editor-ready]"))
    states.get(e.target)?.editor?.focus();
});

(window.tsunami ??= {}).editor = {
  mount,
  get: (el) => states.get(el)?.editor ?? null,
  destroy,
};
