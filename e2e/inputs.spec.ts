import { expect, test, type Locator, type Page } from "@playwright/test";
import { open, watchErrors } from "./helpers";

// What a user can do with the rich inputs, by keyboard and mouse: the happy path, the
// keys, the value that reaches the form and the ARIA state that matters.

// The value a form would send under `name`, read from the field the component keeps.
const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);

test.describe("Select", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/select"));

  test("opens on click, picks an option with the mouse and fills the native select", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const combo = page.getByRole("combobox", { name: "Theme" });
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await combo.click();
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("option", { name: "Dark" }).click();
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await expect(combo).toContainText("Dark");
    await expect(field(page, "theme")).toHaveValue("dark");
    errors.expectNone();
  });

  test("works from the keyboard: arrows move, Enter picks, Escape closes", async ({
    page,
  }) => {
    const combo = page.getByRole("combobox", { name: "Theme" });
    await combo.focus();
    await page.keyboard.press("ArrowDown");
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await expect(combo).toHaveAttribute("aria-activedescendant", /.+/);
    const active = await combo.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    await expect(combo).not.toHaveAttribute("aria-activedescendant", active!);
    await page.keyboard.press("Enter");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await expect(field(page, "theme")).not.toHaveValue("");
    const chosen = await field(page, "theme").inputValue();

    await combo.press("ArrowDown");
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await expect(field(page, "theme")).toHaveValue(chosen);
  });

  test("marks the chosen option with aria-selected", async ({ page }) => {
    // "3DS mode" starts on Smart.
    const combo = page.getByRole("combobox", { name: "3DS mode" });
    await expect(field(page, "three_ds_mode")).toHaveValue("smart");
    await combo.click();
    await expect(page.getByRole("option", { name: /Smart/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByRole("option", { name: /Always on/ }).click();
    await expect(field(page, "three_ds_mode")).toHaveValue("always");
  });

  test.describe("searchable", () => {
    test("filters the list as you type and picks with the keyboard", async ({
      page,
    }) => {
      const combo = page.getByRole("combobox", { name: "Carrier", exact: true });
      await combo.click();
      const search = page.getByRole("combobox", { name: "Search carriers" });
      await expect(search).toBeFocused();
      await search.pressSequentially("fed");
      const list = page.getByRole("listbox", { name: "Carrier" });
      await expect(list.getByRole("option")).toHaveCount(1);
      await expect(list.getByRole("option", { name: "FedEx" })).toBeVisible();
      await page.keyboard.press("ArrowDown");
      await expect(search).toHaveAttribute("aria-activedescendant", /.+/);
      await page.keyboard.press("Enter");
      await expect(combo).toHaveAttribute("aria-expanded", "false");
      await expect(field(page, "carrier")).toHaveValue("fedex");
    });

    test("shows the empty text when nothing matches, and Escape closes", async ({
      page,
    }) => {
      const combo = page.getByRole("combobox", { name: "Carrier", exact: true });
      await combo.click();
      const search = page.getByRole("combobox", { name: "Search carriers" });
      await search.pressSequentially("zzzz");
      await expect(
        page.getByRole("listbox", { name: "Carrier" }).getByRole("option"),
      ).toHaveCount(0);
      await expect(page.getByRole("status").filter({ hasText: "No carriers found" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(combo).toHaveAttribute("aria-expanded", "false");
      await expect(field(page, "carrier")).toHaveValue("");
    });
  });

  test("a multiple select keeps several options", async ({ page }) => {
    const box = page.getByRole("combobox", { name: "Categories" });
    await box.click();
    await expect(box).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("option", { name: "Bedding" }).click();
    await page.getByRole("option", { name: "Lighting" }).click();
    await expect(page.getByRole("option", { name: "Bedding" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect
      .poll(() =>
        field(page, "category").evaluate((s: HTMLSelectElement) =>
          [...s.selectedOptions].map((o) => o.value),
        ),
      )
      .toEqual(["bedding", "lighting"]);
  });

  // A framework's empty option (<option value="">---------</option>) with data-placeholder.
  const listed = (page: Page) =>
    page.locator('[role="listbox"]:visible [role="option"]').allTextContents();

  test("data-placeholder leaves the empty option out of a required select", async ({ page }) => {
    const combo = page.getByRole("combobox", { name: "Type (required)" });
    await expect(combo).toContainText("Select a type");
    await combo.click();
    await expect.poll(() => listed(page)).toEqual(["Type A", "Type B"]);
    await expect(field(page, "kind")).toHaveValue("");
  });

  test("the keyboard never lands on the left-out option", async ({ page }) => {
    const combo = page.getByRole("combobox", { name: "Type (required)" });
    await combo.focus();
    await page.keyboard.press("ArrowDown");
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(field(page, "kind")).toHaveValue("b");
    await combo.press("ArrowDown");
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    await expect(field(page, "kind")).toHaveValue("a");
    await combo.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(field(page, "kind")).not.toHaveValue("");
  });

  test("an optional select lists the empty option as a muted placeholder row that clears it", async ({
    page,
  }) => {
    const combo = page.getByRole("combobox", { name: "Supplier (optional)" });
    await combo.click();
    await expect.poll(() => listed(page)).toEqual(["No supplier", "North Farm", "River Mill"]);
    await page.getByRole("option", { name: "North Farm" }).click();
    await expect(field(page, "supplier")).toHaveValue("1");
    await combo.click();
    const blank = page.getByRole("option", { name: "No supplier" });
    await expect(blank).toHaveAttribute("data-placeholder", "");
    await blank.click();
    await expect(field(page, "supplier")).toHaveValue("");
    await expect(combo).toContainText("No supplier");
    await expect(page.locator('.select:has([name="supplier"])')).not.toHaveAttribute(
      "data-has-value",
    );
  });

  test("without data-placeholder the empty option is listed as before", async ({ page }) => {
    await page
      .locator('.select:has([name="kind"])')
      .evaluate((el) => el.removeAttribute("data-placeholder"));
    await page.getByRole("combobox", { name: "Type (required)" }).click();
    await expect.poll(() => listed(page)).toEqual(["---------", "Type A", "Type B"]);
  });

  // A select with a framework's empty option, added to the page with the given wrapper attributes.
  async function addSelect(page: Page, name: string, attrs: Record<string, string>, required: boolean) {
    await page.evaluate(
      ({ name, attrs, required }) => {
        const div = document.createElement("div");
        div.className = "select";
        for (const [k, v] of Object.entries(attrs)) div.setAttribute(k, v);
        div.innerHTML = `<select name="${name}" aria-label="${name}"${required ? " required" : ""}>
          <option value="">---------</option><option value="r">Red</option><option value="g">Green</option>
        </select>`;
        document.querySelector("main")!.append(div);
      },
      { name, attrs, required },
    );
    return page.getByRole("combobox", { name, exact: true });
  }

  for (const [kind, attrs] of [
    ["data-search", { "data-search": "Search colours" }],
    ["data-input", { "data-input": "" }],
  ] as const) {
    test(`${kind}: the empty option is left out when required and a placeholder row otherwise`, async ({
      page,
    }) => {
      const req = await addSelect(page, "req", { ...attrs, "data-placeholder": "Pick one" }, true);
      await req.click();
      await expect.poll(() => listed(page)).toEqual(["Red", "Green"]);
      await page.keyboard.press("Escape");

      const opt = await addSelect(page, "opt", { ...attrs, "data-placeholder": "Pick one" }, false);
      await opt.click();
      await expect.poll(() => listed(page)).toEqual(["Pick one", "Red", "Green"]);
      await page.keyboard.type("gr");
      await expect.poll(() => listed(page)).toEqual(["Green"]); // no placeholder row while searching
      await page.keyboard.press("Enter");
      await expect(field(page, "opt")).toHaveValue("g");
    });
  }

  test("data-url: the empty option stays out of the list after the results load", async ({ page }) => {
    await page.route("**/remote-colours.json*", (route) =>
      route.fulfill({
        json: { results: [{ id: "r", text: "Red" }, { id: "g", text: "Green" }, { id: "b", text: "Blue" }] },
      }),
    );
    const req = await addSelect(
      page,
      "remote-req",
      { "data-url": "/remote-colours.json", "data-placeholder": "Pick one" },
      true,
    );
    await req.click();
    await expect.poll(() => listed(page)).toEqual(["Red", "Green", "Blue"]);
    await page.keyboard.press("Escape");

    const opt = await addSelect(
      page,
      "remote-opt",
      { "data-url": "/remote-colours.json", "data-placeholder": "Pick one" },
      false,
    );
    await opt.click();
    await expect.poll(() => listed(page)).toEqual(["Pick one", "Red", "Green", "Blue"]);
    await expect(field(page, "remote-opt")).toHaveValue("");
  });

  test("a multiple select with data-placeholder leaves the empty option out", async ({ page }) => {
    await page.evaluate(() => {
      const div = document.createElement("div");
      div.className = "select";
      div.dataset.placeholder = "Pick colours";
      div.innerHTML = `<select name="colours" multiple aria-label="Colours">
        <option value="">---------</option><option value="r">Red</option><option value="g">Green</option>
      </select>`;
      document.querySelector("main")!.append(div);
    });
    const box = page.getByRole("combobox", { name: "Colours" });
    await box.click();
    await expect.poll(() => listed(page)).toEqual(["Red", "Green"]);
  });
});

test.describe("Autocomplete", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/autocomplete"));

  test("suggests while typing and a click fills the input", async ({ page }) => {
    const errors = watchErrors(page);
    const input = page.getByRole("combobox", { name: "City", exact: true }).first();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await input.pressSequentially("ba");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("option", { name: "Bangkok" }).first()).toBeVisible();
    await expect(page.getByRole("option", { name: "Berlin" })).toHaveCount(0);
    await page.getByRole("option", { name: "Barcelona" }).first().click();
    await expect(input).toHaveValue("Barcelona");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    errors.expectNone();
  });

  test("arrows move aria-activedescendant, Enter picks, Escape closes", async ({
    page,
  }) => {
    const input = page.getByRole("combobox", { name: "Home city" });
    await input.pressSequentially("b");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    const first = await input.getAttribute("aria-activedescendant");
    expect(first).toBeTruthy();
    await page.keyboard.press("ArrowDown");
    await expect(input).not.toHaveAttribute("aria-activedescendant", first!);
    await page.keyboard.press("Enter");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveValue(/^B/);
    expect(["Bangkok", "Barcelona", "Berlin", "Brussels", "Budapest"]).toContain(
      await input.inputValue(),
    );

    await input.fill("");
    await input.pressSequentially("c");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");
  });

  test("keeps free text that is not a suggestion", async ({ page }) => {
    const input = page.getByRole("combobox", { name: "Home city" });
    await input.pressSequentially("Atlantis");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await input.press("Tab");
    await expect(input).toHaveValue("Atlantis");
  });

  test("data-min-length=0 lists suggestions on focus", async ({ page }) => {
    const input = page.getByPlaceholder("Focus to see suggestions");
    await input.focus();
    await expect(input).toHaveAttribute("aria-expanded", "true");
    // data-limit="5"
    await expect(page.getByRole("option")).toHaveCount(5);
  });
});

test.describe("Tag input", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/tag-input"));

  test("Enter and comma add tags, and the hidden input joins them", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const group = page.getByRole("group", { name: "Recipients" });
    const box = group.getByRole("textbox");
    await box.fill("a@x.com");
    await box.press("Enter");
    await box.pressSequentially("b@x.com,");
    await expect(group.locator(".chip")).toHaveCount(2);
    await expect(box).toHaveValue("");
    await expect(field(page, "to")).toHaveValue("a@x.com,b@x.com");
    await expect(page.locator("#ti2-out")).toHaveText("2 of 3: a@x.com, b@x.com");
    errors.expectNone();
  });

  test("Backspace in the empty box removes the last tag; the x button removes one", async ({
    page,
  }) => {
    const group = page.getByRole("group", { name: "Recipients" });
    const box = group.getByRole("textbox");
    for (const t of ["one", "two", "three"]) {
      await box.fill(t);
      await box.press("Enter");
    }
    await expect(field(page, "to")).toHaveValue("one,two,three");
    await box.press("Backspace");
    await expect(field(page, "to")).toHaveValue("one,two");
    await group.getByRole("button", { name: "Remove one" }).click();
    await expect(field(page, "to")).toHaveValue("two");
    await expect(group.locator(".chip")).toHaveCount(1);
  });

  test("ignores a duplicate and stops at data-max", async ({ page }) => {
    const group = page.getByRole("group", { name: "Recipients" });
    const box = group.getByRole("textbox");
    for (const t of ["a", "a", "b", "c", "d"]) {
      await box.fill(t);
      await box.press("Enter");
    }
    await expect(field(page, "to")).toHaveValue("a,b,c");
    await expect(group.locator(".chip")).toHaveCount(3);
  });

  test("starts from data-value and a paste is split on commas", async ({ page }) => {
    const labels = page.getByRole("group", { name: "Labels" });
    await expect(field(page, "labels")).toHaveValue("design,billing");
    await expect(labels.locator(".chip")).toHaveCount(2);
    await labels.getByRole("textbox").evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "alpha, beta\ngamma");
      // Firefox and WebKit ignore clipboardData in the constructor: set it on the event.
      const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
    });
    await expect(field(page, "labels")).toHaveValue(
      "design,billing,alpha,beta,gamma",
    );
  });
  // Adding any element with a .tag-input used to start every tag input on the page
  // again: the guard was data-mounted="", an empty string, which is falsy.
  test("adding another tag input leaves the typed tags alone", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const group = page.getByRole("group", { name: "Recipients" });
    const box = group.getByRole("textbox");
    await box.fill("kept@x.com");
    await box.press("Enter");
    await expect(group.locator(".chip")).toHaveCount(1);
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "tag-input";
      el.dataset.name = "later";
      el.setAttribute("aria-label", "Later");
      document.body.append(el);
    });
    await expect(page.locator('[aria-label="Later"] > input[type="text"]')).toHaveCount(1);
    await expect(group.locator(".chip")).toHaveCount(1);
    await expect(group.locator('[role="status"]')).toHaveCount(1);
    errors.expectNone();
  });
});

