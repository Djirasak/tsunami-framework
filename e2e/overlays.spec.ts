// Overlays through the keyboard and the mouse: Dialog, Drawer, Popover, Dropdown,
// Command and Tooltip. Each test opens a fresh page, so none depends on another.
import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Focus is in the open dialog, or nowhere (the body): never on the page behind it.
const focusNotBehind = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    return a === document.body || !!a?.closest("dialog[open]");
  });

// Light dismiss (closedby="any") is not in every engine yet.
async function needsClosedBy(page: Page) {
  const ok = await page.evaluate(() => "closedBy" in HTMLDialogElement.prototype);
  test.skip(!ok, "this browser has no closedby on <dialog>");
}

// A modal dialog: open it from its trigger, then the shared behaviour.
function modalTests(
  slug: string,
  trigger: { name: string | RegExp },
  dialogName: string | RegExp,
) {
  const dialog = (page: Page) => page.getByRole("dialog", { name: dialogName });
  const opener = (page: Page) =>
    page.getByRole("button", { name: trigger.name, exact: true }).first();

  test("opens from its trigger and has an accessible name", async ({ page }) => {
    await open(page, `/docs/${slug}`);
    await expect(dialog(page)).toBeHidden();
    await opener(page).click();
    await expect(dialog(page)).toBeVisible();
  });

  test("moves focus into the dialog", async ({ page }) => {
    await open(page, `/docs/${slug}`);
    await opener(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => !!document.activeElement?.closest("dialog[open]")),
      )
      .toBe(true);
  });

  test("Tab stays inside the modal", async ({ page }) => {
    await open(page, `/docs/${slug}`);
    await opener(page).click();
    await expect(dialog(page)).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await focusNotBehind(page)).toBe(true);
    }
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await focusNotBehind(page)).toBe(true);
    }
  });

  test("Escape closes it and focus returns to the trigger", async ({ page }) => {
    await open(page, `/docs/${slug}`);
    await opener(page).focus();
    await page.keyboard.press("Enter");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(opener(page)).toBeFocused();
  });

  test("the close button closes it", async ({ page }) => {
    await open(page, `/docs/${slug}`);
    await opener(page).click();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(opener(page)).toBeFocused();
  });

  test("a click outside closes it", async ({ page }) => {
    await open(page, `/docs/${slug}`);
    await needsClosedBy(page);
    await opener(page).click();
    await expect(dialog(page)).toBeVisible();
    // The top-left corner of the viewport is the backdrop for a centred dialog
    // and for a drawer that sits on the right.
    await page.mouse.click(2, 2);
    await expect(dialog(page)).toBeHidden();
  });
}

