import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";

test("recent repos sidebar toggles Show more / Show less", async ({ page }) => {
	test.setTimeout(60000);

	await page.goto("/organizations/default", { waitUntil: "load" });
	await waitForHydration(page);

	const showMore = page.getByText("Show more");
	const showLess = page.getByText("Show less");

	if (await showMore.isVisible()) {
		await expect(showLess).toHaveCount(0);
		await showMore.click();
		await page.waitForTimeout(300);
		await expect(showLess).toBeVisible();
		await expect(page.locator("text=Show more")).toHaveCount(0);
		await showLess.click();
		await page.waitForTimeout(300);
		await expect(showMore).toBeVisible();
		await expect(page.locator("text=Show less")).toHaveCount(0);
	}
});

test("clicking a recent repo in sidebar navigates to it", async ({ page }) => {
	test.setTimeout(60000);

	await page.goto("/organizations/default", { waitUntil: "load" });
	await waitForHydration(page);

	const recentRepo = page
		.getByRole("navigation")
		.getByRole("button", { name: /^e2e-(direct|empty)-/ })
		.first();
	if ((await recentRepo.count()) > 0) {
		const repoName = (await recentRepo.textContent())?.trim();
		if (!repoName) return;

		await recentRepo.click();
		await page.waitForURL((url) => {
			return url.pathname === `/organizations/default/repositories/${repoName}`;
		});
	}
});
