import { defineConfig, devices } from "@playwright/test";

const databaseUrl = "file:./data/e2e-auth/e2e.db";
const repositoriesPath = "./data/e2e-auth/repositories";
const port = process.env.E2E_AUTH_PORT ?? "3102";
const baseURL = `http://localhost:${port}`;

process.env.E2E_DATABASE_URL = databaseUrl;

export default defineConfig({
	globalSetup: "./tests/e2e/global-setup.ts",
	testDir: "./tests/auth-e2e",
	fullyParallel: false,
	reporter: [["html", { outputFolder: "playwright-report-auth" }], ["list"]],
	outputDir: "test-results-auth",
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
			AUTH_MODE: "full",
			DATABASE_URL: databaseUrl,
			DISABLE_HMR_OVERLAY: "1",
			ORGANIZATION_MODE: "multi",
			REPOSITORIES_PATH: repositoriesPath,
			SESSION_SECRET: "e2e-session-secret-with-at-least-32-characters",
		},
	},
});
