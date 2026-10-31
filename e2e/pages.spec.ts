import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { open, watchErrors } from "./helpers";

test.describe.configure({ mode: "parallel" });
// The docs run in dev mode: the first visit to a page compiles it.
test.setTimeout(90_000);

const read = (file: string) => readFileSync(`site/content/${file}`, "utf8");
const docSlugs = Object.keys(JSON.parse(read("pages.json")));
const exampleSlugs = Object.keys(JSON.parse(read("examples.json")));
const navHrefs = [...read("nav.json").matchAll(/"href":\s*"([^"]+)"/g)].map((m) => m[1]);

const docPath = (slug: string) => (slug === "index" ? "/docs" : `/docs/${slug}`);
const pages = [
  { name: "/", path: "/", h1: false },
  ...docSlugs.map((s) => ({ name: docPath(s), path: docPath(s), h1: true })),
  ...exampleSlugs.map((s) => ({ name: `/examples/${s}`, path: `/examples/${s}`, h1: false })),
];

// Pages that scroll sideways at 375px for a known, not yet fixed reason. Empty now:
// add "/docs/<slug>": "why" and the page's test is marked fixme until it is fixed.
const overflowFixme: Record<string, string> = {};

test.describe("every page", () => {
  for (const p of pages) {
    test(`${p.name} loads cleanly`, async ({ page }) => {
      test.fixme(p.name in overflowFixme, overflowFixme[p.name]);
      const errors = watchErrors(page);
      await page.setViewportSize({ width: 375, height: 800 });
      const res = await page.goto(p.path);
      expect(res?.status()).toBe(200);
      await page.waitForFunction(() => typeof (window as any).tsunami === "object");
      await page.waitForLoadState("load");
      expect((await page.title()).trim()).not.toBe("");
      // Live demos (.docs-preview) may hold their own h1; the page has one of its own.
      if (p.h1) await expect(page.locator("h1:not(.docs-preview h1)")).toHaveCount(1);
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
      errors.expectNone();
    });
  }
});

test.describe("docs sidebar", () => {
  test("every nav.json href resolves", async ({ request }) => {
    expect(navHrefs.length).toBeGreaterThan(0);
    const bad: string[] = [];
    await Promise.all(
      navHrefs.map(async (h) => {
        const res = await request.get(h);
        if (res.status() !== 200) bad.push(`${h} ${res.status()}`);
      }),
    );
    expect(bad).toEqual([]);
  });

  test("the current page link has aria-current=page", async ({ page }) => {
    await open(page, "/docs/badge");
    const link = page.locator('nav[aria-label="Docs"] a[aria-current="page"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", "/docs/badge");
  });

  test("search finds a page by a keyword", async ({ page }) => {
    await open(page, "/docs");
    const dialog = page.locator("dialog#docs-palette");
    // The button works once the page has hydrated; click again until the dialog opens.
    await expect(async () => {
      await page.locator("button.docs-search").click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await dialog.locator("input").first().fill("stepper");
    await expect(dialog.locator('a[href="/docs/stepper"]').first()).toBeVisible();
  });
});

test.describe("example pages", () => {
  for (const slug of exampleSlugs) {
    test(`${slug}: Home and Source links work`, async ({ page }) => {
      await page.goto(`/examples/${slug}`);
      const nav = page.getByRole("navigation", { name: "Example" });
      const source = nav.getByRole("link", { name: "Source" });
      await expect(source).toHaveAttribute(
        "href",
        new RegExp(`/blob/main/site/content/examples/${slug}\\.html$`),
      );
      const home = nav.getByRole("link", { name: "Home" });
      await expect(home).toHaveAttribute("href", "/");
      await home.click();
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

test.describe("example flows", () => {
  test("login: sign in, then the one-time code", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, "/examples/login");
    await page.getByLabel("Email").fill("mina.park@example.com");
    await page.locator("#password").fill("secret-pass");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#step-code")).toBeVisible();
    await expect(page.locator("#step-signin")).toBeHidden();
    await page.locator("#step-code .otp input").first().click();
    await page.keyboard.type("123456");
    await expect(page.locator("#step-done")).toBeVisible();
    await expect(page.getByRole("heading", { name: "You are signed in" })).toBeVisible();
    errors.expectNone();
  });

  test("login: a wrong code shows the error", async ({ page }) => {
    await open(page, "/examples/login");
    await page.getByLabel("Email").fill("mina.park@example.com");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.locator("#step-code .otp input").first().click();
    await page.keyboard.type("000000");
    await expect(page.locator("#code-error")).toBeVisible();
  });

  test("login: an invalid email stays on the first step", async ({ page }) => {
    await open(page, "/examples/login");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#step-code")).toBeHidden();
  });

  test("settings: the stepper moves forward when the fields are valid", async ({ page }) => {
    const errors = watchErrors(page);
    await open(page, "/examples/settings");
    const stepper = page.locator("#setup");
    const next = stepper.locator("[data-next]:visible");
    const current = stepper.locator('ol li [aria-current="step"], ol li[aria-current="step"]');
    await expect(current).toContainText("Store details");
    // Empty required fields: the stepper stays on step one.
    await next.click();
    await expect(current).toContainText("Store details");
    await stepper.locator("#st-name").fill("Harbor & Co");
    await stepper.locator("#st-slug").fill("harbor-co");
    await stepper.locator("#st-currency").selectOption("THB");
    await stepper.locator("#st-tz").selectOption({ label: "UTC+07:00 Bangkok" });
    await next.click();
    await expect(current).toContainText("Team");
    await expect(stepper.getByRole("heading", { name: "Team" })).toBeVisible();
    errors.expectNone();
  });
});