test.describe("Phone input", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/phone-input"));

  test("joins the dial code and the digits into the hidden input", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const input = page.getByLabel("Phone", { exact: true }).first();
    await expect(field(page, "phone")).toHaveValue("");
    await input.pressSequentially("81 234 5678");
    await expect(field(page, "phone")).toHaveValue("+66812345678");
    await input.fill("");
    await expect(field(page, "phone")).toHaveValue("");
    errors.expectNone();
  });

  test("typing + and a dial code picks the country", async ({ page }) => {
    const input = page.locator("#pi-basic");
    await input.fill("+44 7700 900123");
    await expect(
      page.getByRole("button", { name: "Country: United Kingdom +44" }).first(),
    ).toBeVisible();
    await expect(input).toHaveValue(/^7700\s?900123$/);
    await expect(field(page, "phone")).toHaveValue("+447700900123");
  });

  test("the country list is searchable and a pick changes the dial code", async ({
    page,
  }) => {
    const button = page.getByRole("button", { name: /^Country: Thailand/ }).first();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const search = page.getByRole("combobox", { name: "Search countries" }).first();
    await expect(search).toBeFocused();
    await search.pressSequentially("japan");
    await page.getByRole("option", { name: /Japan/ }).first().click();
    await expect(
      page.getByRole("button", { name: "Country: Japan +81" }).first(),
    ).toBeVisible();
    await page.locator("#pi-basic").fill("90 1234 5678");
    await expect(field(page, "phone")).toHaveValue("+819012345678");
  });

  test("Escape closes the country list", async ({ page }) => {
    const button = page.getByRole("button", { name: /^Country: Thailand/ }).first();
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("drops the trunk 0 of a national number", async ({ page }) => {
    // The form starts on "081-234-5678" (Thailand).
    await expect(field(page, "mobile")).toHaveValue("+66812345678");
    await page.getByLabel("Mobile").fill("089-999-0000");
    await expect(field(page, "mobile")).toHaveValue("+66899990000");
    await expect(page.locator("#pi-result")).toHaveText("+66899990000");
  });
});

