import { expect, test, type Locator, type Page } from "@playwright/test";
import { open, watchErrors } from "./helpers";

// Record a custom event on `selector` before the action; read the log later.
async function record(page: Page, selector: string, type: string) {
  await page.evaluate(
    ([sel, t]) => {
      const w = window as unknown as { __ev?: Record<string, unknown[]> };
      w.__ev ??= {};
      w.__ev[t] = [];
      document
        .querySelector(sel)!
        .addEventListener(t, (e) =>
          w.__ev![t].push((e as CustomEvent).detail ?? null),
        );
    },
    [selector, type],
  );
}
const events = (page: Page, type: string) =>
  page.evaluate(
    (t) =>
      (window as unknown as { __ev: Record<string, unknown[]> }).__ev[t],
    type,
  );

// The first cell text of every visible body row.
const visibleRows = (table: Locator) =>
  table.locator("tbody tr:not([hidden])");

test.describe("Validation", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/validation"));

  const form = (page: Page) => page.locator("form[data-validate]").first();

  test("an error shows under the field on blur, with ARIA", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const email = page.getByLabel("Email");
    await email.focus();
    await page.keyboard.press("Tab");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const err = form(page).locator("[data-error]").first();
    await expect(err).toHaveText("Enter an email like name@example.com");
    await expect(err).toHaveAttribute("role", "alert");
    const id = await err.getAttribute("id");
    const described = (await email.getAttribute("aria-describedby")) ?? "";
    expect(described.split(/\s+/)).toContain(id);
    // the hint the author wrote stays
    expect(described.split(/\s+/)).toContain("vd-email-hint");
    errors.expectNone();
  });

  test("fixing a field clears its error", async ({ page }) => {
    const email = page.getByLabel("Email");
    await email.focus();
    await page.keyboard.press("Tab");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await email.fill("emma@example.com");
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAttribute("aria-describedby", "vd-email-hint");
  });

  // React, Vue and Svelte attach onsubmit to the form or its root; a form that
  // failed the check must not reach it. Tsunami checks in the capture phase.
  test("a form that fails the check never reaches the app's submit handler", async ({
    page,
  }) => {
    await form(page).evaluate((f) => {
      (window as unknown as { seen: number }).seen = 0;
      f.addEventListener("submit", (e) => {
        (window as unknown as { seen: number }).seen++;
        e.preventDefault();
      });
    });
    await form(page).getByRole("button", { name: "Send" }).click();
    await expect(page.getByLabel("Email")).toBeFocused();
    expect(await page.evaluate(() => (window as unknown as { seen: number }).seen)).toBe(0);
    await page.getByLabel("Email").fill("a@b.co");
    await page.getByLabel("ZIP code").fill("12345");
    await page.getByLabel("I accept the terms").check();
    await form(page).getByRole("button", { name: "Send" }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { seen: number }).seen)).toBe(1);
  });

  test("submitting with errors focuses the first invalid field", async ({
    page,
  }) => {
    await page.getByLabel("ZIP code").fill("12345");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("ZIP code")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("I accept the terms")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("Reset clears every error", async ({ page }) => {
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.getByRole("button", { name: "Reset" }).first().click();
    for (const label of ["Email", "ZIP code", "I accept the terms"])
      await expect(page.getByLabel(label)).not.toHaveAttribute(
        "aria-invalid",
        "true",
      );
    await expect(form(page).locator("[data-error]:visible")).toHaveCount(0);
  });

  test("tsunami.validate.check and clear", async ({ page }) => {
    const zip = page.getByLabel("ZIP code");
    const valid = await page.evaluate(() =>
      (window as any).tsunami.validate.check(
        document.getElementById("vd-zip"),
      ),
    );
    expect(valid).toBe(false);
    await expect(zip).toHaveAttribute("aria-invalid", "true");
    await page.evaluate(() =>
      (window as any).tsunami.validate.clear(
        document.getElementById("vd-zip"),
      ),
    );
    await expect(zip).not.toHaveAttribute("aria-invalid", "true");
    await zip.fill("10110");
    expect(
      await page.evaluate(() =>
        (window as any).tsunami.validate.check(
          document.getElementById("vd-zip"),
        ),
      ),
    ).toBe(true);
  });
});

