import type { Locator, Page } from "@playwright/test";
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

async function dragToCenter(page: Page, source: Locator, target: Locator) {
	const sourceBox = await source.boundingBox();
	const targetBox = await target.boundingBox();
	expect(sourceBox).not.toBeNull();
	expect(targetBox).not.toBeNull();
	if (!sourceBox || !targetBox) {
		return;
	}
	await page.mouse.move(
		sourceBox.x + sourceBox.width / 2,
		sourceBox.y + sourceBox.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(
		sourceBox.x + sourceBox.width / 2 + 8,
		sourceBox.y + sourceBox.height / 2 + 8,
		{ steps: 4 },
	);
	await page.mouse.move(
		targetBox.x + targetBox.width / 2,
		targetBox.y + targetBox.height / 2,
		{ steps: 30 },
	);
	await page.waitForTimeout(100);
	await page.mouse.up();
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
	const emptyBacklogColumn = page.locator(
		'[data-testid="task-column"][data-column-name="Backlog"]',
	);
	const emptyBacklogCountBox = await emptyBacklogColumn
		.getByText("0 cards", { exact: true })
		.boundingBox();
	const emptyBacklogAddButtonBox = await emptyBacklogColumn
		.getByRole("button", { name: "Add card" })
		.boundingBox();
	expect(emptyBacklogCountBox).not.toBeNull();
	expect(emptyBacklogAddButtonBox).not.toBeNull();
	if (emptyBacklogCountBox && emptyBacklogAddButtonBox) {
		expect(emptyBacklogAddButtonBox.y - emptyBacklogCountBox.y).toBeLessThan(
			48,
		);
	}

	await expect(page.getByRole("button", { name: "Add column" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Delete column" })).toHaveCount(
		0,
	);
	await waitForHydratedButton(page, "Edit");
	await page.getByRole("button", { name: "Edit" }).click();
	await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

	const extraColumnName = `Review ${suffix}`;
	await page.getByLabel("New column").fill(extraColumnName);
	await page.getByRole("button", { name: "Add column" }).click();
	const extraColumn = page.locator(
		`[data-testid="task-column"][data-column-name="${extraColumnName}"]`,
	);
	await expect(extraColumn).toBeVisible();
	await extraColumn.getByRole("button", { name: "Delete column" }).click();
	await expect(
		page.getByText(`Delete column ${extraColumnName}?`, { exact: true }),
	).toBeVisible();
	await page
		.getByRole("menu")
		.getByRole("button", { name: "Delete column" })
		.click();
	await expect(extraColumn).toBeHidden();

	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Add column" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Delete column" })).toHaveCount(
		0,
	);

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
	await cardDialog.getByRole("button", { name: "Delete card" }).click();
	await expect(
		page.getByText(`Delete task ${boardKey}-1?`, { exact: true }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await page.keyboard.press("Escape");
	await expect(cardDialog).toBeHidden();

	await page.getByRole("button", { name: "Edit" }).click();
	const backlogColumn = page.locator(
		'[data-testid="task-column"][data-column-name="Backlog"]',
	);
	await backlogColumn.getByRole("button", { name: "Delete column" }).click();
	await expect(page.getByPlaceholder("Move cards to...")).toBeVisible();
	await page.getByPlaceholder("Move cards to...").click();
	await page.getByRole("option", { name: "To do" }).click();
	await expect(
		page.getByText("Delete column Backlog?", { exact: true }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Save" }).click();

	if (testInfo.project.name !== "chromium") {
		return;
	}

	await page.keyboard.press("Escape");
	const doingColumn = page.locator(
		'[data-testid="task-column"][data-column-name="Doing"]',
	);
	const doingDropzone = page.locator(
		'[data-testid="task-column-dropzone"][data-column-name="Doing"]',
	);
	const dragHandle = page.getByRole("button", {
		name: `Drag task ${boardKey}-1`,
	});
	await dragToCenter(page, dragHandle, doingDropzone);

	await expect(
		doingColumn.locator(`[data-card-public-id="${boardKey}-1"]`),
	).toContainText(cardTitle);

	await page.reload();
	await expect(
		doingColumn.locator(`[data-card-public-id="${boardKey}-1"]`),
	).toContainText(cardTitle);
});