test.describe("Time picker", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/time-picker"));

  const segments = (page: Page, name: string) => {
    const group = page.getByRole("group", { name, exact: true });
    return {
      hour: group.getByRole("spinbutton", { name: "Hour" }),
      minute: group.getByRole("spinbutton", { name: "Minute" }),
    };
  };

  test("starts from value and ArrowUp / ArrowDown change a segment", async ({
    page,
  }) => {
    const { hour, minute } = segments(page, "Start time");
    await expect(hour).toHaveAttribute("aria-valuenow", "9");
    await expect(minute).toHaveAttribute("aria-valuenow", "30");
    await expect(field(page, "start")).toHaveValue("09:30");
    await hour.focus();
    await page.keyboard.press("ArrowUp");
    await expect(hour).toHaveAttribute("aria-valuenow", "10");
    await expect(field(page, "start")).toHaveValue("10:30");
    await minute.focus();
    await page.keyboard.press("ArrowDown");
    await expect(minute).toHaveAttribute("aria-valuenow", "29");
    await expect(field(page, "start")).toHaveValue("10:29");
  });

  test("Home and End jump to the limits and ArrowUp wraps", async ({ page }) => {
    const { hour, minute } = segments(page, "Start time");
    await hour.focus();
    await page.keyboard.press("End");
    await expect(hour).toHaveAttribute("aria-valuenow", "23");
    await page.keyboard.press("ArrowUp");
    await expect(hour).toHaveAttribute("aria-valuenow", "0");
    await page.keyboard.press("Home");
    await expect(hour).toHaveAttribute("aria-valuenow", "0");
    await minute.focus();
    await page.keyboard.press("End");
    await expect(minute).toHaveAttribute("aria-valuenow", "59");
    await expect(field(page, "start")).toHaveValue("00:59");
  });

  test("typing digits fills the segments and moves on", async ({ page }) => {
    const { hour, minute } = segments(page, "Opening time");
    await expect(field(page, "opens")).toHaveValue("");
    await hour.focus();
    await page.keyboard.type("0745");
    await expect(minute).toBeFocused();
    await expect(hour).toHaveAttribute("aria-valuenow", "7");
    await expect(minute).toHaveAttribute("aria-valuenow", "45");
    await expect(field(page, "opens")).toHaveValue("07:45");
  });

  test("Backspace empties a segment and the value with it", async ({ page }) => {
    const { hour } = segments(page, "Start time");
    await hour.focus();
    await page.keyboard.press("Backspace");
    await expect(hour).toHaveAttribute("aria-valuetext", "Empty");
    await expect(field(page, "start")).toHaveValue("");
  });

  test("data-step moves the minutes by the step and 12-hour keeps a 24-hour value", async ({
    page,
  }) => {
    const slot = segments(page, "Appointment time");
    await slot.minute.focus();
    await page.keyboard.press("ArrowUp");
    await expect(field(page, "slot")).toHaveValue("09:15");

    const meeting = page.getByRole("group", { name: "Meeting time" });
    await expect(meeting.getByRole("spinbutton", { name: "Hour" })).toHaveAttribute(
      "aria-valuenow",
      "3",
    );
    await expect(field(page, "meeting")).toHaveValue("15:15");
  });
});

