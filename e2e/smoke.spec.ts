import { expect, test } from "@playwright/test";
import { open, watchErrors } from "./helpers";

test("the theme switcher changes data-theme", async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, "/docs/theme-switcher");
  await page.locator('[data-theme-toggle="dark"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator('[data-theme-toggle="light"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  errors.expectNone();
});
