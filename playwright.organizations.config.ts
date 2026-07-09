import { defineConfig, devices } from "@playwright/test";

const databaseUrl = "file:./data/e2e-organizations/e2e.db";
const port = process.env.E2E_ORGANIZATIONS_PORT ?? "3101";
const baseURL = `http://localhost:${port}`;

process.env.E2E_DATABASE_URL = databaseUrl;

export default defineConfig({
	globalSetup: "./tests/e2e/global-setup.ts",
	testDir: "./tests/organizations-e2e",
	fullyParallel: false,
	reporter: [["html", { outputFolder: "playwright-report-organizations" }], ["list"]],
	outputDir: "test-results-organizations",
	use: {
		baseURL,
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: `npx prisma generate && npx vite dev --port ${port} --strictPort`,
		url: `${baseURL}/api/v1/openapi.json`,
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			AUTH_MODE: "noauth",
			DATABASE_URL: databaseUrl,
			DISABLE_HMR_OVERLAY: "1",
			ORGANIZATION_MODE: "multi",
		},
	},
});