test.describe("Table", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/table"));

  test("a header button sorts and sets aria-sort", async ({ page }) => {
    const table = page.locator("#sort-demo");
    const product = table.getByRole("columnheader", { name: "Product" });
    const names = () =>
      table.locator("tbody tr td:first-child").allTextContents();
    await product.getByRole("button").click();
    await expect(product).toHaveAttribute("aria-sort", "ascending");
    expect(await names()).toEqual([
      "Canvas bag",
      "Crew tee",
      "Magic Pen",
      "Timeless Watch",
    ]);
    await product.getByRole("button").click();
    await expect(product).toHaveAttribute("aria-sort", "descending");
    expect((await names())[0]).toBe("Timeless Watch");
    // the other column goes back to none
    await expect(
      table.getByRole("columnheader", { name: "Sold" }),
    ).toHaveAttribute("aria-sort", "none");
  });

  test("dates sort by data-sort-value", async ({ page }) => {
    const table = page.locator("#sort-demo");
    await table.getByRole("button", { name: "Added" }).click();
    await expect(
      table.locator("tbody tr").first().locator("td").first(),
    ).toHaveText("Magic Pen");
  });

  test("the select-all box selects rows and shows indeterminate", async ({
    page,
  }) => {
    const table = page.locator("#select-demo");
    const all = table.getByRole("checkbox", { name: "Select all orders" });
    await record(page, "#select-demo", "tsunami:select");
    // one of three starts selected: indeterminate
    expect(await all.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(
      true,
    );
    await all.check();
    await expect(table.locator("tbody tr[aria-selected=true]")).toHaveCount(3);
    expect(await all.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(
      false,
    );
    await expect(page.locator("#select-count")).toHaveText("3 selected");
    await all.uncheck();
    await expect(table.locator("tbody tr[aria-selected=true]")).toHaveCount(0);
    await expect(page.locator("#select-count")).toHaveText("0 selected");
    // a single row box puts the header back to indeterminate
    await table.getByRole("checkbox", { name: "Select order 110962" }).check();
    await expect(
      table.getByRole("row", { name: /110962/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(await all.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(
      true,
    );
    const log = (await events(page, "tsunami:select")) as { count: number }[];
    expect(log.map((d) => d.count)).toEqual([3, 0, 1]);
  });

  test("the filter row narrows the rows", async ({ page }) => {
    const table = page.locator("#filter-demo");
    const before = await visibleRows(table).count();
    await table.getByLabel("Filter by status").selectOption("Refunded");
    await expect(visibleRows(table)).not.toHaveCount(before);
    const statuses = await visibleRows(table)
      .locator("td:nth-child(3)")
      .allTextContents();
    expect(statuses.length).toBeGreaterThan(0);
    for (const s of statuses) expect(s.trim()).toBe("Refunded");
    await table.getByLabel("Filter by status").selectOption("");
    await expect(visibleRows(table)).toHaveCount(before);
    await table.getByLabel("Filter by customer").fill("zoe");
    const names = () =>
      visibleRows(table).locator("td:nth-child(2)").allTextContents();
    await expect
      .poll(async () => {
        const all = await names();
        return all.length > 0 && all.every((n) => /zoe/i.test(n));
      })
      .toBe(true);
  });

  test("pagination moves between pages", async ({ page }) => {
    const table = page.locator("#pg-demo");
    const nav = page.getByRole("navigation", { name: "Product pages" });
    await record(page, "#pg-demo", "tsunami:tablechange");
    await expect(visibleRows(table)).toHaveCount(5);
    const first = await visibleRows(table).first().textContent();
    await nav.getByRole("button", { name: "Next page" }).click();
    await expect(nav.getByRole("button", { name: "2", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(visibleRows(table)).toHaveCount(5);
    expect(await visibleRows(table).first().textContent()).not.toBe(first);
    await expect(
      nav.getByRole("button", { name: "Previous page" }),
    ).toBeEnabled();
    await nav.getByRole("button", { name: "Previous page" }).click();
    await expect(nav.getByRole("button", { name: "1", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await visibleRows(table).first().textContent()).toBe(first);
    expect((await events(page, "tsunami:tablechange")).length).toBeGreaterThan(0);
  });
});

test.describe("Filter bar", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/filter-bar"));

  test("removing a chip fires filterchange with the rest", async ({
    page,
  }) => {
    const bar = page.locator("#fb1");
    await record(page, "#fb1", "tsunami:filterchange");
    await bar.getByRole("button", { name: "Remove Last 30 days" }).click();
    await expect(bar.locator(".chip")).toHaveCount(2);
    await expect(bar.getByText("Last 30 days")).toHaveCount(0);
    expect(await events(page, "tsunami:filterchange")).toEqual([
      { values: ["status:paid", "country:th"] },
    ]);
    await expect(page.locator("#fb1-out")).toHaveText(
      "Filters left: status:paid, country:th",
    );
  });

  test("a chip can be removed with the keyboard", async ({ page }) => {
    const bar = page.locator("#fb1");
    await bar.getByRole("button", { name: "Remove Status: Paid" }).focus();
    await page.keyboard.press("Enter");
    await expect(bar.locator(".chip")).toHaveCount(2);
  });

  test("Clear all removes every chip and fires once", async ({ page }) => {
    const bar = page.locator("#fb1");
    await record(page, "#fb1", "tsunami:filterchange");
    await bar.getByRole("button", { name: "Clear all" }).click();
    await expect(bar.locator(".chip")).toHaveCount(0);
    await expect(bar.getByRole("button", { name: "Clear all" })).toBeHidden();
    expect(await events(page, "tsunami:filterchange")).toEqual([
      { values: [] },
    ]);
    await expect(page.locator("#fb1-out")).toHaveText("Filters left: none");
  });
});

test.describe("Bulk action bar", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/bulk-bar"));

  test("shows with selected rows, counts and clears", async ({ page }) => {
    const bar = page.locator('.bulk-bar[data-table="bulk-demo"]');
    const table = page.locator("#bulk-demo");
    await expect(bar).toHaveAttribute("data-active", "false");
    await table.getByRole("checkbox", { name: "Select order 110963" }).check();
    await expect(bar).toHaveAttribute("data-active", "true");
    await expect(bar.locator("[data-bulk-count]")).toHaveText("1");
    await table.getByRole("checkbox", { name: "Select order 110961" }).check();
    await expect(bar.locator("[data-bulk-count]")).toHaveText("2");
    await bar.getByRole("button", { name: "Clear" }).click();
    await expect(bar).toHaveAttribute("data-active", "false");
    await expect(bar.locator("[data-bulk-count]")).toHaveText("0");
    await expect(table.getByRole("checkbox", { checked: true })).toHaveCount(0);
  });

  test("select-all counts every row", async ({ page }) => {
    const bar = page.locator('.bulk-bar[data-table="bulk-demo"]');
    await page
      .locator("#bulk-demo")
      .getByRole("checkbox", { name: "Select all orders" })
      .check();
    await expect(bar.locator("[data-bulk-count]")).toHaveText("4");
    await expect(bar).toHaveAttribute("data-active", "true");
  });

  test("an action reads the selected rows", async ({ page }) => {
    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.locator("#bulk-log")).toHaveText(
      "Exported #110962, #110961",
    );
  });
});

test.describe("Save bar", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/save-bar"));

  test("appears when a field changes and Discard hides it", async ({
    page,
  }) => {
    const bar = page.locator('.save-bar[data-form="sb-form"]');
    const title = page.getByLabel("Product title", { exact: true }).first();
    await expect(bar).toBeHidden();
    await title.fill("T-shirt, long sleeve");
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute("data-dirty", "true");
    await bar.getByRole("button", { name: "Discard" }).click();
    await expect(bar).toBeHidden();
    await expect(title).toHaveValue("T-shirt");
  });

  test("typing the saved value back makes it clean again", async ({
    page,
  }) => {
    const bar = page.locator('.save-bar[data-form="sb-form"]');
    const title = page.locator("#sb-title");
    await title.fill("x");
    await expect(bar).toBeVisible();
    await title.fill("T-shirt");
    await expect(bar).toBeHidden();
  });

  test("a checkbox change is seen", async ({ page }) => {
    const bar = page.locator('.save-bar[data-form="sb-form"]');
    await page.getByLabel("Visible in store").check();
    await expect(bar).toBeVisible();
    await page.getByLabel("Visible in store").uncheck();
    await expect(bar).toBeHidden();
  });

  test("dirty and clean events fire, markClean accepts the values", async ({
    page,
  }) => {
    await record(page, "#sb-events", "tsunami:dirty");
    await record(page, "#sb-events", "tsunami:clean");
    const bar = page.locator('.save-bar[data-form="sb-events"]');
    await page.locator("#sb-events-title").fill("Other lamp");
    await expect(page.locator("#sb-events-result")).toHaveText(
      "dirty: unsaved changes",
    );
    await expect(bar).toBeVisible();
    expect((await events(page, "tsunami:dirty")).length).toBe(1);
    await page.getByRole("button", { name: "markClean()" }).click();
    await expect(bar).toBeHidden();
    await expect(page.locator("#sb-events-result")).toHaveText(
      "clean: matches the saved values",
    );
    expect((await events(page, "tsunami:clean")).length).toBe(1);
  });
});

test.describe("Sortable", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/sortable"));

  const labels = (list: Locator) => list.locator("h3").allTextContents();

  test("ArrowDown and ArrowUp on a handle move the row", async ({ page }) => {
    const list = page.locator("#so-main");
    await record(page, "#so-main", "tsunami:reorder");
    const handle = list.getByRole("button", { name: "Reorder Color" });
    await handle.focus();
    await page.keyboard.press("ArrowDown");
    expect(await labels(list)).toEqual(["Size", "Color", "Material", "Price"]);
    await expect(handle).toBeFocused();
    await page.keyboard.press("ArrowDown");
    expect(await labels(list)).toEqual(["Size", "Material", "Color", "Price"]);
    await page.keyboard.press("ArrowUp");
    expect(await labels(list)).toEqual(["Size", "Color", "Material", "Price"]);
    const log = (await events(page, "tsunami:reorder")) as {
      id: string;
      oldIndex: number;
      newIndex: number;
    }[];
    expect(log.map((d) => [d.id, d.oldIndex, d.newIndex])).toEqual([
      ["color", 0, 1],
      ["color", 1, 2],
      ["color", 2, 1],
    ]);
    expect(
      await page.evaluate(() =>
        (window as any).tsunami.sortable.toArray(
          document.getElementById("so-main"),
        ),
      ),
    ).toEqual(["size", "color", "material", "price"]);
  });

  test("the first row cannot move up", async ({ page }) => {
    const list = page.locator("#so-main");
    await list.getByRole("button", { name: "Reorder Color" }).focus();
    await page.keyboard.press("ArrowUp");
    expect(await labels(list)).toEqual(["Color", "Size", "Material", "Price"]);
  });

  test("dragging a handle reorders and fires tsunami:reorder", async ({
    page,
  }) => {
    const list = page.locator("#so-main");
    await record(page, "#so-main", "tsunami:reorder");
    const from = await list
      .getByRole("button", { name: "Reorder Color" })
      .boundingBox();
    const to = await list.locator("article").nth(2).boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(to!.x + 40, to!.y + to!.height / 2, { steps: 15 });
    await page.mouse.move(to!.x + 40, to!.y + to!.height - 4, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(async () => (await labels(list))[0])
      .not.toBe("Color");
    const log = (await events(page, "tsunami:reorder")) as { id: string }[];
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].id).toBe("color");
  });
});

test.describe("Dropzone", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/dropzone"));

  const png = {
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    ),
  };

  test("chosen files fire change and can be previewed", async ({ page }) => {
    const zone = page.locator("#dz-preview");
    await record(page, "#dz-preview", "change");
    await zone.getByLabel("Choose images").setInputFiles([png]);
    await expect(zone.locator("#dz-preview-list img")).toHaveCount(1);
    await expect(zone.getByRole("img", { name: "pixel.png" })).toBeVisible();
    expect((await events(page, "change")).length).toBe(1);
    await zone.getByLabel("Choose images").setInputFiles([]);
    await expect(zone.locator("#dz-preview-list img")).toHaveCount(0);
  });

  test("a file over data-max-size is rejected", async ({ page }) => {
    const zone = page.locator(".dropzone[data-max-size]");
    await record(page, ".dropzone[data-max-size]", "rejected");
    await zone.getByLabel("Store logo").setInputFiles({
      name: "big.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(1_100_000),
    });
    await expect
      .poll(async () => ((await events(page, "rejected")) as unknown[]).length)
      .toBe(1);
    const [d] = (await events(page, "rejected")) as {
      rejected: { reason: string }[];
    }[];
    expect(d.rejected[0].reason).toBe("size");
  });

  test("a file of the wrong type is rejected", async ({ page }) => {
    const zone = page.locator(".dropzone[data-max-size]");
    await record(page, ".dropzone[data-max-size]", "rejected");
    await zone.getByLabel("Store logo").setInputFiles({
      name: "note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    await expect
      .poll(async () => ((await events(page, "rejected")) as unknown[]).length)
      .toBe(1);
    const [d] = (await events(page, "rejected")) as {
      rejected: { reason: string }[];
    }[];
    expect(d.rejected[0].reason).toBe("type");
  });
});

test.describe("Image field", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/image-field"));

  const png = {
    name: "icon.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    ),
  };

  test("a chosen file is previewed and clear empties the field", async ({
    page,
  }) => {
    const field = page.locator(".image-field", { has: page.locator("#if-empty") });
    await expect(field).toHaveAttribute("data-empty", "");
    await field.locator('input[type="file"]').setInputFiles([png]);
    await expect(field).not.toHaveAttribute("data-empty", /.*/);
    await expect(field.locator("img")).toHaveAttribute("src", /^blob:/);
    await field.getByRole("button", { name: "Clear category image" }).click();
    await expect(field).toHaveAttribute("data-empty", "");
    await expect(field.locator("img")).not.toHaveAttribute("src", /.+/);
  });

  test("clear ticks the remove checkbox so the form can send it", async ({
    page,
  }) => {
    const form = page.locator("#if-form");
    await expect(page.locator("#if-result")).toHaveText("icon-clear: not sent");
    await form.getByRole("button", { name: "Clear store icon" }).click();
    await expect(
      form.getByRole("checkbox", { name: "Remove the icon" }),
    ).toBeChecked();
    await expect(page.locator("#if-result")).toHaveText("icon-clear: on");
  });
});

test.describe("Field and input states", () => {
  test("aria-invalid draws a danger border", async ({ page }) => {
    await open(page, "/docs/field");
    const zip = page.locator("#bl-zip");
    await expect(zip).toHaveAttribute("aria-invalid", "true");
    const border = (el: Locator) =>
      el.evaluate((e) => getComputedStyle(e).borderTopColor);
    const invalid = await border(zip);
    const normal = await border(page.getByLabel("First name *"));
    expect(invalid).not.toBe(normal);
    // the border follows the attribute
    await zip.evaluate((e) => e.removeAttribute("aria-invalid"));
    await expect.poll(() => border(zip)).toBe(normal);
  });

  test("a described error is linked to its field", async ({ page }) => {
    await open(page, "/docs/field");
    const zip = page.locator("#bl-zip");
    await expect(zip).toHaveAccessibleDescription("Enter a 5 digit ZIP code");
  });

  test("a switch toggles with the keyboard", async ({ page }) => {
    await open(page, "/docs/field");
    const sw = page.getByRole("switch", { name: "Cash on delivery" });
    await sw.focus();
    await expect(sw).not.toBeChecked();
    await page.keyboard.press("Space");
    await expect(sw).toBeChecked();
  });
});

test.describe("Chart", () => {
  test("a chart draws on its canvas", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, "/docs/chart");
    const canvas = page.locator("#ch-line");
    await expect(canvas).toHaveAttribute("data-chart-initialized", "true");
    const painted = await canvas.evaluate((c: HTMLCanvasElement) => {
      const data = c
        .getContext("2d")!
        .getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
      return false;
    });
    expect(painted).toBe(true);
    errors.expectNone();
  });

  test("tsunami.chart fires chartready with the chart", async ({ page }) => {
    await open(page, "/docs/chart");
    const ready = await page.evaluate(
      () =>
        new Promise<{ type: string; labels: number }>((resolve) => {
          const wrap = document.createElement("div");
          wrap.className = "chart";
          wrap.style.height = "200px";
          wrap.innerHTML = '<canvas id="e2e-chart" aria-label="Test"></canvas>';
          document.body.append(wrap);
          wrap.addEventListener("tsunami:chartready", (e) => {
            const chart = (e as CustomEvent).detail.chart;
            resolve({
              type: chart.config.type,
              labels: chart.data.labels.length,
            });
          });
          (window as any).tsunami.chart("#e2e-chart", {
            data: [
              { label: "A", n: 1 },
              { label: "B", n: 2 },
            ],
            series: { n: { label: "N" } },
          });
        }),
    );
    expect(ready).toEqual({ type: "bar", labels: 2 });
  });
});

test.describe("JSON viewer", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/json-viewer"));

  const viewer = (page: Page) => page.locator("#jv-main");
  const open_ = (v: Locator) => v.locator("details[open]");

  test("Collapse all and Expand all", async ({ page }) => {
    const v = viewer(page);
    const total = await v.locator("details").count();
    await expect(open_(v)).toHaveCount(total);
    await v.getByRole("button", { name: "Collapse all" }).click();
    // the outermost node stays open
    await expect(open_(v)).toHaveCount(1);
    await v.getByRole("button", { name: "Expand all" }).click();
    await expect(open_(v)).toHaveCount(total);
  });

  test("a node toggles with the keyboard", async ({ page }) => {
    const v = viewer(page);
    const node = v.locator("summary", { hasText: "transaction" });
    const details = node.locator("xpath=..");
    await expect(details).toHaveAttribute("open", "");
    await node.focus();
    await expect(node).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(details).not.toHaveAttribute("open", "");
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
  });

  test("Show raw swaps the tree for the text", async ({ page }) => {
    const v = viewer(page);
    await v.getByRole("button", { name: "Show raw" }).click();
    await expect(v).toHaveAttribute("data-view", "raw");
    await expect(v.getByRole("textbox", { name: "Raw post params" })).toBeVisible();
    await expect(v.locator(".json-viewer-tree")).toBeHidden();
    await v.getByRole("button", { name: "Show parsed" }).click();
    await expect(v).toHaveAttribute("data-view", "parsed");
    await expect(v.locator(".json-viewer-tree")).toBeVisible();
  });

  test("data-collapsed starts with nested nodes closed", async ({ page }) => {
    const v = page.locator("#jv-collapsed");
    await expect(v.locator("details[data-kind=array]").first()).not.toHaveAttribute(
      "open",
      "",
    );
  });
});
