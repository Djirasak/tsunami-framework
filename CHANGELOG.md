# Changelog

All notable changes to Tsunami are listed here, in the style of [Keep a Changelog](https://keepachangelog.com).

Versions follow [semantic versioning](https://semver.org).

## [Unreleased]

## [1.1.2] - 2026-10-31

### Changed

- The backdrop behind a Dialog, Drawer, Command palette and the Sidebar drawer blurs the page as well as dimming it.
- Docs: the code blocks on the landing page are coloured like the docs pages, and each code block is as tall as the result beside it.

### Fixed

- A Dialog or Drawer no longer lines its header, body and footer up in a row while it fades out.

## [1.1.1] - 2026-10-31

### Changed

- Docs: the landing page shows an online store sales dashboard, and has sections for size, installing from the CDN with a copy button, how Tsunami compares with Pico, Bootstrap and Tailwind, accessibility, browser support and the licence.
- Docs: the overview example shows one class and one attribute, and the component count is worked out from the navigation.

## [1.1.0] - 2026-10-31

### Added

- Form validation: put `data-validate` on a form and errors show under each field.
- TypeScript declarations for `window.tsunami` and its events, built as `dist/tsunami.d.ts`.
- A shared `data-sr-only` style for text that only screen readers should read.
- The Tag input announces its count and its limit.
- The Command palette announces its result count, and its field and list have names.
- Autocomplete announces matches and marks the active option as selected.
- The Tree follows the ARIA tree pattern and works with the arrow keys. Its "no match" line is a live region.
- The Dropdown has `aria-expanded` and responds to the arrow keys, Home and End.
- The Date picker responds to Home, End, PageUp and PageDown, and ArrowDown reopens it.
- The Phone input country button has `aria-expanded`.
- Docs: Starters (three pages to copy), Theming, Events, Validation and Responsive pages, browser support on the overview, and the libraries and licences each page loads.
- The code is now licensed under MIT.

### Changed

- The light-mode accent colour is darker (`#2b7f93` to `#276f81`) so it passes WCAG AA contrast.
- Links inside paragraphs, list items and table cells are underlined.
- TinyMCE is vendored at 6.8.6, the last MIT release, instead of 8.x.
- The editor no longer takes `license_key`.
- The Command group heading is a plain `<span data-heading>` named by `aria-labelledby` instead of `role="heading"`.
- A disabled Accordion item carries `aria-disabled` on its `<summary>`.
- The Timeline note heading can be any heading from h3 to h6.
- The Sidebar drawer takes focus when it opens, and its toggles carry `aria-expanded`.
- A closed Toast hands focus back instead of dropping it.
- Disabled pagination links get `role="link"`.
- The textarea under the rich text editor is out of the tab order.
- Account menu labels start with the visible initials.

### Fixed

- Sliders set `--value` on load, including sliders added later.
- The Image field inputs have labels.
- Empty table headers carry screen-reader text.
- A Scroll area keeps an absolutely placed child, such as screen-reader text in a table header, inside it instead of widening the page.
- A code block with a long line scrolls sideways instead of widening the page.

## [1.0.1] - 2026-10-30

### Added

- Container layout: centred content with a maximum width in four sizes.
- Four full-page examples: login with one-time code, Dashboard, Settings (a four-step setup flow) and Orders (data table with search, filters, bulk actions and a delete dialog).

### Changed

- A popover Sidebar and its sibling sit in a row from 48rem, like the plain Sidebar.
- A pie, doughnut or polarArea Chart legend names the slices, not the series.

### Fixed

- In a Stepper, Enter inside a Tag input, Phone input, Time picker or Select no longer goes to the next step.

## [0.2.0] - 2026-10-30

### Added

- Ten components: Bulk action bar, Description list, Segmented control, Status dot, Copy button, Chip, Filter bar, Tag input, Stepper, Phone input and Time picker, plus One-time code (65 components in all with the Container in 1.0.1).
- `.code-block`: a pre with a copy button in the corner.
- Named date presets for the Date picker, such as `data-preset="last-7-days"`.
- The Date picker can sit inside an input group.
- Sidebar `data-keep-scroll` keeps the scroll position between page loads.

### Fixed

- One-time code boxes start on their own when they are added after the page is parsed.
- The code block copy button lines up with the first line and no longer hides a long line that scrolls under it.

## [0.1.4] - 2026-10-30

### Changed

- The landing page shows the version in the footer.

## [0.1.3] - 2026-10-30

### Fixed

- Stat cells stack one per row on a narrow screen so their lines line up.

## [0.1.2] - 2026-10-30

### Added

- A landing page with an animated sea and a dashboard made of Tsunami components.

### Changed

- Tsunami is now described as a quiet UI framework, not a CSS framework. The core (`tsunami.min.css` and `tsunami.min.js`) has no runtime dependencies. Five components load a library of their own, only on the pages that use them.
- The code editor (Monaco) loads from jsDelivr like the other library scripts.

## [0.1.1] - 2026-10-30

### Added

- Load Tsunami from jsDelivr: `dist/` is committed so each tag carries the built files.
- Page metadata for the docs: Open Graph image, sitemap and robots file.

### Changed

- The docs moved to a Next.js app on Cloudflare Workers.
- The docs pages `btn` and `empty` are now `button` and `empty-state`.

## [0.1.0] - 2026-10-30

First release. Semantic HTML and `data-*` attributes, with no runtime dependencies in the core.

### Added

- About 50 components (53 docs pages), styled with CSS variables, light and dark themes, and zero-specificity selectors.
- Lucide icons and 270 country flags.
- Toast, Autocomplete, Dropzone, Code editor (Monaco), Chart (Chart.js), Date picker, Color field, Sortable and Command palette.
- Data table with pages, search, column filters, column visibility and a sticky header.
- `.h1` to `.h6` classes that give any element the look of a heading.
- A Claude skill (`.claude/skills/tsunami`) that describes the classes and `data-*` attributes.

[Unreleased]: https://github.com/Djirasak/tsunami-framework/compare/v1.1.2...HEAD
[1.1.2]: https://github.com/Djirasak/tsunami-framework/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/Djirasak/tsunami-framework/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/Djirasak/tsunami-framework/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/Djirasak/tsunami-framework/compare/v0.2.0...v1.0.1
[0.2.0]: https://github.com/Djirasak/tsunami-framework/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/Djirasak/tsunami-framework/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Djirasak/tsunami-framework/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Djirasak/tsunami-framework/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Djirasak/tsunami-framework/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Djirasak/tsunami-framework/releases/tag/v0.1.0
