import { expect, test } from "@playwright/test";

test("home page redirects to repositories", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL("/repositories");
});

test("repositories page renders its heading", async ({ page }) => {
	await page.goto("/repositories");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Repositories",
	);
});

test("sidebar navigation links to repositories page", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("link", { name: "Repositories" }).click();
	await expect(page).toHaveURL("/repositories");
});

test("header renders logo and theme toggle", async ({ page }) => {
	await page.goto("/repositories");

	await expect(page.getByRole("link", { name: "Nirvana" })).toHaveAttribute(
		"href",
		"/",
	);
	await expect(
		page.getByRole("button", { name: /theme|auto|light|dark/i }),
	).toBeVisible();
});
