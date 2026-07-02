import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/auth-e2e",
	fullyParallel: false,
	reporter: [["html", { outputFolder: "playwright-report-auth" }], ["list"]],
	outputDir: "test-results-auth",
	use: {
		baseURL: "http://localhost:3002",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npx vite dev --port 3002",
		url: "http://localhost:3002",
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			AUTH_MODE: "full",
			DISABLE_HMR_OVERLAY: "1",
			ORGANIZATION_MODE: "multi",
			SESSION_SECRET: "e2e-session-secret-with-at-least-32-characters",
			USERS_PATH: "./data/e2e-auth/users",
			ORGANIZATIONS_PATH: "./data/e2e-auth/organizations",
			REPOSITORIES_PATH: "./data/e2e-auth/repositories",
			PULL_REQUESTS_PATH: "./data/e2e-auth/pull-requests",
		},
	},
});