test.describe("Date picker", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/date-picker"));

  const panel = (page: Page) => page.getByRole("dialog", { name: "Choose a date" });
  const day = (page: Page, label: string) =>
    page.getByRole("button", { name: label, exact: true });

  test("opens on focus, picks a day and writes it as YYYY-MM-DD", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const input = page.getByLabel("Created from");
    await expect(input).toHaveValue("2026-05-29");
    await input.click();
    await expect(panel(page)).toBeVisible();
    await expect(day(page, "May 29, 2026")).toBeVisible();
    await day(page, "May 12, 2026").click();
    await expect(input).toHaveValue("2026-05-12");
    await expect(panel(page)).toBeHidden();
    errors.expectNone();
  });

  test("Escape closes and keeps focus on the field; ArrowDown reopens", async ({
    page,
  }) => {
    const input = page.getByLabel("Created from");
    await input.click();
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel(page)).toBeHidden();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("2026-05-29");
    await page.keyboard.press("ArrowDown");
    await expect(panel(page)).toBeVisible();
  });

  test("a typed date moves the calendar", async ({ page }) => {
    const input = page.getByLabel("Expiration date").first();
    await input.fill("2027-01-15");
    await input.press("Enter");
    await expect(input).toHaveValue("2027-01-15");
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
    await input.press("ArrowDown");
    await expect(panel(page)).toBeVisible();
    await expect(day(page, "January 15, 2027")).toHaveAttribute("tabindex", "0");
  });

  test("keys on a day: arrows, Home, End, PageUp, PageDown", async ({ page }) => {
    const input = page.getByLabel("Created from");
    await input.click();
    // Tab goes field, then calendar: put focus on the day button directly.
    await day(page, "May 29, 2026").focus();
    // 2026-05-29 is a Friday; the week starts on Monday.
    await page.keyboard.press("Home");
    await expect(day(page, "May 25, 2026")).toBeFocused();
    await page.keyboard.press("End");
    await expect(day(page, "May 31, 2026")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(day(page, "May 30, 2026")).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect(day(page, "June 30, 2026")).toBeFocused();
    await page.keyboard.press("PageUp");
    await expect(day(page, "May 30, 2026")).toBeFocused();
    await page.keyboard.press("Shift+PageDown");
    await expect(day(page, "May 30, 2027")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("2027-05-30");
  });

  test("range: two clicks choose the start and the end", async ({ page }) => {
    const input = page.locator("#dp-range");
    await expect(input).toHaveValue("2026-08-27 to 2026-09-25");
    await input.click();
    const range = page.getByRole("dialog", { name: "Choose dates" });
    await expect(range).toBeVisible();
    await range.getByRole("button", { name: "August 3, 2026", exact: true }).click();
    await range.getByRole("button", { name: "August 7, 2026", exact: true }).click();
    await expect(input).toHaveValue("2026-08-03 to 2026-08-07");
    await expect(range).toBeHidden();
  });

  test("a button picker sets aria-expanded and fills the hidden input", async ({
    page,
  }) => {
    // The form example: a text field in front of the hidden input a form sends.
    const picker = page.locator(
      '.date-picker:has(> button):has(input[name="expires"])',
    );
    const trigger = picker.getByRole("button", { name: /Select a date/ });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await picker
      .locator('[data-vc-date-month="current"] button')
      .first()
      .click();
    await expect(picker.getByRole("button").first()).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(picker.locator('input[name="expires"]')).toHaveValue(/^\d{4}-\d\d-\d\d$/);
    await expect(picker.getByRole("button").first()).not.toContainText("Select a date");
  });

  test("the form sends the picked day", async ({ page }) => {
    const form = page.locator("#dp-form");
    await expect(form.locator('[name="expires"]')).toHaveValue("2026-12-31");
    await form.getByLabel("Expiration date").click();
    await page.getByRole("button", { name: "December 15, 2026", exact: true }).click();
    await expect(form.locator('[name="expires"]')).toHaveValue("2026-12-15");
    await form.getByRole("button", { name: "Save" }).click();
    await expect(page.locator("#dp-form-result")).toHaveText(
      "Sent: expires=2026-12-15",
    );
  });
});

