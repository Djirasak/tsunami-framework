<div align="center">

<img src="site/public/docs/favicon.svg" width="72" height="72" alt="Tsunami logo">

# Tsunami 津波

A small, quiet CSS framework for back-office UIs.
Semantic HTML + `data-*` attributes. No runtime dependencies.
53 component pages, Lucide icons and 270 country flags.

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

```html
<link rel="stylesheet" href="dist/tsunami.min.css" />
<script src="dist/tsunami.min.js"></script>
```

Keep `fonts/` next to `dist/` (font URLs are `../fonts/...`). Load the script as a plain `<script>` in `<head>` (not `type="module"`): it applies the saved theme before the first paint, so there is no flash.

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
| Layout      | Stack, Card, Item, Page header, Stat, Chart, Sortable, Table, Timeline, Journey, JSON viewer, Accordion, Scroll area, Workspace |
| Actions     | Button, Command, Dropdown, Theme switcher                                                                                       |
| Forms       | Autocomplete, Code editor, Color field, Date picker, Dropzone, Editor, Field, Image field, Input, Input group, Select, Save bar |
| Feedback    | Alert, Badge, Empty, Loader, Skeleton, Progress, Toast                                                                          |
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

The docs are a Next.js app in `site/`, deployed to Cloudflare Workers with the OpenNext adapter. It is a separate package: its dependencies (`site/package.json`, `site/bun.lock`) never touch `dist/`. Each page is HTML in `site/content/<name>.html` (the inner HTML of `<main>`; edit that), its title and library scripts are in `site/content/pages.json`, and the sidebar and search come from `site/content/nav.json`. Pages are prerendered, with clean URLs (`/docs/button`) and plain links (full page loads), so inline `<script>` blocks in the examples run as in a static page. `bun run docs` installs the `site/` packages, builds `dist/`, copies `dist/`, `fonts/` and `flags/` into `site/public/`, and starts `next dev`. In `site/`, `bun run preview` runs the Workers build locally and `bun run deploy` deploys it; the `Deploy docs` workflow does that when a release is published (secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).

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
vendor/tinymce/         TinyMCE 8 release files (the build joins them into dist/tinymce.min.js)
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

- Code: personal project.
- Google Sans: SIL OFL 1.1 (`fonts/GoogleSans-OFL.txt`).
- Lucide icons: ISC (`fonts/Lucide-LICENSE.txt`).
- Flags: flag-icons, MIT (`flags/LICENSE.txt`).
- SortableJS (drag to reorder): MIT (`vendor/sortable/LICENSE.txt`). Not part of `tsunami.min.js`; load `dist/sortable.min.js` before it when a page has a `.sortable`.
- Vanilla Calendar Pro (the date picker's calendar): MIT (`vendor/vanilla-calendar/LICENSE.txt`). Not part of `tsunami.min.js`; load `dist/vanilla-calendar.min.js` before it when a page has a `.date-picker`. Its own CSS is not shipped: `tsunami.css` draws the calendar.
- Chart.js (the chart): MIT (`vendor/chart/LICENSE.txt`). Not part of `tsunami.min.js`; load `dist/chart.min.js` before it when a page has a chart.
- Monaco Editor (the code editor): MIT (`vendor/monaco/LICENSE.txt`, `ThirdPartyNotices.txt`). Not part of `tsunami.min.js`; load `dist/monaco/vs/loader.js` before it when a page has a `.code-editor`, and load libraries that use `define` (Chart.js, Vanilla Calendar) before the loader.
- TinyMCE (the editor): GPL-2.0-or-later or the Tiny Self-Hosted License (`vendor/tinymce/LICENSE.md`). It is not part of `tsunami.min.js`; load `dist/tinymce.min.js` (one file, nothing else to host) before the Tsunami script when a page has an editor.
