import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/organizations-e2e",
	fullyParallel: false,
	reporter: [["html", { outputFolder: "playwright-report-organizations" }], ["list"]],
	outputDir: "test-results-organizations",
	use: {
		baseURL: "http://localhost:3001",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npx vite dev --port 3001",
		url: "http://localhost:3001",
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			AUTH_MODE: "noauth",
			DISABLE_HMR_OVERLAY: "1",
			ORGANIZATION_MODE: "multi",
			ORGANIZATIONS_PATH: "./data/e2e-organizations/organizations",
			REPOSITORIES_PATH: "./data/e2e-organizations/repositories",
			PULL_REQUESTS_PATH: "./data/e2e-organizations/pull-requests",
		},
	},
});
