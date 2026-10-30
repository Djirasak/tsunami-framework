# Tsunami components

This file gives one short example per component. The full page for each is `site/content/<name>.html`, with every variant, the API, the events and the attributes. "Attrs" lists the attributes the component reads.

## Foundations

**Colors** (`colors`): the colour variables. Status colours come in pairs, such as `--ok-bg` for the fill and `--ok-fg` for text and icons.

**Typography** (`typography`): `.typography` on a wrapper gives long text its spacing. Attrs: `data-variant="lead|muted"` on `<p>`, and `.h1`–`.h6` on any element. `.kbd` draws a key.

```html
<div class="typography">
  <h2>Shipping</h2>
  <p data-variant="lead">Rates and zones.</p>
  <p>Press <kbd>Ctrl</kbd> + <kbd>K</kbd>.</p>
</div>
<p class="h4">Looks like an h4</p>
```

**Icons** (`icons`): Lucide icon font. Attrs: `data-size="sm|lg|xl"`.

```html
<i class="icon icon-package" aria-hidden="true"></i>
```

## Actions

**Button** (`btn`). Attrs: `data-variant="primary|secondary|ghost|danger"`, `data-size="sm|lg|xl|icon|icon-sm|icon-xs"`, `aria-pressed`. `.btn-group` joins buttons, and `[data-pressed="single|multiple"]` turns a group into toggles.

```html
<button type="button" class="btn">Cancel</button>
<button type="button" class="btn" data-variant="primary">Save</button>
<button type="button" class="btn" data-size="icon" aria-label="Delete">
  <i class="icon icon-trash-2" aria-hidden="true"></i>
</button>
```

**Command** (`command`): a search palette. Attrs: `data-label`, `data-keywords` on items, plus `data-results`, `data-filter`, `data-limit`, `data-more` and `data-shortcut`. Put it in `dialog.command-dialog[data-hotkey="mod+k"]` to open it from the keyboard.

```html
<dialog class="command-dialog" id="cmd" data-hotkey="mod+k" closedby="any">
  <div class="command" aria-label="Commands">
    <header>
      <i class="icon icon-search" aria-hidden="true"></i
      ><input
        type="text"
        placeholder="Search…"
        role="combobox"
        aria-expanded="true"
        aria-controls="cmd-list"
      />
    </header>
    <div role="menu" id="cmd-list" data-empty="No results.">
      <div role="group">
        <a role="menuitem" href="/orders" data-keywords="sales">Orders</a>
      </div>
    </div>
  </div>
</dialog>
```

**Dropdown** (`dropdown`): a menu in a popover.

```html
<button type="button" class="btn" popovertarget="dd">
  Actions <i class="icon icon-chevron-down" aria-hidden="true"></i>
</button>
<div class="dropdown" id="dd" popover>
  <button type="button" popovertarget="dd" popovertargetaction="hide">
    Edit
  </button>
  <hr />
  <button
    type="button"
    data-variant="danger"
    popovertarget="dd"
    popovertargetaction="hide"
  >
    Delete
  </button>
</div>
```

**Theme switcher** (`theme-switcher`). API: `tsunami.theme.get/set/toggle`. Event: `tsunami:themechange`.

```html
<div class="theme-switcher" role="group" aria-label="Theme">
  <button type="button" data-theme-toggle="light" aria-label="Light">
    <i class="icon icon-sun" aria-hidden="true"></i>
  </button>
  <button type="button" data-theme-toggle="dark" aria-label="Dark">
    <i class="icon icon-moon" aria-hidden="true"></i>
  </button>
  <button type="button" data-theme-toggle="system" aria-label="System">
    <i class="icon icon-monitor" aria-hidden="true"></i>
  </button>
</div>
```

## Feedback

**Alert** (`alert`). Attrs: `data-variant="ok|warning|danger|info"`. Use `role="alert"` for errors and `role="status"` for anything else.

```html
<div class="alert" data-variant="warning" role="status">
  <i class="icon icon-triangle-alert" aria-hidden="true"></i
  ><strong>Low stock</strong>
  <p>3 variants are below their reorder point.</p>
</div>
```

**Badge** (`badge`). Attrs: `data-variant="outline|ok|warning|danger|info"`, `data-size="lg"`.

```html
<span class="badge" data-variant="ok">Paid</span>
```

**Empty state** (`empty`).

```html
<section class="empty">
  <header>
    <figure><i class="icon icon-package" aria-hidden="true"></i></figure>
    <h3>No products yet</h3>
    <p>Add your first product.</p>
  </header>
  <footer>
    <div>
      <button type="button" class="btn" data-variant="primary">
        Add product
      </button>
    </div>
  </footer>
</section>
```

