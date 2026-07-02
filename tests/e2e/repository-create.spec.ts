import { expect, test } from "@playwright/test";

test("page loads with no errors and shows repositories heading", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (err) => errors.push(err.message));

	await page.goto("/organizations/default");
	await page.waitForLoadState("load");

	expect(errors).toEqual([]);
	await expect(page.getByRole("heading", { name: "default" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: /new repository/i }),
	).toHaveCount(1);
});
