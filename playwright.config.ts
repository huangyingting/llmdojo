import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3456",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "PORT=3456 NEXTAUTH_URL=http://127.0.0.1:3456 npm run start",
    url: "http://127.0.0.1:3456/api/health",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