**Loader** (`loader`). Attrs: `data-size`. Put `aria-busy="true"` on the region that is loading.

```html
<span class="loader" role="status" aria-label="Loading"></span>
```

**Progress** (`progress`). Attrs: `data-size`, `data-variant`.

```html
<div
  class="progress"
  role="progressbar"
  aria-label="Uploading"
  aria-valuenow="66"
  aria-valuemin="0"
  aria-valuemax="100"
>
  <span style="width: 66%"></span>
</div>
```

**Skeleton** (`skeleton`). Attrs: `data-variant="circle"`.

```html
<span class="skeleton" style="width: 12rem" aria-hidden="true"></span>
```

**Toast** (`toast`). API: `tsunami.toast("Saved")` or `tsunami.toast({ title, text, variant, duration, action: { label, onClick }, id })`, and `tsunami.toast.clear()`. Events: `tsunami:toast`, `tsunami:toastclose`.

```html
<button
  type="button"
  class="btn"
  data-toast="Order archived"
  data-toast-variant="ok"
>
  Archive
</button>
```

## Forms

**Field** (`field`): a label, a control and a hint. `.field-group` is a borderless fieldset, and a plain `<div>` inside it lays out columns. Checkbox, radio, `role="switch"` and `input.slider` all go in a `.field`. Attrs: `aria-invalid="true"` on the control (error text `<small role="alert">`), `data-variant="card"` on a label field.

```html
<div class="field">
  <label for="email">Email</label
  ><input id="email" type="email" aria-describedby="email-hint" /><small
    id="email-hint"
    >For receipts.</small
  >
</div>
<div class="field">
  <input id="open" type="checkbox" role="switch" checked /><label for="open"
    >Store open</label
  >
</div>
<input
  type="range"
  class="slider"
  min="0"
  max="100"
  value="40"
  aria-label="Volume"
/>
```

**Input** (`input`). Attrs: `data-size="sm|lg"`, `data-variant`.

```html
<input
  class="input"
  type="search"
  placeholder="Search orders"
  aria-label="Search orders"
/>
```

**Input group** (`input-group`): one box around an input and its leading or trailing `<span>` parts.

```html
<div class="input-group">
  <span><i class="icon icon-search" aria-hidden="true"></i></span
  ><input type="search" aria-label="Search" /><span>12 results</span>
</div>
```

**Select** (`select`): a styled control around a native `<select>`. Attrs: `data-search`, `data-input`, `data-tags`, `data-url`, `data-placeholder`, `data-size`, `data-empty`. You can also put `class="select"` on a bare `<select>`.

```html
<div class="select" data-search data-placeholder="Choose a country">
  <select name="country">
    <option value="TH">Thailand</option>
    <option value="JP">Japan</option>
  </select>
</div>
```

**Autocomplete** (`autocomplete`): suggestions for a free-text input. Attrs: `data-url`, `data-min-length`, `data-limit`. API: `tsunami.autocomplete.mount(el, { source })`. Event: `tsunami:autocomplete`.

```html
<div class="autocomplete">
  <input class="input" name="city" list="cities" aria-label="City" /><datalist
    id="cities"
  >
    <option value="Bangkok"></option>
    <option value="Berlin"></option>
  </datalist>
</div>
```

**Color field** (`color-field`): pairs a colour picker with a text input. Attrs: `data-alpha` accepts rgba and #rrggbbaa.

```html
<div class="input-group color-field">
  <span><input type="color" aria-label="Pick a colour" /></span
  ><input type="text" name="color" value="#595d69" aria-label="Colour" />
</div>
```

**Date picker** (`date-picker`): needs `dist/vanilla-calendar.min.js`. Attrs: `data-mode="range"`, `data-format="long|medium"`, `data-min`, `data-max`, `data-placeholder`, and `[data-presets]` buttons. API: `el.value`, `open()`, `close()`. Event: `change` with `{ value, dates }`.

```html
<div class="date-picker">
  <input
    class="input"
    type="text"
    name="expires"
    placeholder="YYYY-MM-DD"
    aria-label="Expiry"
  />
  <div data-popover aria-hidden="true"></div>
</div>
```

**Dropzone** (`dropzone`). Attrs: `accept`, `multiple`, and `data-max-size` (bytes) on `.dropzone`; in a `.field[data-invalid]` the `role="alert"` text shows. Events: `change`, and `rejected` with `{ rejected: [{ file, reason }] }`.

