import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";

test("home page redirects to repositories", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL("/repositories");
});

test("NoAuth mode bypasses the authentication page", async ({ page }) => {
	await page.goto("/auth");
	await expect(page).toHaveURL("/repositories");
});

test("repositories page renders its heading", async ({ page }) => {
	await page.goto("/organizations/default");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("default");
});

test("sidebar navigation links to repositories page", async ({ page }) => {
	await page.goto("/");
	await waitForHydration(page);
	await page.getByRole("button", { name: "Repositories" }).click();
	await expect(page).toHaveURL("/repositories");
});

test("header renders logo and theme toggle", async ({ page }) => {
	await page.goto("/organizations/default");

	await expect(page.getByRole("link", { name: "Borea" })).toHaveAttribute(
		"href",
		"/",
	);
	await expect(
		page.getByRole("button", { name: /theme|auto|light|dark/i }),
	).toBeVisible();
});

test("NoAuth mode banner is visible on page", async ({ page }) => {
	await page.goto("/organizations/default");
	await expect(page.getByText(/NoAuth mode/)).toBeVisible();
	await expect(page.getByText(/Do not use in production/)).toBeVisible();
});
