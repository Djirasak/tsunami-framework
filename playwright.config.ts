// Browser tests: bun run test:e2e
// They run against the docs (bun run docs), which holds a live example of every
// component. If the docs are not running, Playwright starts them.
//   E2E_URL         where the docs run (default http://localhost:5477)
//   CHROMIUM_PATH   use a Chromium you already have instead of the downloaded one
//   E2E_BROWSERS    "all" adds Firefox and WebKit (CI does); default is Chromium only
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_URL ?? "http://localhost:5477";
const all = process.env.E2E_BROWSERS === "all";
const chromium = {
  ...devices["Desktop Chrome"],
  launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
};

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: chromium },
    ...(all
      ? [
          { name: "firefox", use: devices["Desktop Firefox"] },
          { name: "webkit", use: devices["Desktop Safari"] },
        ]
      : []),
  ],
  webServer: {
    command: "bun run docs",
    url: `${baseURL}/docs`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