```html
<div class="dropzone">
  <input
    type="file"
    name="images"
    accept="image/*"
    multiple
    aria-label="Choose images"
  /><i class="icon icon-upload" aria-hidden="true"></i
  ><span>Drop images or click</span>
</div>
```

**Image field** (`image-field`): a preview with change and clear buttons.

```html
<div class="image-field">
  <img src="logo.svg" alt="Store icon" /><i
    class="icon icon-image"
    aria-hidden="true"
  ></i>
  <button
    type="button"
    class="btn"
    data-size="icon-xs"
    data-change
    aria-label="Change"
  >
    <i class="icon icon-pencil" aria-hidden="true"></i>
  </button>
  <button
    type="button"
    class="btn"
    data-size="icon-xs"
    data-clear
    aria-label="Clear"
  >
    <i class="icon icon-x" aria-hidden="true"></i></button
  ><input type="file" name="icon" accept="image/*" />
</div>
```

**Editor** (`editor`): a rich text editor on TinyMCE, which needs `dist/tinymce.min.js`. If Monaco is loaded too, the source button opens a code editor. Attrs: `data-toolbar`, `data-min-height`, `data-max-height`, `data-menubar`, `data-statusbar`. API: `tsunami.editor.mount/get/destroy`.

```html
<textarea class="editor" name="description" aria-label="Description">
<p>Hello</p></textarea>
```

**Code editor** (`code-editor`): Monaco, which needs `dist/monaco/vs/loader.js`. Attrs: `data-language="html|css|scss|javascript|json"`. Several textareas in one box are several files, and the one without `hidden` is shown. API: `box.editor`, `tsunami.codeEditor.mount/get/destroy`.

```html
<div class="code-editor" data-language="html" style="height: 12rem">
  <textarea name="template" aria-label="Template">
&lt;h1&gt;Hi&lt;/h1&gt;</textarea>
</div>
```

**Save bar** (`save-bar`): shows while the form differs from its saved values. Attrs: `data-form`, `data-warn-on-leave`, `hidden`. API: `tsunami.saveBar.check/markClean`. Events: `tsunami:dirty`, `tsunami:clean`.

```html
<div
  class="save-bar"
  data-form="product"
  role="region"
  aria-label="Unsaved changes"
  hidden
>
  <p>Unsaved changes</p>
  <div>
    <button type="reset" form="product" class="btn" data-variant="ghost">
      Discard</button
    ><button type="submit" form="product" class="btn" data-variant="primary">
      Save
    </button>
  </div>
</div>
```

## Layout

**Stack** (`stack`). Attrs: `data-direction="row"`, `data-gap="sm|lg"`.

```html
<div class="stack" data-direction="row" data-gap="sm">…</div>
```

**Card** (`card`): its direct children are sections divided by lines. A header holds an `h2`, a `p` and an `aside` of actions. Attrs: `data-direction="row"`, `data-variant`.

```html
<article class="card">
  <header>
    <h2>Order #1042</h2>
    <p>Placed Oct 12</p>
    <aside>
      <button type="button" class="btn" data-size="sm">Edit</button>
    </aside>
  </header>
  <section><p>3 items, $74.00.</p></section>
  <footer>
    <button type="button" class="btn" data-variant="primary">Fulfil</button>
  </footer>
</article>
```

**Item** (`item`): a row with a figure, a section and an aside. `.item-group` stacks rows. Attrs: `data-variant="outline|muted"`, `data-size="sm|xs"`.

```html
<article class="item" data-variant="outline">
  <section>
    <h3>Standard shipping</h3>
    <p>3–5 days</p>
  </section>
  <aside><button type="button" class="btn" data-size="sm">Edit</button></aside>
</article>
```

**Page header** (`page-header`).

```html
<header class="page-header">
  <h1>Orders</h1>
  <div><a href="#" class="btn" data-variant="primary">New order</a></div>
</header>
```

**Stat** (`stat`): `.stat-group` lays stats in a row. Attrs: `data-trend="up|down"`.

```html
<div class="stat">
  <span>New orders</span><strong>128</strong
  ><span data-trend="up"
    ><i class="icon icon-arrow-up" aria-hidden="true"></i>12.5%</span
  >
</div>
```

**Table** (`table`). Attrs: `data-align="end"`, `data-truncate`, `aria-sort` with a button in the `th`, a select checkbox in the first cell of each row, `data-page-size`, `data-sticky` (header) or `data-sticky="both"` (header and first column). Data table controls take the table id: `nav.pagination[data-pagination-for]`, `[data-table-info]`, `select[data-table-page-size]`, `input[data-table-search]`, `thead tr[data-filters]`, `.dropdown[data-table-columns]`, plus `data-table-remember`. API: `tsunami.table.refresh/page/filter`. Events: `tsunami:sort`, `tsunami:select`, `tsunami:tablechange`.

