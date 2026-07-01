import type { Page } from "@playwright/test";

export async function waitForHydration(page: Page) {
	await page.waitForFunction(
		() => {
			const btn = document.querySelector("button");
			return (
				!!btn && Object.keys(btn).some((k) => k.startsWith("__reactProps"))
			);
		},
		{ timeout: 10000 },
	);
}
