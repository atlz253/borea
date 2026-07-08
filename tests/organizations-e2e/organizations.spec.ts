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

test("sidebar switches from organizations to the current organization repositories", async ({
	page,
}) => {
	const suffix = Date.now().toString(36);
	const first = `sidebar-a-${suffix}`;
	const second = `sidebar-b-${suffix}`;
	const firstRepository = `first-${suffix}`;
	const secondRepository = `second-${suffix}`;

	await createOrganization(page, first);
	await createRepository(page, firstRepository);
	await createOrganization(page, second);
	await createRepository(page, secondRepository);

	await page.goto("/organizations");
	await waitForHydration(page);
	const sidebar = page.getByRole("navigation").first();
	await expect(
		sidebar.getByRole("button", { name: "Organizations" }),
	).toBeVisible();
	await sidebar.getByRole("button", { name: first }).click();
	await expect(page).toHaveURL(`/organizations/${first}`);

	await expect(
		sidebar.getByRole("button", { name: "Repositories" }),
	).toBeVisible();
	await expect(
		sidebar.getByRole("button", { name: firstRepository }),
	).toBeVisible();
	await expect(
		sidebar.getByRole("button", { name: secondRepository }),
	).toHaveCount(0);

	await sidebar.getByRole("button", { name: firstRepository }).click();
	await expect(page).toHaveURL(
		`/organizations/${first}/repositories/${firstRepository}`,
	);
	await expect(
		sidebar.getByRole("button", { name: "Repositories" }),
	).toBeVisible();
});

test("sidebar shows task boards for the current organization", async ({
	page,
	request,
}) => {
	const suffix = Date.now().toString(36);
	const organization = `sidebar-tasks-${suffix}`;
	const boardName = `Planning ${suffix}`;

	const organizationResponse = await request.post("/api/v1/organizations", {
		data: { name: organization },
	});
	expect(organizationResponse.ok()).toBe(true);
	const boardResponse = await request.post(
		`/api/v1/organizations/${organization}/task-boards`,
		{
			data: { key: "TASK", name: boardName },
		},
	);
	expect(boardResponse.ok()).toBe(true);

	await page.goto(`/organizations/${organization}`);
	await waitForHydration(page);
	const sidebar = page.getByRole("navigation").first();
	await expect(sidebar.getByRole("button", { name: "Tasks" })).toBeVisible();
	await expect(sidebar.getByRole("button", { name: boardName })).toBeVisible();

	await sidebar.getByRole("button", { name: boardName }).click();
	await expect(page).toHaveURL(`/organizations/${organization}/tasks/TASK`);
});

test("sidebar expands and collapses a long organization list", async ({
	page,
	request,
}) => {
	const suffix = Date.now().toString(36);
	const names = Array.from(
		{ length: 6 },
		(_, index) => `sidebar-list-${suffix}-${index}`,
	);
	for (const name of names) {
		const response = await request.post("/api/v1/organizations", {
			data: { name },
		});
		expect(response.ok()).toBe(true);
	}

	await page.goto("/organizations");
	await waitForHydration(page);
	const sidebar = page.getByRole("navigation").first();
	await expect(sidebar.getByText("Show more")).toBeVisible();
	await sidebar.getByText("Show more").click();

	for (const name of names) {
		await expect(sidebar.getByRole("button", { name })).toBeVisible();
	}
	await expect(sidebar.getByText("Show less")).toBeVisible();

	await sidebar.getByText("Show less").click();
	await expect(sidebar.getByText("Show more")).toBeVisible();
	await expect(sidebar.getByRole("button")).toHaveCount(6);
});