test.describe("Date picker: language and calendar", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/date-picker"));

  const thai = (page: Page) => page.locator("#dp-thai-picker");
  const cell = (root: Locator, iso: string) =>
    root.locator(`[data-vc-date="${iso}"] button`);

  test('lang="th": Thai names and Buddhist-era years, the value stays ISO', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const picker = thai(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(picker.locator("#dp-thai")).toHaveValue("15 พ.ย. 2569");
    await picker.locator("#dp-thai").click();
    const panel = page.getByRole("dialog", { name: "เลือกวันที่" });
    await expect(panel).toBeVisible();
    const year = picker.locator('[data-vc="year"]');
    await expect(year).toHaveText("2569");
    await expect(year).toHaveAttribute("data-vc-year", "2026");
    await expect(year).toHaveAttribute("aria-label", /2569$/);
    await expect(picker.locator('[data-vc="month"]')).toHaveText("พฤศจิกายน");
    await expect(picker.locator('[data-vc-arrow="prev"]')).toHaveAttribute(
      "aria-label",
      "เดือนก่อนหน้า",
    );
    await cell(picker, "2026-11-20").click();
    await expect(picker.locator("#dp-thai")).toHaveValue("20 พ.ย. 2569");
    await expect(picker.locator('[name="delivery"]')).toHaveValue("2026-11-20");
    expect(await picker.evaluate((el: any) => el.value)).toBe("2026-11-20");
    errors.expectNone();
  });

  test("the year list shows Buddhist-era years and picks the Gregorian one", async ({
    page,
  }) => {
    const picker = thai(page);
    await picker.locator("#dp-thai").click();
    await picker.locator('[data-vc="year"]').click();
    const next = picker.locator('[data-vc-years-year="2027"]');
    await expect(next).toHaveText("2570");
    await next.click();
    await expect(picker.locator('[data-vc="year"]')).toHaveText("2570");
    await cell(picker, "2027-11-03").click();
    await expect(picker.locator('[name="delivery"]')).toHaveValue("2027-11-03");
  });

  test("PageDown and an arrow redraw keep the Buddhist-era year", async ({ page }) => {
    const picker = thai(page);
    await picker.locator("#dp-thai").click();
    await cell(picker, "2026-11-15").focus();
    await page.keyboard.press("PageDown");
    await page.keyboard.press("PageDown");
    await expect(cell(picker, "2027-01-15")).toBeFocused();
    await expect(picker.locator('[data-vc="year"]')).toHaveText("2570");
    await picker.locator('[data-vc-arrow="prev"]').click();
    await expect(picker.locator('[data-vc="year"]')).toHaveText("2569");
    await page.keyboard.press("Escape");
    await expect(picker.locator('[name="delivery"]')).toHaveValue("2026-11-15");
  });

  test("a Thai range shows both dates in Thai and sends ISO", async ({ page }) => {
    const picker = page.locator("#dp-thai-range-picker");
    const input = picker.locator("#dp-thai-range");
    await expect(input).toHaveValue("1 พฤศจิกายน 2569 ถึง 30 พฤศจิกายน 2569");
    await input.click();
    await expect(page.getByRole("dialog", { name: "เลือกช่วงวันที่" })).toBeVisible();
    await cell(picker, "2026-11-03").first().click();
    await cell(picker, "2026-11-07").first().click();
    await expect(input).toHaveValue("3 พฤศจิกายน 2569 ถึง 7 พฤศจิกายน 2569");
    await expect(picker.locator('[name="period"]')).toHaveValue(
      "2026-11-03 to 2026-11-07",
    );
  });

  // A picker added to the page: data-locale and mount({ locale }) choose the
  // language over lang, and an unknown tag falls back to English.
  const add = (page: Page, attrs: string, format = "medium") =>
    page.evaluate(([attrs, format]) => {
      document.getElementById("dp-added")?.remove();
      const box = document.createElement("div");
      box.id = "dp-added";
      box.innerHTML = `<div class="date-picker" data-format="${format}" ${attrs}><input class="input" type="text" aria-label="Added"><input type="hidden" name="added" value="2026-11-15"><div data-popover aria-hidden="true"></div></div>`;
      document.querySelector("main")!.append(box);
    }, [attrs, format]);
  const added = (page: Page) => page.locator("#dp-added .date-picker");

  test("data-locale wins over lang", async ({ page }) => {
    await add(page, 'lang="th" data-locale="en-US"');
    await expect(added(page).getByRole("textbox")).toHaveValue("Nov 15, 2026");
    await add(page, 'data-locale="th-TH-u-ca-buddhist" data-label="วันนัด"');
    await expect(added(page).getByRole("textbox")).toHaveValue("15 พ.ย. 2569");
    await added(page).getByRole("textbox").click();
    await expect(page.getByRole("dialog", { name: "วันนัด" })).toBeVisible();
    await expect(added(page).locator('[data-vc="year"]')).toHaveText("2569");
  });

  test("mount({ locale }) wins over both, and a bad tag falls back", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await add(page, 'lang="en" data-locale="en-US"');
    await expect(added(page)).toHaveAttribute("data-date-picker-initialized", "true");
    await added(page).evaluate((el) => window.tsunami.datePicker.mount(el, { locale: "th" }));
    await expect(added(page).getByRole("textbox")).toHaveValue("15 พ.ย. 2569");
    await add(page, 'data-locale="not a tag"');
    await expect(added(page).getByRole("textbox")).toHaveValue("Nov 15, 2026");
    errors.expectNone();
  });

  test('lang="en" output is unchanged', async ({ page }) => {
    await add(page, "", "long");
    await expect(added(page).getByRole("textbox")).toHaveValue("November 15, 2026");
    await added(page).getByRole("textbox").click();
    await expect(page.getByRole("dialog", { name: "Choose a date" })).toBeVisible();
    await expect(added(page).locator('[data-vc="year"]')).toHaveText("2026");
    await expect(added(page).locator('[data-vc="month"]')).toHaveText("November");
  });
});

