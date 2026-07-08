import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";

async function waitForHydratedButton(
	page: Parameters<typeof waitForHydration>[0],
	label: string,
) {
	await page.waitForFunction(
		(text) =>
			Array.from(document.querySelectorAll("button")).some(
				(button) =>
					button.textContent?.includes(text) &&
					Object.keys(button).some((key) => key.startsWith("__reactProps")),
			),
		label,
	);
}

test("creates a task board and opens a card by direct URL", async ({
	page,
}, testInfo) => {
	const suffix = `${testInfo.project.name[0]}-${Date.now().toString(36).slice(-8)}`;
	const boardKey = `E2E-${suffix}`.toUpperCase();
	const cardTitle = `Prepare board ${suffix}`;

	await page.goto("/organizations/default");
	await waitForHydration(page);

	await waitForHydratedButton(page, "Tasks");
	await page.getByRole("button", { name: "Tasks" }).click();
	await expect(page).toHaveURL("/organizations/default/tasks");

	await waitForHydratedButton(page, "New board");
	await page.getByRole("button", { name: "New board" }).click();
	await page.getByLabel("Board key").fill(boardKey);
	await page.getByLabel("Board name").fill(`E2E board ${suffix}`);
	await waitForHydratedButton(page, "Create board");
	await page.getByRole("button", { name: "Create board" }).click();

	await expect(page).toHaveURL(`/organizations/default/tasks/${boardKey}`);
	for (const name of ["Backlog", "To do", "Doing", "Done"]) {
		await expect(page.getByText(name, { exact: true })).toBeVisible();
	}

	const addCardButton = page.getByRole("button", { name: "Add card" }).first();
	await expect(addCardButton).toBeVisible();
	await waitForHydratedButton(page, "Add card");
	await addCardButton.click();
	const createCardDialog = page.getByRole("dialog", { name: /New card in/ });
	await createCardDialog.getByLabel("Title").fill(cardTitle);
	await createCardDialog
		.getByLabel("Description")
		.fill("Created from the E2E test");
	await createCardDialog.getByRole("button", { name: "Create card" }).click();

	await expect(page).toHaveURL(
		`/organizations/default/tasks/${boardKey}/${boardKey}-1`,
	);
	const cardDialog = page.getByRole("dialog", { name: `${boardKey}-1` });
	await expect(cardDialog.getByLabel("Title")).toHaveValue(cardTitle);

	await page.goto(`/organizations/default/tasks/${boardKey}/${boardKey}-1`);
	await expect(cardDialog.getByLabel("Title")).toHaveValue(cardTitle);
});
