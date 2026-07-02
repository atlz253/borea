import { expect, test } from "@playwright/test";

async function waitForHydration(page: import("@playwright/test").Page) {
	await page.waitForFunction(() => {
		const button = document.querySelector("button");
		return (
			button !== null &&
			Object.keys(button).some((key) => key.startsWith("__reactProps"))
		);
	});
}

async function createOrganization(
	page: import("@playwright/test").Page,
	name: string,
) {
	await page.goto("/organizations");
	await waitForHydration(page);
	await page.getByRole("button", { name: "New organization" }).click();
	await page.getByLabel("Organization name").fill(name);
	await page.getByRole("button", { name: "Create organization" }).click();
	await expect(page).toHaveURL(`/organizations/${name}`);
}

async function createRepository(
	page: import("@playwright/test").Page,
	name: string,
) {
	await waitForHydration(page);
	await page.getByRole("button", { name: "New repository" }).click();
	await page.getByLabel("Repository name").fill(name);
	await page.getByRole("button", { name: "Create repository" }).click();
	await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
}

test("creates organizations and isolates repositories by namespace", async ({
	page,
	request,
}) => {
	const suffix = Date.now().toString(36);
	const first = `team-a-${suffix}`;
	const second = `team-b-${suffix}`;
	const repository = `shared-${suffix}`;

	await createOrganization(page, first);
	await createRepository(page, repository);
	await createOrganization(page, second);
	await createRepository(page, repository);

	const firstRepositories = await request.get(
		`/api/v1/organizations/${first}/repositories`,
	);
	const secondRepositories = await request.get(
		`/api/v1/organizations/${second}/repositories`,
	);

	expect(firstRepositories.ok()).toBe(true);
	expect(secondRepositories.ok()).toBe(true);
	await expect(firstRepositories.json()).resolves.toMatchObject([
		{ organizationName: first, name: repository },
	]);
	await expect(secondRepositories.json()).resolves.toMatchObject([
		{ organizationName: second, name: repository },
	]);
});