test.describe("OTP input", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/otp"));

  const form = (page: Page) => page.locator("#otp-form");
  const box = (page: Page, n: number) =>
    form(page).getByRole("textbox", { name: `Character ${n} of 6` });

  test("typing advances to the next box and fills the hidden input", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await box(page, 1).focus();
    await page.keyboard.type("123");
    await expect(box(page, 4)).toBeFocused();
    await expect(box(page, 1)).toHaveValue("1");
    await expect(box(page, 3)).toHaveValue("3");
    await expect(form(page).locator('[name="code"]')).toHaveValue("123");
    await expect(page.locator("#otp-out")).toHaveText("Type or paste a code.");
    await page.keyboard.type("456");
    await expect(form(page).locator('[name="code"]')).toHaveValue("123456");
    await expect(page.locator("#otp-out")).toHaveText("Code 123456 is complete.");
    errors.expectNone();
  });

  test("digits only: letters are refused", async ({ page }) => {
    await box(page, 1).focus();
    await page.keyboard.type("a1");
    await expect(box(page, 1)).toHaveValue("1");
    await expect(form(page).locator('[name="code"]')).toHaveValue("1");
  });

  test("Backspace on an empty box goes back and ArrowLeft / ArrowRight / Home / End move", async ({
    page,
  }) => {
    await box(page, 1).focus();
    await page.keyboard.type("12");
    await expect(box(page, 3)).toBeFocused();
    await page.keyboard.press("Backspace");
    await expect(box(page, 2)).toBeFocused();
    await expect(box(page, 2)).toHaveValue("");
    await expect(form(page).locator('[name="code"]')).toHaveValue("1");
    await page.keyboard.press("ArrowLeft");
    await expect(box(page, 1)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(box(page, 2)).toBeFocused();
    await page.keyboard.press("End");
    await expect(box(page, 6)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(box(page, 1)).toBeFocused();
  });

  test("a paste is spread over the boxes", async ({ page }) => {
    await box(page, 1).evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "987654");
      // Firefox and WebKit ignore clipboardData in the constructor: set it on the event.
      const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
    });
    for (const [i, c] of [..."987654"].entries())
      await expect(box(page, i + 1)).toHaveValue(c);
    await expect(form(page).locator('[name="code"]')).toHaveValue("987654");
    await expect(page.locator("#otp-out")).toHaveText("Code 987654 is complete.");
  });

  test("data-type=text accepts letters", async ({ page }) => {
    const invite = page.getByRole("group", { name: "Invite code" });
    await invite.getByRole("textbox").first().focus();
    await page.keyboard.type("ab1z");
    await expect(invite.locator('[name="invite"]')).toHaveValue("ab1z");
  });

  test("adding another OTP input leaves the typed digits alone", async ({
    page,
  }) => {
    await box(page, 1).focus();
    await page.keyboard.type("12");
    await expect(box(page, 2)).toHaveValue("2");
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "otp";
      document.body.append(el);
    });
    await expect(page.locator(".otp").last().getByRole("textbox")).toHaveCount(6);
    await expect(box(page, 1)).toHaveValue("1");
    await expect(box(page, 2)).toHaveValue("2");
  });
});

