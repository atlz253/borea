import { expect, test } from "@playwright/test";

test("home page renders the main heading", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Start simple, ship quickly.",
	);
});

test("about page renders its heading", async ({ page }) => {
	await page.goto("/about");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"A small starter with room to grow.",
	);
});

test("navigation link goes to about page", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("link", { name: "About This Starter" }).click();
	await expect(page).toHaveURL("/about");
});
