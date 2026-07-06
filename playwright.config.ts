import { defineConfig, devices } from "@playwright/test";

const databaseUrl = "file:./data/e2e/e2e.db";

process.env.E2E_DATABASE_URL = databaseUrl;

export default defineConfig({
	globalSetup: "./tests/e2e/global-setup.ts",
	testDir: "./tests/e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 2,
	workers: process.env.CI ? 1 : undefined,
	reporter: [["html"], ["list"]],
	outputDir: "test-results",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],
	webServer: {
		command: "npm run dev",
		url: "http://localhost:3000",
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			AUTH_MODE: "noauth",
			DATABASE_URL: databaseUrl,
			DISABLE_HMR_OVERLAY: "1",
			ORGANIZATION_MODE: "single",
		},
	},
});
