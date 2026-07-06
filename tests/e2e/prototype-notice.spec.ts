import { expect, test } from "@playwright/test";

test("shows prototype notification on page load", async ({ page }) => {
	await page.goto("/");

	const notification = page.getByText("Prototype", { exact: true });
	await expect(notification).toBeVisible();

	const message = page.getByText(/Data preservation is not guaranteed/);
	await expect(message).toBeVisible();
});

test("notification disappears on first interaction outside the notification", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.getByText("Prototype", { exact: true })).toBeVisible();

	await page.locator("body").click({ position: { x: 10, y: 10 } });

	await expect(page.getByText("Prototype", { exact: true })).not.toBeVisible();
});

test("notification appears on every page load", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("Prototype", { exact: true })).toBeVisible();
	await page.locator("body").click({ position: { x: 10, y: 10 } });
	await expect(page.getByText("Prototype", { exact: true })).not.toBeVisible();

	await page.goto("/settings");
	await expect(page.getByText("Prototype", { exact: true })).toBeVisible();
});
