import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";

test("deletes a repository after exact name confirmation", async ({
	page,
}, testInfo) => {
	const name = `delete-${Date.now()}-${testInfo.workerIndex}`;

	await page.goto("/repositories", { waitUntil: "load" });
	await waitForHydration(page);
	await page.getByRole("button", { name: "New repository" }).click();
	await page.getByLabel("Repository name").fill(name);
	await page.getByRole("button", { name: "Create repository" }).click();
	await page.waitForLoadState("load");

	await page.getByRole("link", { name, exact: true }).first().click();
	await expect(page).toHaveURL(`/repositories/${name}`);
	await waitForHydration(page);
	await page.getByRole("tab", { name: "Settings" }).click();
	await expect(page).toHaveURL(`/repositories/${name}/settings`);

	await page.getByRole("button", { name: "Delete repository" }).click();
	const dialog = page.getByRole("dialog", { name: "Delete repository" });
	const confirmButton = dialog.getByRole("button", {
		name: "Delete repository",
	});

	await dialog.getByLabel("Repository name").fill(name.toUpperCase());
	await expect(confirmButton).toBeDisabled();

	await dialog.getByLabel("Repository name").fill(name);
	await expect(confirmButton).toBeEnabled();
	await confirmButton.click();

	await expect(page).toHaveURL("/repositories");
	await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
});