```html
<div class="scroll-area" tabindex="0">
  <table class="table" id="orders" data-page-size="10">
    <thead>
      <tr>
        <th scope="col" aria-sort="none">
          <button type="button">Order</button>
        </th>
        <th scope="col" data-align="end">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">#1042</th>
        <td data-align="end">$74.00</td>
      </tr>
    </tbody>
  </table>
</div>
<input
  class="input"
  type="search"
  data-table-search="orders"
  aria-label="Search orders"
/>
<nav class="pagination" data-pagination-for="orders" aria-label="Pages"></nav>
```

**Chart** (`chart`): Chart.js, which needs `dist/chart.min.js`. Series colours come from the colour variables. API: `tsunami.chart(selector, { type, data, series, legend, options })`. Event: `tsunami:chartready`.

```html
<div class="chart">
  <canvas id="sales" aria-label="Sales by month"></canvas>
</div>
<script>
  tsunami.chart("#sales", {
    type: "line",
    data: [
      { label: "Jan", sales: 4200 },
      { label: "Feb", sales: 5100 },
    ],
    series: { sales: { label: "Sales", surface: true } },
  });
</script>
```

**Sortable** (`sortable`): drag to reorder, on SortableJS, which needs `dist/sortable.min.js`. Attrs: `data-id`, `data-disabled`, and a `.sortable-handle` button (whose arrow keys also move the row). Event: `tsunami:reorder`.

```html
<div class="item-group sortable">
  <article class="item" data-variant="outline" data-id="color">
    <button type="button" class="sortable-handle" aria-label="Reorder Color">
      <i class="icon icon-grip-vertical" aria-hidden="true"></i>
    </button>
    <section><h3>Color</h3></section>
  </article>
</div>
```

**Timeline** (`timeline`).

```html
<ol class="timeline">
  <li>
    Payment captured <time datetime="2026-10-29T18:41">Oct 29, 18:41</time>
  </li>
</ol>
```

**Journey** (`journey`): steps with picked pages joined by a line. Colours: `--journey-color`, `--journey-ink`. Attrs: `aria-pressed` on a page button.

```html
<div class="journey" role="group" aria-label="Store journey">
  <ol>
    <li>
      <header><span>Step 1</span><strong>2,400 sessions</strong></header>
      <ul>
        <li>
          <button type="button" aria-pressed="true" value="/">
            <span>Home</span><data value="1800">1,800</data>
          </button>
        </li>
      </ul>
    </li>
  </ol>
</div>
```

**JSON viewer** (`json-viewer`). Attrs: `data-view="parsed|raw"`, `data-collapsed`. API: `tsunami.jsonViewer.expand/collapse/view/value`.

```html
<div class="json-viewer">
  <textarea class="input" readonly aria-label="Payload">
{"amount": 12900, "currency": "USD"}</textarea>
</div>
```

**Accordion** (`accordion`): built on `details`. Give the items one `name` so only one opens at a time.

```html
<div class="accordion">
  <details name="faq" open>
    <summary>How long is shipping?</summary>
    <p>2–3 business days.</p>
  </details>
</div>
```

**Scroll area** (`scroll-area`): give it a height or max height and `tabindex="0"`.

```html
<div
  class="scroll-area"
  tabindex="0"
  aria-label="History"
  style="height: 12rem"
>
  …
</div>
```

**Workspace** (`workspace`): a full-screen editor shell. The header holds actions, an `aside[popover]` is the panel and `main` is the work area.

```html
<div class="workspace">
  <header>
    <h1>Summer theme</h1>
    <button type="button" class="btn" data-variant="primary" data-size="sm">
      Save
    </button>
  </header>
  <aside id="ws-panel" popover aria-label="Sections">…</aside>
  <main>…</main>
</div>
```

## Media

**Avatar** (`avatar`): `.avatar-group` overlaps avatars. Attrs: `data-size="sm|lg"`, `data-variant="circle"`, `data-status`.

```html
<span class="avatar"
  ><img src="emma.jpg" alt="Emma Wilson" /><span>EW</span></span
>
```

**Flags** (`flags`): 270 countries named by ISO code. Attrs: `data-size`.

```html
<span class="flag flag-jp" role="img" aria-label="Japan"></span>
```

## Navigation

**Breadcrumb** (`breadcrumb`).

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><span aria-current="page">#1042</span></li>
  </ol>