test.describe("Color field", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/color-field"));

  test("typing a colour sets the picker and the form value", async ({ page }) => {
    const text = page.getByLabel("Button color", { exact: true });
    const picker = page.getByLabel("Pick the button color");
    await expect(picker).toHaveValue("#0a7f6e");
    await text.fill("#ff0000");
    await expect(picker).toHaveValue("#ff0000");
    await expect(page.locator("#cf-result")).toHaveText("#ff0000");
  });

  test("picking a colour writes it to the text field", async ({ page }) => {
    const errors = watchErrors(page);
    await page.getByLabel("Pick the button color").fill("#00ff00");
    await expect(page.getByLabel("Button color", { exact: true })).toHaveValue("#00ff00");
    await expect(page.locator("#cf-result")).toHaveText("#00ff00");
    errors.expectNone();
  });

  test("a short colour is understood and an empty field is marked", async ({
    page,
  }) => {
    await expect(page.getByLabel("Pick the background color")).toHaveValue("#000000");
    const empty = page.locator(".color-field", { has: page.locator("#cf-empty") });
    await expect(empty).toHaveAttribute("data-empty", "");
    await page.locator("#cf-empty").fill("#123456");
    await expect(empty).not.toHaveAttribute("data-empty", "");
    await expect(page.getByLabel("Pick the link color")).toHaveValue("#123456");
  });

  test("data-alpha: the opacity slider writes #rrggbbaa", async ({ page }) => {
    const text = page.getByLabel("Overlay color", { exact: true });
    const opacity = page.getByRole("slider", { name: "Opacity" });
    await expect(text).toHaveValue("#1a73e880");
    await opacity.focus();
    await page.keyboard.press("End");
    await expect(text).toHaveValue("#1a73e8");
    await page.keyboard.press("Home");
    await expect(text).toHaveValue("#1a73e800");
  });

  test("a disabled field cannot be changed", async ({ page }) => {
    await expect(page.getByLabel("Footer color", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Pick the footer color")).toBeDisabled();
  });
});

test.describe("Slider", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/field"));

  const value = (el: Locator) => el.evaluate((n) => n.style.getPropertyValue("--value"));

  test("arrow keys change the value, --value and the output", async ({ page }) => {
    const slider = page.getByLabel(/^Discount/);
    const out = page.locator('output[for="sl-discount"]');
    await expect(slider).toHaveValue("15");
    await expect(out).toHaveText("15");
    await expect.poll(() => value(slider)).toBe("30%");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue("20");
    await expect(out).toHaveText("20");
    await expect.poll(() => value(slider)).toBe("40%");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(slider).toHaveValue("10");
    await expect.poll(() => value(slider)).toBe("20%");
  });

  test("Home and End go to the limits", async ({ page }) => {
    const slider = page.getByLabel(/^Low stock alert/);
    await slider.focus();
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("100");
    await expect(page.locator('output[for="sl-stock"]')).toHaveText("100");
    await expect.poll(() => value(slider)).toBe("100%");
    await page.keyboard.press("Home");
    await expect(slider).toHaveValue("0");
    await expect.poll(() => value(slider)).toBe("0%");
  });

  test("a disabled slider ignores the keyboard", async ({ page }) => {
    const slider = page.getByLabel("Alert volume");
    await expect(slider).toBeDisabled();
    await expect(slider).toHaveValue("60");
  });
});

