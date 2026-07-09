import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";

test("language toggle is visible in header", async ({ page }) => {
	await page.goto("/organizations/default");
	await waitForHydration(page);
	await expect(page.getByRole("button", { name: /EN|RU/ })).toBeVisible();
});

test("switching to Russian changes UI text", async ({ page }) => {
	await page.goto("/organizations/default");
	await waitForHydration(page);
	await page.getByRole("button", { name: /EN|RU/ }).click();
	await page.getByRole("menuitem", { name: "RU" }).click();

	await expect(page.getByRole("button", { name: "Репозитории" })).toBeVisible();
	await expect(page.getByRole("button", { name: "RU" })).toBeVisible();
});

test("locale persists after page reload", async ({ page }) => {
	await page.goto("/organizations/default");
	await waitForHydration(page);
	await page.getByRole("button", { name: /EN|RU/ }).click();
	await page.getByRole("menuitem", { name: "RU" }).click();
	await expect(page.getByRole("button", { name: "Репозитории" })).toBeVisible();

	await page.reload();
	await waitForHydration(page);
	await expect(page.getByRole("button", { name: "Репозитории" })).toBeVisible();
	await expect(page.getByRole("button", { name: "RU" })).toBeVisible();
});

test("switching back to English restores original text", async ({ page }) => {
	await page.goto("/organizations/default");
	await waitForHydration(page);

	await page.getByRole("button", { name: /EN|RU/ }).click();
	await page.getByRole("menuitem", { name: "RU" }).click();
	await expect(page.getByRole("button", { name: "Репозитории" })).toBeVisible();

	await page.getByRole("button", { name: "RU" }).click();
	await expect(page.getByRole("menuitem", { name: "EN" })).toBeVisible();
	await page.getByRole("menuitem", { name: "EN" }).click();
	await expect(
		page.getByRole("button", { name: "Repositories" }),
	).toBeVisible();
});
