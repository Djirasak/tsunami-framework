<div align="center">

<img src="site/public/docs/favicon.svg" width="72" height="72" alt="Tsunami logo">

# Tsunami 津波

A quiet UI framework.
Semantic HTML + `data-*` attributes. The core (`tsunami.min.css` and `tsunami.min.js`) has no runtime dependencies; five components load a library of their own, only on the pages that use them: Editor (TinyMCE), Code editor (Monaco), Chart (Chart.js), Date picker (Vanilla Calendar Pro) and Sortable (SortableJS).
65 component pages, Lucide icons and 270 country flags.

</div>

## Why

- **Native first.** `dialog`, `popover`, `details`, `button`. JS only where HTML can't do the job.
- **Zero specificity.** Every selector sits in `@layer components` inside `:where()`, so your CSS always wins.
- **Light / dark.** Colours are CSS variables, so the theme switches at runtime with no flash.
- **Thai + Latin.** Self-hosted Google Sans (OFL), tabular numbers in tables.
- **Quiet look.** 1px borders, no shadows, no gradients. The accent marks links, the primary button, focus and picked states (such as a journey page).
- **Comfortable sizes.** Buttons and inputs are 36px tall (28px small), with 6px corners.
- **Calm motion.** Short fades and slides for dialogs, drawers, popovers and tooltips. All of it stops under `prefers-reduced-motion`.

## Install

From jsDelivr (each release tag; replace the version):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Djirasak/tsunami-framework@v1.0.1/dist/tsunami.min.css" />
<script src="https://cdn.jsdelivr.net/gh/Djirasak/tsunami-framework@v1.0.1/dist/tsunami.min.js"></script>
```

Or self-hosted:

```html
<link rel="stylesheet" href="dist/tsunami.min.css" />
<script src="dist/tsunami.min.js"></script>
```

Keep `fonts/` and `flags/` next to `dist/` (their URLs are `../fonts/...` and `../flags/...`). `dist/` is committed only by the `Release` workflow, so every tag carries the files built for its version. Monaco (the code editor) loads from jsDelivr too: `@v0.1.2/dist/monaco/vs/loader.js`, before the Tsunami script.

## Browser support

Tsunami targets current evergreen browsers and uses modern CSS and HTML without fallbacks: cascade layers, `:has()`, native `popover`, `<dialog>`, the `commandfor` and `command` attributes, `color-mix()` and range media queries. The newest of these, `commandfor`, sets the floor: Chrome and Edge 135, Firefox 144 and Safari 26.2 or later. Check [caniuse.com](https://caniuse.com) before supporting anything older. Without JavaScript the native parts still work; the components that need a script do not.

TypeScript: each release has `dist/tsunami.d.ts`, which types `window.tsunami` and the `tsunami:*` events. Include it in your `tsconfig.json`.

## Use

The class names the component; `data-*` sets variant and size.

```html
<button class="btn" data-variant="primary" data-size="sm">Save</button>

<span class="badge" data-variant="ok">Paid</span>

<article class="card">
  <header><h2>Recent orders</h2></header>
  <div>...</div>
</article>

<i class="icon icon-plus" aria-hidden="true"></i>
```

## Components

| Group       | Components                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Foundations | Colors, Typography (`.typography`), Icons (Lucide)                                                                              |
| Layout      | Stack, Card, Item, Page header, Stat, Chart, Sortable, Table, Timeline, Journey, JSON viewer, Accordion, Scroll area, Workspace, Description list, Stepper, Container |
| Actions     | Button, Command, Dropdown, Theme switcher, Bulk action bar, Copy button |
| Forms       | Autocomplete, Code editor, Color field, Date picker, Dropzone, Editor, Field, Image field, Input, Input group, One-time code, Select, Save bar, Segmented control, Filter bar, Tag input, Phone input, Time picker |
| Feedback    | Alert, Badge, Empty, Loader, Skeleton, Progress, Toast, Status dot |
| Media       | Avatar, Flags                                                                                                                   |
| Navigation  | Breadcrumb, Link, Pagination, Sidebar, Subnav, Tabs, Tree                                                                       |
| Overlays    | Dialog, Drawer, Popover, Tooltip                                                                                                |

Every component has a docs page with live examples, a Code tab and an attributes table.

## Develop

Requires [Bun](https://bun.sh) `>=1.4.3`.

```sh
bun install --frozen-lockfile
bun run build      # dist/tsunami(.min).css + dist/tsunami(.min).js
bun run dev        # sass --watch -> dist/tsunami.css
bun run docs       # install site/ packages, build, then the docs app at http://localhost:5477/docs
bun run lint       # eslint src/js
bun run audit      # bun audit
```

The docs are a Next.js app in `site/`, deployed to Cloudflare Workers with the OpenNext adapter. It is a separate package: its dependencies (`site/package.json`, `site/bun.lock`) never touch `dist/`. Each page is HTML in `site/content/<name>.html` (the inner HTML of `<main>`; edit that), its title and library scripts are in `site/content/pages.json`, and the sidebar and search come from `site/content/nav.json`. Pages are prerendered, with clean URLs (`/docs/button`) and plain links (full page loads), so inline `<script>` blocks in the examples run as in a static page. `bun run docs` installs the `site/` packages, builds `dist/`, copies `dist/`, `fonts/` and `flags/` into `site/public/`, starts `next dev`, and rebuilds `site/public/dist/` whenever a file in `src/` changes (refresh the page to see it). `bun run check:types` compiles the declarations in `types/`, and `bun run check:a11y` runs axe-core over every docs page (it needs the docs running and Chromium). `bun run check:docs` checks the HTML in `site/content/` for unbalanced tags (a stray `</div>` breaks hydration) and that `pages.json`, `nav.json` and `examples.json` match the files; the `Deploy Docs` and `Release` workflows run it first. In `site/`, `bun run preview` runs the Workers build locally and `bun run deploy` deploys it; the `Deploy Docs` workflow does that on every push to `main` that changes the framework or the docs, and the `Release` workflow calls it for a new tag (secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).

## Structure

```
src/
  index.scss            entry (layer order is declared in _tokens)
  _tokens.scss          35 CSS variables, light + dark
  _base.scss            @font-face + element reset
  components/_*.scss    one partial per component
  icons/_lucide.scss    icon name -> codepoint (generated)
  icons/_flags.scss     flag codes (generated)
  js/                   one ES module per behavior
