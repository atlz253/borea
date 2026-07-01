import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	optimizeDeps: {
		exclude: ["unicorn-magic"],
	},
	server: process.env.DISABLE_HMR_OVERLAY
		? { hmr: { overlay: false } }
		: undefined,
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