</nav>
```

**Link** (`link`). Attrs: `data-variant="muted|primary"`, `data-weight`.

```html
<a href="#" class="link" data-variant="muted">Learn more</a>
```

**Pagination** (`pagination`). Attrs: `aria-current="page"`, `aria-disabled`, `data-size`.

```html
<nav class="pagination" aria-label="Pages">
  <ul>
    <li><a href="?p=1">1</a></li>
    <li><a href="?p=2" aria-current="page">2</a></li>
  </ul>
</nav>
```

**Sidebar** (`sidebar`): the app navigation. Attrs: `data-collapsed="true"`, and `command="--toggle-collapsed"` on a button.

```html
<aside class="sidebar" id="nav">
  <nav aria-label="Main">
    <section>
      <div role="group">
        <ul>
          <li>
            <a href="/" aria-current="page"
              ><i class="icon icon-house" aria-hidden="true"></i
              ><span>Home</span></a
            >
          </li>
        </ul>
      </div>
    </section>
  </nav>
</aside>
```

**Subnav** (`subnav`): a secondary list of links.

```html
<nav class="subnav" aria-label="Settings">
  <a href="#" aria-current="page">General</a><a href="#">Payments</a>
</nav>
```

**Tabs** (`tabs`). Attrs: `data-variant`, `data-size`, `aria-orientation="vertical"`, and `[data-close]` in a tab. Event: `tsunami:closetab`.

```html
<div class="tabs">
  <div role="tablist" aria-label="Account">
    <button
      type="button"
      role="tab"
      id="t1"
      aria-selected="true"
      aria-controls="p1"
    >
      Account</button
    ><button
      type="button"
      role="tab"
      id="t2"
      aria-selected="false"
      aria-controls="p2"
      tabindex="-1"
    >
      Password
    </button>
  </div>
  <div role="tabpanel" id="p1" aria-labelledby="t1" tabindex="0">…</div>
  <div role="tabpanel" id="p2" aria-labelledby="t2" tabindex="0" hidden>…</div>
</div>
```

**Tree** (`tree`): a file tree built on `details`. An `input[type=search]` inside it filters, and a `<p>` is the no-match line.

```html
<nav class="tree" aria-label="Files">
  <ul>
    <li>
      <details open>
        <summary>
          <i class="icon icon-folder" aria-hidden="true"></i
          ><span>layouts</span>
        </summary>
        <ul>
          <li>
            <a href="#" aria-current="page"
              ><i class="icon icon-file" aria-hidden="true"></i
              ><span>base.html</span></a
            >
          </li>
        </ul>
      </details>
    </li>
  </ul>
</nav>
```

## Overlays

**Dialog** (`dialog`): a native modal. Attrs: `closedby="any"`, `data-size="sm|lg|xl"`, and `role="alertdialog"` for confirms.

```html
<button type="button" class="btn" commandfor="dlg" command="show-modal">
  Edit
</button>
<dialog class="dialog" id="dlg" aria-labelledby="dlg-t" closedby="any">
  <header>
    <h2 id="dlg-t">Edit customer</h2>
    <button
      type="button"
      class="btn"
      data-variant="ghost"
      data-size="icon"
      commandfor="dlg"
      command="close"
      aria-label="Close"
    >
      <i class="icon icon-x" aria-hidden="true"></i>
    </button>
  </header>
  <div class="stack">…</div>
  <footer>
    <button type="button" class="btn" commandfor="dlg" command="close">
      Cancel</button
    ><button type="button" class="btn" data-variant="primary">Save</button>
  </footer>
</dialog>
```

**Drawer** (`drawer`): a dialog that slides in from the side. Attrs: `data-side="right|left|top|bottom"`.

```html
<dialog
  class="drawer"
  id="filters"
  data-side="right"
  aria-labelledby="f-t"
  closedby="any"
>
  <header><h2 id="f-t">Filters</h2></header>
  <div class="stack">…</div>
</dialog>
```

**Popover** (`popover`): a panel of content anchored to its button.

```html
<button type="button" class="btn" popovertarget="fees">Fees</button>
<div class="popover" id="fees" popover>
  <header>
    <h3>Card fees</h3>
    <p>Per transaction.</p>
  </header>
  <p><strong>2.9% + $0.30</strong></p>
</div>
```

**Tooltip** (`tooltip`): set by an attribute on any focusable element.

```html
<button
  type="button"
  class="btn"
  data-size="icon"
  data-tooltip="Duplicate"
  aria-label="Duplicate"
>
  <i class="icon icon-copy" aria-hidden="true"></i>
</button>
```
