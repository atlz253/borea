import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		include: ["tests/integration/**/*.integration.test.ts"],
		environment: "node",
		globals: true,
		testTimeout: 60_000,
		hookTimeout: 60_000,
		clearMocks: true,
		restoreMocks: true,
		setupFiles: ["./src/test-setup.ts"],
	},
});