site/                   docs site: Next.js on Cloudflare Workers (content/ = the pages as HTML)
fonts/                  Google Sans + Lucide (woff2, licenses, CHECKSUMS.txt)
flags/                  flag-icons 4x3 SVGs (MIT)
vendor/tinymce/         TinyMCE 6 release files (the build joins them into dist/tinymce.min.js)
vendor/sortable/        SortableJS 1.15 (copied to dist/sortable.min.js)
vendor/vanilla-calendar/ Vanilla Calendar Pro 3.4 (copied to dist/vanilla-calendar.min.js)
vendor/chart/           Chart.js 4.5 (copied to dist/chart.min.js)
vendor/monaco/          Monaco Editor 0.57, trimmed (copied to dist/monaco/)
scripts/                build.ts, stamp-version.ts, build-vendor.ts, lucide.ts, flags.ts, tinymce.ts, monaco.ts
```

## CSS variables

```
bg  surface  subtle  fg  muted  line  accent  on-accent  overlay
ok-bg/fg  danger-bg/fg  warning-bg/fg  info-bg/fg  neutral-bg/fg
```

Components only reference these. Dark values live in one `dark-tokens` mixin (`_tokens.scss`).

## JavaScript

Vanilla ES modules, event delegation on `document`, no init functions. CSS works without JS wherever possible.

| Module                                     | Purpose                                                      |
| ------------------------------------------ | ------------------------------------------------------------ |
| `theme`                                    | light / dark / system, `tsunami.theme.get/set`               |
| `tabs`, `tree`, `sidebar`                  | roving focus, closable tabs, tree filter, collapsed sidebar  |
| `select`                                   | styled select over a native `<select>`, remote options, tags |
| `table`                                    | sorting, selection, pages, search, filters, columns, sticky  |
| `save-bar`, `slider`, `pressed`, `journey` | form dirty state, range fill, toggle groups, journey lines   |
| `image-field`, `json-viewer`               | image change/clear, foldable JSON tree with raw view         |
| `date-picker`                              | field or button that opens a calendar: date, range, presets  |
| `chart`                                    | canvas drawn by Chart.js: bar, line, doughnut, theme-aware   |
| `code-editor`                              | Monaco over textareas: languages, several files, themes      |
| `dropzone`                                 | drag and drop files onto an input, accept and size checks    |
| `toast`                                    | notifications in the top layer, `tsunami.toast()`            |
| `autocomplete`                             | suggestions for a free-text input, datalist or remote        |

## Licenses

- Code: MIT (`LICENSE`). Everything that is vendored keeps its own licence, listed below; all of them allow use under MIT.
- Google Sans: SIL OFL 1.1 (`fonts/GoogleSans-OFL.txt`).
- Lucide icons: ISC (`fonts/Lucide-LICENSE.txt`).
- Flags: flag-icons, MIT (`flags/LICENSE.txt`).
- SortableJS (drag to reorder): MIT (`vendor/sortable/LICENSE.txt`). Not part of `tsunami.min.js`; load `dist/sortable.min.js` before it when a page has a `.sortable`.
- Vanilla Calendar Pro (the date picker's calendar): MIT (`vendor/vanilla-calendar/LICENSE.txt`). Not part of `tsunami.min.js`; load `dist/vanilla-calendar.min.js` before it when a page has a `.date-picker`. Its own CSS is not shipped: `tsunami.css` draws the calendar.
- Chart.js (the chart): MIT (`vendor/chart/LICENSE.txt`). Not part of `tsunami.min.js`; load `dist/chart.min.js` before it when a page has a chart.
- Monaco Editor (the code editor): MIT (`vendor/monaco/LICENSE.txt`, `ThirdPartyNotices.txt`). Not part of `tsunami.min.js`; load `dist/monaco/vs/loader.js` before it when a page has a `.code-editor`, and load libraries that use `define` (Chart.js, Vanilla Calendar) before the loader.
- TinyMCE (the editor): 6.8.6, MIT (`vendor/tinymce/LICENSE.txt`). 6.x is the last MIT line (7 and later are GPL) and has had no release since May 2025. It is not part of `tsunami.min.js`; load `dist/tinymce.min.js` (one file, nothing else to host) before the Tsunami script when a page has an editor.