test.describe("Segmented control", () => {
  test.beforeEach(async ({ page }) => open(page, "/docs/segmented"));

  const group = (page: Page) =>
    page.getByRole("radiogroup", { name: "Group sales by" });

  test("a click chooses one option and unchooses the other", async ({ page }) => {
    const errors = watchErrors(page);
    const radios = group(page).getByRole("radio");
    await expect(radios.nth(0)).toBeChecked();
    await group(page).getByRole("radio", { name: "Month" }).click();
    await expect(group(page).getByRole("radio", { name: "Month" })).toBeChecked();
    await expect(group(page).getByRole("radio", { name: "Day" })).not.toBeChecked();
    errors.expectNone();
  });

  test("arrow keys move the choice", async ({ page }) => {
    const day = group(page).getByRole("radio", { name: "Day" });
    await day.focus();
    await page.keyboard.press("ArrowRight");
    await expect(group(page).getByRole("radio", { name: "Week" })).toBeChecked();
    await expect(group(page).getByRole("radio", { name: "Week" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(group(page).getByRole("radio", { name: "Month" })).toBeChecked();
    await page.keyboard.press("ArrowLeft");
    await expect(group(page).getByRole("radio", { name: "Week" })).toBeChecked();
    await expect(day).not.toBeChecked();
  });

  test("the chosen radio is the value a form sends", async ({ page }) => {
    await group(page).getByRole("radio", { name: "Year" }).click();
    await expect(page.locator('input[name="group"]:checked')).toHaveValue("year");
  });

  test("a disabled option cannot be chosen", async ({ page }) => {
    const map = page.getByRole("radio", { name: "Map" });
    await expect(map).toBeDisabled();
    await expect(map).not.toBeChecked();
  });
});
