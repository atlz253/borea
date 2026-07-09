import { expect, type Locator, type Page } from "@playwright/test";

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

export async function fillTextInput(locator: Locator, value: string) {
	await locator.clear();
	await locator.pressSequentially(value);
	await expect(locator).toHaveValue(value);
}
