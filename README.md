<div align="center">

<img src="docs/favicon.svg" width="72" height="72" alt="Tsunami logo">

# Tsunami 津波

A small, quiet CSS framework for back-office UIs.
Semantic HTML + `data-*` attributes. No runtime dependencies.
43 component pages, Lucide icons and 270 country flags.

</div>

## Why

- **Native first.** `dialog`, `popover`, `details`, `button`. JS only where HTML can't do the job.
- **Zero specificity.** Every selector sits in `@layer components` inside `:where()`, so your CSS always wins.
- **Light / dark.** Tokens are CSS custom properties, so the theme switches at runtime with no flash.
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

| Group       | Components                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Foundations | Colors, Typography (`.typography`), Icons (Lucide)                                                             |
| Layout      | Stack, Card, Item, Page header, Stat, Table, Timeline, Journey, JSON viewer, Accordion, Scroll area, Workspace |
| Actions     | Button, Dropdown, Theme switcher                                                                               |
| Forms       | Field, Image field, Input, Input group, Select, Save bar                                                       |
| Feedback    | Alert, Badge, Empty, Loader, Skeleton, Progress                                                                |
| Media       | Avatar, Flags                                                                                                  |
| Navigation  | Breadcrumb, Link, Pagination, Sidebar, Subnav, Tabs, Tree                                                      |
| Overlays    | Dialog, Drawer, Popover, Tooltip                                                                               |

Every component has a docs page with live examples, a Code tab and an attributes table.

## Develop

Requires [Bun](https://bun.sh) `>=1.4.3`.

```sh
bun install --frozen-lockfile
bun run build      # dist/tsunami(.min).css + dist/tsunami(.min).js
bun run dev        # sass --watch -> dist/tsunami.css
bun run serve      # docs at http://localhost:5477/docs/
bun run lint       # eslint src/js
bun run audit      # bun audit
```

Docs are plain HTML in `docs/` with clean URLs (`/docs/btn`); there is no build step for them. Only `/docs`, `/dist`, `/fonts` and `/flags` are served, on `127.0.0.1`.

## Structure

```
src/
  index.scss            entry (layer order is declared in _tokens)
  _tokens.scss          35 semantic tokens, light + dark
  _base.scss            @font-face + element reset
  components/_*.scss    one partial per component
  icons/_lucide.scss    icon name -> codepoint (generated)
  icons/_flags.scss     flag codes (generated)
  js/                   one ES module per behavior
docs/                   docs site (plain HTML)
fonts/                  Google Sans + Lucide (woff2, licenses, CHECKSUMS.txt)
flags/                  flag-icons 4x3 SVGs (MIT)
vendor/tinymce/         TinyMCE 8 release files (the build joins them into dist/tinymce.min.js)
scripts/                serve.ts, stamp-version.ts, bundle-tinymce.ts, lucide.ts, flags.ts, tinymce.ts
```

## Tokens

```
bg  surface  subtle  fg  muted  line  accent  on-accent  overlay
ok-bg/fg  danger-bg/fg  warning-bg/fg  info-bg/fg  neutral-bg/fg
```

Components only reference these. Dark values live in one `dark-tokens` mixin.

## JavaScript

Vanilla ES modules, event delegation on `document`, no init functions. CSS works without JS wherever possible.

| Module                                     | Purpose                                                      |
| ------------------------------------------ | ------------------------------------------------------------ |
| `theme`                                    | light / dark / system, `tsunami.theme.get/set`               |
| `tabs`, `tree`, `sidebar`                  | roving focus, closable tabs, tree filter, collapsed sidebar  |
| `select`                                   | styled select over a native `<select>`, remote options, tags |
| `table`                                    | sorting and row selection                                    |
| `save-bar`, `slider`, `pressed`, `journey` | form dirty state, range fill, toggle groups, journey lines   |
| `image-field`, `json-viewer`               | image change/clear, foldable JSON tree with raw view         |

## Licenses

- Code: personal project.
- Google Sans: SIL OFL 1.1 (`fonts/GoogleSans-OFL.txt`).
- Lucide icons: ISC (`fonts/Lucide-LICENSE.txt`).
- Flags: flag-icons, MIT (`flags/LICENSE.txt`).
- TinyMCE (the editor): GPL-2.0-or-later or the Tiny Self-Hosted License (`vendor/tinymce/LICENSE.md`). It is not part of `tsunami.min.js`; load `dist/tinymce.min.js` (one file, nothing else to host) before the Tsunami script when a page has an editor.
