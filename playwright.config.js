import { defineConfig } from "@playwright/test";

/** @type {import("@playwright/test").PlaywrightTestConfig} */
export default defineConfig({
  testDir: "./test",
  testMatch: /.*\.spec\.js$/,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "npx http-server . -c-1 -a 127.0.0.1 -p 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
