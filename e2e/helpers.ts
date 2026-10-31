/// <reference path="../types/index.d.ts" />
// Shared by the specs. Open a docs page and wait until Tsunami has started.
import { expect, type Page } from "@playwright/test";

export async function open(page: Page, path: string) {
  await page.goto(path);
  // The script runs in <head> and starts each component on DOMContentLoaded.
  await page.waitForFunction(() => typeof window.tsunami === "object");
  await page.waitForLoadState("load");
  // The docs hydrate after load; give the components a moment to finish their setup.
  await page.waitForTimeout(500);
}

// Fail a test on any uncaught error or console error (failed resource loads are not ours).
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
      errors.push(m.text());
  });
  return { expectNone: () => expect(errors).toEqual([]) };
}

declare global {
  interface Window {
    tsunami: Tsunami;
  }
}
