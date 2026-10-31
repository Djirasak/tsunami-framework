---
name: tsunami
description: Build pages and back-office UIs with Tsunami (津波), the quiet UI framework in this repo. Use when writing HTML that uses Tsunami classes or data-* attributes, adding or changing a component in src/, or writing a docs page in site/content/.
---

# Tsunami

A quiet UI framework: semantic HTML, a class per component, `data-*` for variants. Native elements first (`dialog`, `popover`, `details`, `button`); vanilla JS only where HTML can't do it. Every component and its markup: [references/components.md](references/components.md). Each one has a live page at `site/content/<name>.html`, and that page is the source of truth.

## Load

```html
<link rel="stylesheet" href="dist/tsunami.min.css" />
<script src="dist/tsunami.min.js"></script>
<!-- plain script in <head>: applies the saved theme before paint -->
```

`fonts/` sits next to `dist/`. Five components need a library first, each loaded with its own plain `<script>` before Tsunami: Editor (`dist/tinymce.min.js`), Sortable (`dist/sortable.min.js`), Date picker (`dist/vanilla-calendar.min.js`), Chart (`dist/chart.min.js`) and Code editor (`dist/monaco/vs/loader.js`, which goes after the other libraries).

## Markup rules

- One class names the component: `.btn`, `.card`, `.field`, `.table`. Parts are plain child elements (`header`, `section`, `aside`, `footer`, `small`, `strong`), not BEM classes.
- Variants and sizes are attributes: `data-variant="primary|secondary|ghost|danger|outline|muted|ok|warning|info"`, `data-size="xs|sm|lg|xl|icon|icon-sm|icon-xs"`, `data-direction="row"`, `data-gap="sm|lg"`. Use only the values a component's page lists.
- State is ARIA or native: `aria-pressed`, `aria-current="page"`, `aria-selected`, `aria-invalid="true"`, `aria-busy="true"`, `disabled`, `hidden`, `open`.
- Overlays are native: `<dialog class="dialog">` / `.drawer` opened with `commandfor` + `command="show-modal"`, `[popover]` + `popovertarget` for `.dropdown` and `.popover`, `data-tooltip="…"` for tooltips.
- Icons: `<i class="icon icon-<lucide-name>" aria-hidden="true"></i>` (Lucide names, `data-size="sm|lg|xl"`). Flags: `<span class="flag flag-th" role="img" aria-label="Thailand"></span>`.
- Text: `.typography` wrapper for long content; `.h1`–`.h6` give any element a heading look; `data-variant="lead|muted"` on `<p>`.
- Theme: `<html data-theme="light|dark">` (none = system); buttons with `data-theme-toggle="light|dark|system"`.

## JavaScript

Behaviour is automatic: the script finds the markup (event delegation and a MutationObserver), so there are no init calls. Content added later also works. Each module exposes a small API on `window.tsunami` and fires bubbling `tsunami:*` events:
`theme.get/set/toggle` · `toast(opts)` · `saveBar.check/markClean` · `table.refresh/page/filter` · `chart(sel, opts)` · `editor`, `codeEditor`, `sortable`, `autocomplete`, `datePicker` `.mount/get/destroy` · `jsonViewer.expand/collapse/view/value`.
Events include `tsunami:themechange`, `tsunami:dirty`/`clean`, `tsunami:sort`/`select`/`tablechange`, `tsunami:reorder`, `tsunami:toast`/`toastclose`, `tsunami:closetab`, `tsunami:pressedchange` and `tsunami:autocomplete`. Form widgets fire native `input` + `change`, so the save bar sees them.

## CSS variables (35, in src/_tokens.scss)

Colour: `--bg --surface --subtle --fg --muted --line --accent --on-accent --overlay` and `--ok-bg/fg --danger-bg/fg --warning-bg/fg --info-bg/fg --neutral-bg/fg`.
Type: `--font-sans --font-mono --text-sm --text-base --text-lg --text-xl --leading`. Shape and space: `--radius-sm/md/lg`, `--space-1…6`.
Dark values live in one `dark-tokens` mixin. Use `var(--…)` in your own CSS so it follows the theme.

## Writing framework code (src/)

- SCSS with `@use`/`@forward` only. Every rule sits in `@layer components` inside `:where()` (zero specificity), and new components are added to `src/index.scss`.
- Use only the 35 variables, and never add a new one. No Sass colour functions, no `@extend`, no `/` division.
- Quiet look: 1px `--line` borders, no shadows, no gradients. The accent is only for links, the primary button, focus and picked states. Heights are 36px by default (28 sm, 40 lg).
- Motion uses the mixins in `_motion.scss` and stops under `prefers-reduced-motion`.
- JS lives in `src/js/<name>.js`, imported in `src/js/index.js`. It uses data attributes, delegation and `window.tsunami.<name>`, with a header comment listing the options.
- A new page `site/content/<name>.html` needs Preview/Code tabs, sections for the API, events, attributes and accessibility, and entries in `site/content/pages.json` (title, library scripts) and `site/content/nav.json` (the sidebar and the search).
- Check with `bun run build`, `bun run lint` and `bun fmt` (then `git checkout vendor`). `bun run docs` builds and serves the docs app. Make small commits, one per change.

## Don't

- Don't add classes for variants (`.btn-primary`, `.card--row`), and don't use utility classes (none exist).
- Don't add inline colours, shadows, gradients or new CSS variables. Use the existing variables.
- Don't wrap native elements in custom JS widgets when `dialog`, `popover`, `details` or `input` already do the job.
- Don't call init functions, and don't load `tsunami.min.js` as `type="module"` or `defer`.
- Don't fetch libraries from a CDN. Vendored libraries live in `vendor/` and are built into `dist/`.
- Don't add npm dependencies without a reason, and keep them to dev tooling: the framework itself ships with none.
- Don't give icon-only buttons no name: add `aria-label`. Decorative icons get `aria-hidden="true"`.
