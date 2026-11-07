import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.spec.mjs",
  // `next dev` compiles a page the first time it is asked for, which takes a while.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  // One at a time: the tests share that dev server, and clock tests are timing sensitive.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the Chrome already on the machine, and on GitHub's runners.
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/auth/login`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_DIST_DIR: ".next-e2e", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
