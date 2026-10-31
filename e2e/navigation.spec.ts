import { expect, test } from "@playwright/test";
import { open, watchErrors } from "./helpers";

test.describe("Tabs", () => {
  test("only the selected tab is a tab stop and it owns the visible panel", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await open(page, "/docs/tabs");
    const tabs = page.locator("#tb-line");
    const overview = tabs.getByRole("tab", { name: "Overview" });
    const analytics = tabs.getByRole("tab", { name: "Analytics" });
    await expect(overview).toHaveAttribute("aria-selected", "true");
    await expect(overview).not.toHaveAttribute("tabindex", "-1");
    await expect(analytics).toHaveAttribute("aria-selected", "false");
    await expect(analytics).toHaveAttribute("tabindex", "-1");
    await expect(tabs.getByRole("tabpanel")).toHaveCount(1);
    await expect(tabs.getByRole("tabpanel")).toHaveAccessibleName("Overview");
    await expect(tabs.locator('[role="tabpanel"]')).toHaveCount(3);
    errors.expectNone();
  });

  test("a click selects a tab and swaps the panel", async ({ page }) => {
    await open(page, "/docs/tabs");
    const tabs = page.locator("#tb-line");
    await tabs.getByRole("tab", { name: "Reports" }).click();
    await expect(tabs.getByRole("tab", { name: "Reports" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(tabs.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await expect(tabs.getByRole("tabpanel")).toHaveAccessibleName("Reports");
    await expect(tabs.locator('[role="tabpanel"]:not([hidden])')).toHaveCount(1);
  });

  test("arrow keys, Home and End move focus and selection, and wrap", async ({
    page,
  }) => {
    await open(page, "/docs/tabs");
    const tabs = page.locator("#tb-line");
    const overview = tabs.getByRole("tab", { name: "Overview" });
    const analytics = tabs.getByRole("tab", { name: "Analytics" });
    const reports = tabs.getByRole("tab", { name: "Reports" });
    await overview.focus();
    await page.keyboard.press("ArrowRight");
    await expect(analytics).toBeFocused();
    await expect(analytics).toHaveAttribute("aria-selected", "true");
    await expect(tabs.getByRole("tabpanel")).toHaveAccessibleName("Analytics");
    await page.keyboard.press("End");
    await expect(reports).toBeFocused();
    await expect(reports).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(overview).toBeFocused();
    await expect(overview).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(reports).toBeFocused();
    await page.keyboard.press("Home");
    await expect(overview).toBeFocused();
    await expect(overview).toHaveAttribute("tabindex", "0");
    await expect(reports).toHaveAttribute("tabindex", "-1");
  });

  test("a disabled tab is skipped by the keyboard", async ({ page }) => {
    await open(page, "/docs/tabs");
    const tabs = page.locator("#tb-dis");
    await tabs.getByRole("tab", { name: "Overview" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Reports" })).toBeFocused();
    await expect(tabs.getByRole("tab", { name: "Analytics" })).toBeDisabled();
    await expect(tabs.getByRole("tab", { name: "Analytics" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("a vertical tablist answers to Up and Down", async ({ page }) => {
    await open(page, "/docs/tabs");
    const tabs = page.locator("#tb-vert");
    const [first, second] = await tabs.getByRole("tab").all();
    await first.focus();
    await page.keyboard.press("ArrowDown");
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowUp");
    await expect(first).toBeFocused();
  });

  test("the close icon removes the tab and its panel and selects a neighbour", async ({
    page,
  }) => {
    await open(page, "/docs/tabs");
    const tabs = page.locator("#tb-close");
    await expect(tabs.getByRole("tab")).toHaveCount(3);
    await tabs
      .getByRole("tab", { name: "Order #1042" })
      .locator("[data-close]")
      .click();
    await expect(tabs.getByRole("tab")).toHaveCount(2);
    await expect(tabs.getByRole("tab", { name: "Order #1042" })).toHaveCount(0);
    await expect(tabs.getByRole("tab", { name: "Order #1043" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(tabs.locator('[role="tabpanel"]')).toHaveCount(2);
    await expect(tabs.locator('[role="tabpanel"]:not([hidden])')).toHaveCount(1);
  });

  test("Delete closes the focused closable tab and focus moves to the next one", async ({
    page,
  }) => {
    await open(page, "/docs/tabs");
    const tabs = page.locator("#tb-close");
    await tabs.getByRole("tab", { name: "Order #1042" }).focus();
    await page.keyboard.press("Delete");
    await expect(tabs.getByRole("tab", { name: "Order #1042" })).toHaveCount(0);
    await expect(tabs.getByRole("tab", { name: "Order #1043" })).toBeFocused();
  });
});

test.describe("Tree", () => {
  const tree = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Help articles" });

  test("exposes the tree roles and one tab stop", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, "/docs/tree");
    const t = tree(page);
    await expect(t.getByRole("tree")).toHaveCount(1);
    const orders = t.getByRole("treeitem", { name: "Orders" });
    await expect(orders).toHaveAttribute("aria-expanded", "true");
    await expect(t.getByRole("treeitem", { name: "Fulfillment" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(t.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);
    errors.expectNone();
  });

  test("Up, Down, Home and End move between visible items", async ({ page }) => {
    await open(page, "/docs/tree");
    const t = tree(page);
    const items = t.getByRole("treeitem");
    const first = items.first();
    await first.focus();
    await page.keyboard.press("ArrowDown");
    await expect(t.getByRole("treeitem", { name: "Refund an order" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(t.getByRole("treeitem", { name: "Fulfillment" })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(t.getByRole("treeitem", { name: "Refund an order" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(items.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(first).toBeFocused();
  });

  test("ArrowRight and ArrowLeft expand, descend, collapse and climb", async ({
    page,
  }) => {
    await open(page, "/docs/tree");
    const t = tree(page);
    const folder = t.getByRole("treeitem", { name: "Fulfillment" });
    const child = t.getByRole("treeitem", { name: "Split a shipment" });
    await folder.focus();
    await expect(child).toBeHidden();
    await page.keyboard.press("ArrowRight");
    await expect(folder).toHaveAttribute("aria-expanded", "true");
    await expect(child).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(child).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(folder).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(folder).toHaveAttribute("aria-expanded", "false");
    await expect(child).toBeHidden();
    await page.keyboard.press("ArrowLeft");
    await expect(t.getByRole("treeitem", { name: "Orders" })).toBeFocused();
  });

  test("the search field filters the files and opens their folders", async ({
    page,
  }) => {
    await open(page, "/docs/tree");
    const t = page.getByRole("navigation", { name: "Theme files" });
    const search = t.getByRole("searchbox", { name: "Search theme files" });
    const base = t.getByRole("treeitem", { name: "base.html" });
    const cart = t.getByRole("treeitem", { name: "cart.html" });
    await expect(base).toBeHidden(); // its folder starts closed
    await expect(cart).toBeVisible();
    await search.fill("base");
    await expect(base).toBeVisible();
    await expect(cart).toBeHidden();
    await search.fill("");
    await expect(base).toBeHidden();
    await expect(cart).toBeVisible();
  });
});

test.describe("Accordion", () => {
  test("clicking a summary opens and closes its item", async ({ page }) => {
    await open(page, "/docs/accordion");
    const care = page
      .locator(".docs-preview details:not([name])")
      .filter({ hasText: "Machine wash cold" });
    const summary = care.locator("summary");
    await expect(care).not.toHaveAttribute("open", "");
    await summary.click();
    await expect(care).toHaveAttribute("open", "");
    await summary.click();
    await expect(care).not.toHaveAttribute("open", "");
  });

  test("Enter and Space on a focused summary toggle it", async ({ page }) => {
    await open(page, "/docs/accordion");
    const item = page
      .locator(".docs-preview details:not([name])")
      .filter({ hasText: "Machine wash cold" });
    await item.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(item).toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(item).not.toHaveAttribute("open", "");
  });

  test("items with the same name are exclusive", async ({ page }) => {
    await open(page, "/docs/accordion");
    const first = page.locator('details[name="faq"]').nth(0);
    const second = page.locator('details[name="faq"]').nth(1);
    await expect(first).toHaveAttribute("open", "");
    await second.locator("summary").click();
    await expect(second).toHaveAttribute("open", "");
    await expect(first).not.toHaveAttribute("open", "");
    await expect(page.locator('details[name="faq"][open]')).toHaveCount(1);
  });

  test("a disabled item stays closed and is skipped by Tab", async ({ page }) => {
    await open(page, "/docs/accordion");
    const [credit, cash] = await page.locator('details[name="pay"]').all();
    const disabled = cash.locator("summary");
    await expect(disabled).toHaveAttribute("aria-disabled", "true");
    await disabled.click({ force: true });
    await expect(cash).not.toHaveAttribute("open", "");
    await credit.locator("summary").focus();
    await page.keyboard.press("Tab");
    await expect(disabled).not.toBeFocused();
  });
});

test.describe("Sidebar", () => {
  test("the toggle collapses and expands it and keeps aria-expanded in step", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await open(page, "/docs/sidebar");
    const sidebar = page.locator("#sb-usage");
    const toggle = page.getByRole("button", { name: "Collapse or expand sidebar" });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar).not.toHaveAttribute("data-collapsed", "true");
    await toggle.click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    errors.expectNone();
  });

  test("the toggle also works from the keyboard", async ({ page }) => {
    await open(page, "/docs/sidebar");
    const toggle = page.getByRole("button", { name: "Collapse or expand sidebar" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#sb-usage")).toHaveAttribute("data-collapsed", "true");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 375, height: 800 } });

    test("the drawer opens, takes focus, and Esc closes it and gives focus back", async ({
      page,
    }) => {
      await open(page, "/docs/sidebar");
      const menu = page.getByRole("button", { name: "Open menu" });
      const drawer = page.locator("#docs-nav");
      await expect(drawer).toBeHidden();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await menu.focus();
      await page.keyboard.press("Enter");
      await expect(drawer).toBeVisible();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await expect(drawer.locator(":focus")).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(menu).toBeFocused();
    });
  });
});

test.describe("Stepper", () => {
  const wizard = (page: import("@playwright/test").Page) => page.locator("#wiz");

  test("starts on step 1 with the later steps disabled", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, "/docs/stepper");
    const wiz = wizard(page);
    await expect(wiz.getByRole("button", { name: /Account/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(wiz.getByRole("button", { name: /Plan/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(wiz.getByRole("button", { name: /Review/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(wiz.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(wiz.getByRole("heading", { name: "Choose a plan" })).toBeHidden();
    errors.expectNone();
  });

  test("clicking a disabled future step does nothing", async ({ page }) => {
    await open(page, "/docs/stepper");
    const wiz = wizard(page);
    await wiz.getByRole("button", { name: /Review/ }).click({ force: true });
    await expect(wiz.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(wiz.getByRole("button", { name: /Account/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  test("Next refuses to move on while a required field is empty", async ({ page }) => {
    await open(page, "/docs/stepper");
    const wiz = wizard(page);
    await wiz.getByRole("button", { name: "Next" }).click();
    await expect(wiz.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(wiz.getByLabel("Name *")).toBeFocused();
    await expect(wiz.getByRole("button", { name: /Plan/ })).not.toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  test("Next moves to the panel heading, Back returns, and the done step is reachable", async ({
    page,
  }) => {
    await open(page, "/docs/stepper");
    const wiz = wizard(page);
    await wiz.getByLabel("Name *").fill("Ada Lovelace");
    await wiz.getByLabel("Email *").fill("ada@example.com");
    await wiz.getByRole("button", { name: "Next" }).click();
    const heading = wiz.getByRole("heading", { name: "Choose a plan" });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(wiz.getByRole("button", { name: /Plan/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(wiz.getByRole("button", { name: /Account/ })).toHaveAttribute(
      "data-state",
      "done",
    );
    await expect(wiz.getByRole("heading", { name: "Create your account" })).toBeHidden();

    await wiz.getByRole("button", { name: "Back" }).click();
    await expect(wiz.getByRole("heading", { name: "Create your account" })).toBeFocused();
    await expect(wiz.getByLabel("Name *")).toHaveValue("Ada Lovelace");
    await expect(wiz.getByRole("button", { name: /Plan/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("the whole flow ends on a review of the answers", async ({ page }) => {
    await open(page, "/docs/stepper");
    const wiz = wizard(page);
    await wiz.getByLabel("Name *").fill("Ada Lovelace");
    await wiz.getByLabel("Email *").fill("ada@example.com");
    await wiz.getByRole("button", { name: "Next" }).click();
    await wiz.getByRole("button", { name: "Next" }).click();
    await expect(wiz.getByRole("heading", { name: "Choose a plan" })).toBeVisible();
    await wiz.getByLabel("Plan *").selectOption("Team");
    await wiz.getByRole("button", { name: "Next" }).click();
    await expect(wiz.getByRole("heading", { name: "Review" })).toBeFocused();
    await expect(wiz.getByText("Ada Lovelace")).toBeVisible();
    await expect(wiz.locator("dd", { hasText: "Team" })).toBeVisible();
    await expect(wiz.getByRole("status")).toHaveText("Step 3 of 3.");
  });
});

test.describe("Breadcrumb, Subnav and Pagination", () => {
  test("the breadcrumb marks the current page and links to the parents", async ({
    page,
  }) => {
    await open(page, "/docs/breadcrumb");
    const nav = page.getByRole("navigation", { name: "Breadcrumb" }).first();
    await expect(nav.getByRole("link")).toHaveCount(2);
    await expect(nav.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/docs");
    await expect(nav.locator('[aria-current="page"]')).toHaveText("#100482");
    await expect(nav.getByRole("link", { name: "#100482" })).toHaveCount(0);
  });

  test("the subnav marks one link as the current page", async ({ page }) => {
    await open(page, "/docs/subnav");
    const nav = page.getByRole("navigation", { name: "Store settings" }).first();
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole("link", { name: "Markets" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "General" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("pagination marks the current page", async ({ page }) => {
    await open(page, "/docs/pagination");
    const nav = page.getByRole("navigation", { name: "Pagination", exact: true });
    await expect(nav.locator('[aria-current="page"]')).toHaveText("2");
    await expect(nav.getByRole("link", { name: "3" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("a disabled pagination link is announced as disabled and does not navigate", async ({
    page,
  }) => {
    await open(page, "/docs/pagination");
    const nav = page.getByRole("navigation", { name: "Compact pagination" });
    const first = nav.getByRole("link", { name: "First page" });
    await expect(first).toHaveAttribute("aria-disabled", "true");
    await expect(first).not.toHaveAttribute("href", /.+/);
    await expect(nav.getByRole("link", { name: "Next page" })).toHaveAttribute("href", /.+/);
    await expect(nav.locator('[aria-current="page"]')).toHaveText("1");
    const before = page.url();
    await first.click({ force: true });
    expect(page.url()).toBe(before);
  });
});

test.describe("Theme switcher", () => {
  test("the buttons set data-theme and keep aria-pressed in step", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, "/docs/theme-switcher");
    const group = page.getByRole("banner").getByRole("group", { name: "Theme" });
    const dark = group.getByRole("button", { name: "Dark" });
    const light = group.getByRole("button", { name: "Light" });
    await dark.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    await expect(light).toHaveAttribute("aria-pressed", "false");
    await light.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(light).toHaveAttribute("aria-pressed", "true");
    await expect(dark).toHaveAttribute("aria-pressed", "false");
    errors.expectNone();
  });

  test("the choice survives a reload", async ({ page }) => {
    await open(page, "/docs/theme-switcher");
    await page
      .getByRole("banner")
      .getByRole("group", { name: "Theme" })
      .getByRole("button", { name: "Dark" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await open(page, "/docs/theme-switcher");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("banner").getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Toast", () => {
  test("a toast appears as a status and its Close button dismisses it", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await open(page, "/docs/toast");
    await page.locator('[data-demo="basic"]').click();
    const toast = page.getByRole("status").filter({ hasText: "Order archived" });
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "Close" }).click();
    await expect(toast).toHaveCount(0);
    errors.expectNone();
  });

  test("a danger toast is an alert and stays until it is closed", async ({ page }) => {
    await open(page, "/docs/toast");
    await page.getByRole("button", { name: "Danger", exact: true }).click();
    const toast = page.getByRole("alert").filter({ has: page.getByRole("button", { name: "Close" }) });
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "Close" }).click();
    await expect(toast).toHaveCount(0);
  });

  test("closing a toast that had focus hands focus back to the button that opened it", async ({
    page,
  }) => {
    await open(page, "/docs/toast");
    const opener = page.locator('[data-demo="basic"]');
    await opener.focus();
    await page.keyboard.press("Enter");
    const toast = page.getByRole("status").filter({ hasText: "Order archived" });
    const close = toast.getByRole("button", { name: "Close" });
    await expect(close).toBeVisible();
    await close.focus();
    await page.keyboard.press("Enter");
    await expect(toast).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
});

test.describe("Copy button", () => {
  test("copies the text to the clipboard and shows the Copied state", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const errors = watchErrors(page);
    await open(page, "/docs/copy-button");
    // Its accessible name flips to "Copied", so find it by what it copies.
    const button = page.locator('[data-copy="ORD-110963"]');
    await expect(button).toHaveAccessibleName("Copy order number");
    await expect(button).not.toHaveAttribute("data-copied", "");
    await button.click();
    await expect(button).toHaveAttribute("data-copied", "");
    await expect(button).toContainText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ORD-110963");
    await expect(page.getByRole("status").filter({ hasText: "Copied" })).toHaveCount(1);
    // The state goes back by itself.
    await expect(button).not.toHaveAttribute("data-copied", "");
    errors.expectNone();
  });

  // A code block can scroll sideways, so the keyboard must be able to reach it.
  test("a code block's pre can be focused with the keyboard", async ({ page }) => {
    await open(page, "/docs/copy-button");
    const pre = page.locator(".code-block > pre").first();
    await expect(pre).toHaveAttribute("tabindex", "0");
    await pre.focus();
    await expect(pre).toBeFocused();
  });
});

test.describe("Scroll area", () => {
  // A table that scrolls sideways on a phone must be reachable with the keyboard.
  test("gets tabindex 0 unless the page sets its own", async ({ page }) => {
    await open(page, "/docs/scroll-area");
    const result = await page.evaluate(() => {
      const make = (attrs: Record<string, string>) => {
        const el = document.createElement("div");
        el.className = "scroll-area";
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        document.body.append(el);
        return el;
      };
      return [make({}), make({ tabindex: "-1" })];
    });
    void result;
    await expect(page.locator(".scroll-area:not([tabindex])")).toHaveCount(0);
    await expect(page.locator('body > .scroll-area[tabindex="0"]')).toHaveCount(1);
    await expect(page.locator('body > .scroll-area[tabindex="-1"]')).toHaveCount(1);
  });
});
