import { expect, type Page, test } from "@playwright/test";

const UNIQUE = Date.now().toString(36);

async function waitForHydration(page: Page) {
	await page.waitForFunction(
		() => {
			const btn = document.querySelector("button");
			return (
				!!btn && Object.keys(btn).some((k) => k.startsWith("__reactProps"))
			);
		},
		{ timeout: 10000 },
	);
}

async function createRepoViaUI(page: Page, repoName: string) {
	await page.goto("/organizations/default", { waitUntil: "load" });
	await waitForHydration(page);

	await page.getByRole("button", { name: /new repository/i }).click();
	const nameInput = page.getByLabel(/repository name/i);
	await nameInput.fill(repoName);
	await page.getByRole("button", { name: /create repository/i }).click();

	await nameInput.waitFor({ state: "detached", timeout: 15000 });
	await page.waitForURL(`/organizations/default/repositories/${repoName}`, {
		timeout: 15000,
	});
	await page.waitForLoadState("load");
	await waitForHydration(page);
}

function collectRealErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on("pageerror", (err) => {
		const msg = err.message;
		if (
			!msg.includes("console-pipe/sse") &&
			!msg.includes("access control") &&
			!msg.includes("error loading dynamically imported module") &&
			!msg.includes("Importing a module script failed") &&
			!msg.includes("Load failed")
		) {
			errors.push(msg);
		}
	});
	return errors;
}

test("navigating from repositories list to a repo shows empty state", async ({
	page,
}) => {
	test.setTimeout(60000);
	const errors = collectRealErrors(page);

	const repoName = `e2e-empty-${UNIQUE}`;
	await createRepoViaUI(page, repoName);

	await page.goto("/organizations/default", { waitUntil: "load" });
	await waitForHydration(page);
	const link = page.getByRole("link", { name: repoName });
	await link.click();
	await page.waitForURL(`/organizations/default/repositories/${repoName}`, {
		timeout: 10000,
	});

	await expect(page.getByRole("heading", { name: repoName })).toBeVisible();
	await expect(page.getByText("This repository is empty")).toBeVisible();

	expect(errors).toEqual([]);
});

test("direct URL to an empty repo shows empty state", async ({ page }) => {
	const errors = collectRealErrors(page);

	const repoName = `e2e-direct-${UNIQUE}`;
	await createRepoViaUI(page, repoName);

	await page.goto(`/organizations/default/repositories/${repoName}`, {
		waitUntil: "load",
	});

	await expect(page.getByText("This repository is empty")).toBeVisible();

	expect(errors).toEqual([]);
});

test("non-existent repo shows an error", async ({ page }) => {
	await page.goto(
		`/organizations/default/repositories/does-not-exist-${UNIQUE}`,
		{
			waitUntil: "load",
		},
	);

	await expect(page.getByText(/not found/i)).toBeVisible();
});