test.describe("Dialog", () => {
  modalTests("dialog", { name: "Edit customer" }, "Edit customer");

  test("a click inside does not close it", async ({ page }) => {
    await open(page, "/docs/dialog");
    await page.getByRole("button", { name: "Edit customer", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Edit customer" });
    await dialog.getByLabel("Name").click();
    await expect(dialog).toBeVisible();
  });

  test("describes itself and focuses its autofocus field", async ({ page }) => {
    await open(page, "/docs/dialog");
    await page.getByRole("button", { name: "Edit customer", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Edit customer" });
    await expect(dialog).toHaveAccessibleDescription("Change the details, then save.");
    await expect(dialog.getByLabel("Name")).toBeFocused();
  });

  test("a footer button closes it", async ({ page }) => {
    await open(page, "/docs/dialog");
    await page.getByRole("button", { name: "Edit customer", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Edit customer" });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe("Drawer", () => {
  modalTests("drawer", { name: /Filters/ }, "Filters");

  test("the drawer holds its form controls", async ({ page }) => {
    await open(page, "/docs/drawer");
    await page.getByRole("button", { name: /Filters/ }).first().click();
    const drawer = page.getByRole("dialog", { name: "Filters" });
    await expect(drawer.getByRole("button", { name: "Search" })).toBeVisible();
  });
});

test.describe("Popover", () => {
  const trigger = (page: Page) => page.getByRole("button", { name: "Fees" });
  const panel = (page: Page) => page.locator("#pop-fees");

  test("opens from its trigger and aria-expanded follows", async ({ page }) => {
    await open(page, "/docs/popover");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(panel(page)).toBeHidden();
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toContainText("Card fees");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    await expect(trigger(page)).toHaveAttribute("aria-controls", "pop-fees");
  });

  test("Escape closes it and focus returns to the trigger", async ({ page }) => {
    await open(page, "/docs/popover");
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(trigger(page)).toBeFocused();
  });

  test("a click outside closes it", async ({ page }) => {
    await open(page, "/docs/popover");
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("the trigger toggles it", async ({ page }) => {
    await open(page, "/docs/popover");
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await trigger(page).click();
    await expect(panel(page)).toBeHidden();
  });
});

test.describe("Dropdown", () => {
  const trigger = (page: Page) => page.getByRole("button", { name: "Actions" }).first();
  const panel = (page: Page) => page.locator("#dd-actions");
  const item = (page: Page, name: string) =>
    panel(page).getByRole("button", { name });

  test("opens from its trigger and aria-expanded follows", async ({ page }) => {
    await open(page, "/docs/dropdown");
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    await expect(trigger(page)).toHaveAttribute("aria-controls", "dd-actions");
  });

  test("ArrowDown on the trigger focuses the first item", async ({ page }) => {
    await open(page, "/docs/dropdown");
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeVisible();
    await trigger(page).focus();
    await page.keyboard.press("ArrowDown");
    await expect(item(page, "Edit")).toBeFocused();
  });

  test("arrows, Home and End move between the items", async ({ page }) => {
    await open(page, "/docs/dropdown");
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await item(page, "Edit").focus();
    await page.keyboard.press("ArrowDown");
    await expect(item(page, "Duplicate")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(panel(page).getByRole("link", { name: "View in store" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item(page, "Delete")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item(page, "Edit")).toBeFocused(); // wraps
    await page.keyboard.press("ArrowUp");
    await expect(item(page, "Delete")).toBeFocused(); // wraps back
    await page.keyboard.press("Home");
    await expect(item(page, "Edit")).toBeFocused();
    await page.keyboard.press("End");
    await expect(item(page, "Delete")).toBeFocused();
  });

  test("Escape closes it and focus returns to the trigger", async ({ page }) => {
    await open(page, "/docs/dropdown");
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(trigger(page)).toBeFocused();
  });

  test("choosing an item closes it", async ({ page }) => {
    await open(page, "/docs/dropdown");
    await trigger(page).click();
    await item(page, "Duplicate").click();
    await expect(panel(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("a click outside closes it", async ({ page }) => {
    await open(page, "/docs/dropdown");
    await trigger(page).click();
    await expect(panel(page)).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(panel(page)).toBeHidden();
  });
});

test.describe("Command", () => {
  const palette = (page: Page) => page.getByRole("dialog", { name: "Command menu" });
  const openPalette = async (page: Page) => {
    await page.getByRole("button", { name: "Open", exact: true }).first().click();
    await expect(palette(page)).toBeVisible();
  };
  const inline = (page: Page) => page.locator("#cmd-menu");

  test("the palette opens from its trigger with focus in the search field", async ({ page }) => {
    await open(page, "/docs/command");
    await expect(palette(page)).toBeHidden();
    await openPalette(page);
    await expect(palette(page).getByRole("combobox")).toBeFocused();
  });

  test("Escape closes the palette and focus returns to the trigger", async ({ page }) => {
    await open(page, "/docs/command");
    const trigger = page.getByRole("button", { name: "Open", exact: true }).first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(palette(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette(page)).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("a click outside closes the palette", async ({ page }) => {
    await open(page, "/docs/command");
    await needsClosedBy(page);
    await openPalette(page);
    await page.mouse.click(2, 2);
    await expect(palette(page)).toBeHidden();
  });

  test("Tab stays inside the palette", async ({ page }) => {
    await open(page, "/docs/command");
    await openPalette(page);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await focusNotBehind(page)).toBe(true);
    }
  });

  test("typing filters the items and shows what matched", async ({ page }) => {
    await open(page, "/docs/command");
    const box = inline(page).getByRole("combobox");
    await box.fill("bill");
    await expect(inline(page).getByRole("menuitem", { name: /Billing/ })).toBeVisible();
    await expect(inline(page).getByRole("menuitem", { name: /Profile/ })).toBeHidden();
    await expect(inline(page).getByRole("status")).toHaveText("1 result");
  });

  test("keywords match too", async ({ page }) => {
    await open(page, "/docs/command");
    await inline(page).getByRole("combobox").fill("invoice");
    await expect(inline(page).getByRole("menuitem", { name: /Billing/ })).toBeVisible();
    await expect(inline(page).getByRole("menuitem", { name: /Calendar/ })).toBeHidden();
  });

  test("no match announces the empty text", async ({ page }) => {
    await open(page, "/docs/command");
    await inline(page).getByRole("combobox").fill("zzzzqq");
    await expect(inline(page).getByRole("status")).toHaveText("No results found.");
    await expect(inline(page).getByRole("menuitem", { name: /Billing/ })).toBeHidden();
  });

  test("clearing the text brings every item back", async ({ page }) => {
    await open(page, "/docs/command");
    const box = inline(page).getByRole("combobox");
    await box.fill("zzzzqq");
    await box.fill("");
    await expect(inline(page).getByRole("menuitem", { name: /Billing/ })).toBeVisible();
    await expect(inline(page).getByRole("menuitem", { name: /Calendar/ })).toBeVisible();
    await expect(inline(page).getByRole("status")).toHaveText("");
  });

  test("arrow keys move the active item and Enter activates it", async ({ page }) => {
    await open(page, "/docs/command");
    const box = inline(page).getByRole("combobox");
    await box.focus();
    const active = inline(page).locator('[role="menuitem"].active');
    await expect(active).toContainText("Calendar");
    await page.keyboard.press("ArrowDown");
    await expect(active).toContainText("Search emoji");
    await page.keyboard.press("ArrowDown"); // the disabled Calculator is skipped
    await expect(active).toContainText("Profile");
    await page.keyboard.press("ArrowUp");
    await expect(active).toContainText("Search emoji");
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("#cmd-menu [role=menuitem]"))
        el.addEventListener("click", () => el.setAttribute("data-chosen", ""));
    });
    await page.keyboard.press("Enter");
    await expect(inline(page).locator("[data-chosen]")).toContainText("Search emoji");
  });

  test("a disabled item is not active when it is the only match", async ({ page }) => {
    await open(page, "/docs/command");
    await inline(page).getByRole("combobox").fill("billing");
    await expect(inline(page).locator('[role="menuitem"].active')).toContainText("Billing");
  });

  test("the palette filters and Enter picks the first match", async ({ page }) => {
    await open(page, "/docs/command");
    await openPalette(page);
    await palette(page).getByRole("combobox").fill("profile");
    await expect(palette(page).getByRole("status")).toHaveText("1 result");
    await expect(palette(page).locator('[role="menuitem"].active')).toContainText("Profile");
  });
});

test.describe("Tooltip", () => {
  const tipOf = (page: Page, label: string) =>
    page.evaluate((text) => {
      const el = [...document.querySelectorAll("[data-tooltip]")].find(
        (e) => e.getAttribute("data-tooltip") === text,
      )!;
      const s = getComputedStyle(el, "::after");
      return { display: s.display, content: s.content };
    }, label);

  test("shows on hover and hides when the pointer leaves", async ({ page }) => {
    await open(page, "/docs/tooltip");
    const button = page.getByRole("button", { name: "Hover" }).first();
    await expect.poll(() => tipOf(page, "Add to collection")).toMatchObject({ display: "none" });
    await button.hover();
    await expect
      .poll(() => tipOf(page, "Add to collection"))
      .toMatchObject({ display: "block", content: '"Add to collection"' });
    await page.mouse.move(2, 2);
    await expect.poll(() => tipOf(page, "Add to collection")).toMatchObject({ display: "none" });
  });

  test("shows on keyboard focus", async ({ page }) => {
    await open(page, "/docs/tooltip");
    const button = page.getByRole("button", { name: "Hover" }).first();
    await button.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab"); // keyboard focus, so :focus-visible applies
    await expect(button).toBeFocused();
    await expect
      .poll(() => tipOf(page, "Add to collection"))
      .toMatchObject({ display: "block" });
  });

  test("an icon button keeps its own accessible name", async ({ page }) => {
    await open(page, "/docs/tooltip");
    await expect(page.getByRole("button", { name: "Copy", exact: true }).first()).toHaveAttribute(
      "data-tooltip",
      "Copy",
    );
  });
});

// While a dialog or drawer fades out, [open] is already gone but the box is still
// drawn. Its direction must not depend on [open], or the parts line up in a row
// for the length of the close animation. Computed style is the same after it ends.
test.describe("Closing keeps the column layout", () => {
  for (const [path, id] of [
    ["/docs/dialog", "dlg-note"],
    ["/docs/drawer", "drw-filter"],
  ] as const) {
    test(`${id} stays a column when closed`, async ({ page }) => {
      await open(page, path);
      const direction = await page.evaluate(
        (id) => getComputedStyle(document.getElementById(id)!).flexDirection,
        id,
      );
      expect(direction).toBe("column");
    });
  }
});
