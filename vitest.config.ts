import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [viteReact()],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		environment: "jsdom",
		environmentOptions: {
			jsdom: { url: "http://localhost:3000" },
		},
		globals: true,
		clearMocks: true,
		restoreMocks: true,
		setupFiles: ["./src/test-setup.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"**/*.{test,spec}.{ts,tsx}",
				"**/types/**",
				"src/routeTree.gen.ts",
			],
			reporter: ["text", "lcov"],
		},
	},
});
