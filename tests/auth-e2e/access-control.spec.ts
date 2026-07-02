import { expect, test } from "@playwright/test";
import { waitForHydration } from "../e2e/helpers";

interface TestAccount {
	context: import("@playwright/test").BrowserContext;
	page: import("@playwright/test").Page;
	profile: { id: string; email: string; name: string };
}

async function register(
	page: import("@playwright/test").Page,
	user: { name: string; email: string; password: string },
) {
	await page.goto("/auth");
	await waitForHydration(page);
	await page.getByRole("tab", { name: "Register" }).click();
	await page.getByLabel("Name").fill(user.name);
	await page.getByLabel("Email").fill(user.email);
	await page.getByRole("textbox", { name: "Password" }).fill(user.password);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page).toHaveURL("/organizations");
}

async function createAccount(
	browser: import("@playwright/test").Browser,
	name: string,
	suffix: string,
): Promise<TestAccount> {
	const context = await browser.newContext();
	const page = await context.newPage();
	const user = {
		name,
		email: `${name.toLowerCase()}-${suffix}@example.com`,
		password: "password123",
	};
	await register(page, user);
	const response = await page.request.get("/api/v1/auth/me");
	expect(response.ok()).toBe(true);
	return {
		context,
		page,
		profile: (await response.json()) as TestAccount["profile"],
	};
}

test("enforces organization and repository role hierarchy", async ({
	browser,
	page,
}) => {
	const suffix = Date.now().toString(36);
	const owner = {
		name: "Owner",
		email: `owner-${suffix}@example.com`,
		password: "password123",
	};
	const organizationName = `access-${suffix}`;
	const repositoryName = `private-${suffix}`;

	await register(page, owner);
	const ownerProfile = (await (
		await page.request.get("/api/v1/auth/me")
	).json()) as TestAccount["profile"];

	await page.goto("/organizations");
	await waitForHydration(page);
	await page.getByRole("button", { name: "New organization" }).click();
	await page.getByLabel("Organization name").fill(organizationName);
	await page.getByRole("button", { name: "Create organization" }).click();
	await expect(page).toHaveURL(`/organizations/${organizationName}`);
	await waitForHydration(page);
	await page.getByRole("button", { name: "New repository" }).click();
	await page.getByLabel("Repository name").fill(repositoryName);
	await page.getByRole("button", { name: "Create repository" }).click();
	await expect(
		page.getByRole("link", { name: repositoryName }),
	).toBeVisible();

	const reader = await createAccount(browser, "Reader", suffix);
	const repositoryModerator = await createAccount(
		browser,
		"RepositoryModerator",
		suffix,
	);
	const grantedMember = await createAccount(
		browser,
		"GrantedMember",
		suffix,
	);
	const organizationModerator = await createAccount(
		browser,
		"OrganizationModerator",
		suffix,
	);
	const administrator = await createAccount(
		browser,
		"Administrator",
		suffix,
	);
	const plainMember = await createAccount(browser, "PlainMember", suffix);
	const accounts = [
		reader,
		repositoryModerator,
		grantedMember,
		organizationModerator,
		administrator,
		plainMember,
	];

	for (const account of accounts) {
		const response = await page.request.post(
			`/api/v1/organizations/${organizationName}/members`,
			{ data: { email: account.profile.email } },
		);
		expect(response.status()).toBe(201);
		await expect(response.json()).resolves.toMatchObject({ role: "member" });
	}

	const setOrganizationRole = async (
		account: TestAccount,
		role: "administrator" | "moderator" | "owner",
	) => {
		const response = await page.request.patch(
			`/api/v1/organizations/${organizationName}/members/${account.profile.id}`,
			{ data: { role } },
		);
		expect(response.ok()).toBe(true);
	};

	await setOrganizationRole(organizationModerator, "moderator");
	await setOrganizationRole(administrator, "administrator");

	await plainMember.page.goto(`/organizations/${organizationName}`);
	await expect(
		plainMember.page.getByRole("link", { name: repositoryName }),
	).toHaveCount(0);
	await expect(
		plainMember.page.getByRole("button", { name: "New repository" }),
	).toHaveCount(0);
	await expect(
		plainMember.page.getByLabel("Invite member by email"),
	).toHaveCount(0);
	const hiddenRepository = await plainMember.page.request.get(
		`/api/v1/organizations/${organizationName}/repositories/${repositoryName}`,
	);
	expect(hiddenRepository.status()).toBe(404);

	const repositoryMemberUrl = `/api/v1/organizations/${organizationName}/repositories/${repositoryName}/members`;
	const grantReader = await page.request.put(
		`${repositoryMemberUrl}/${reader.profile.id}`,
		{ data: { role: "read" } },
	);
	expect(grantReader.ok()).toBe(true);
	await reader.page.goto(
		`/organizations/${organizationName}/repositories/${repositoryName}/pulls`,
	);
	await expect(
		reader.page.getByRole("button", { name: "New pull request" }),
	).toHaveCount(0);
	await expect(
		reader.page.getByRole("tab", { name: "Settings" }),
	).toHaveCount(0);

	const grantWriter = await page.request.put(
		`${repositoryMemberUrl}/${reader.profile.id}`,
		{ data: { role: "write" } },
	);
	expect(grantWriter.ok()).toBe(true);
	await reader.page.reload();
	await expect(
		reader.page.getByRole("button", { name: "New pull request" }),
	).toBeVisible();

	const grantRepositoryModerator = await page.request.put(
		`${repositoryMemberUrl}/${repositoryModerator.profile.id}`,
		{ data: { role: "moderator" } },
	);
	expect(grantRepositoryModerator.ok()).toBe(true);
	await repositoryModerator.page.goto(
		`/organizations/${organizationName}/repositories/${repositoryName}`,
	);
	await expect(
		repositoryModerator.page.getByRole("tab", { name: "Settings" }),
	).toBeVisible();
	const moderatorGrant = await repositoryModerator.page.request.put(
		`${repositoryMemberUrl}/${grantedMember.profile.id}`,
		{ data: { role: "write" } },
	);
	expect(moderatorGrant.ok()).toBe(true);
	const forbiddenModeratorGrant =
		await repositoryModerator.page.request.put(
			`${repositoryMemberUrl}/${plainMember.profile.id}`,
			{ data: { role: "moderator" } },
		);
	expect(forbiddenModeratorGrant.status()).toBe(403);
	const forbiddenDelete = await repositoryModerator.page.request.delete(
		`/api/v1/organizations/${organizationName}/repositories/${repositoryName}`,
	);
	expect(forbiddenDelete.status()).toBe(403);

	await grantedMember.page.goto(
		`/organizations/${organizationName}/repositories/${repositoryName}/pulls`,
	);
	await expect(
		grantedMember.page.getByRole("button", { name: "New pull request" }),
	).toBeVisible();

	await organizationModerator.page.goto(
		`/organizations/${organizationName}`,
	);
	await expect(
		organizationModerator.page.getByRole("button", {
			name: "New repository",
		}),
	).toBeVisible();
	await expect(
		organizationModerator.page.getByRole("link", { name: repositoryName }),
	).toBeVisible();

	const updateDescription = await administrator.page.request.patch(
		`/api/v1/organizations/${organizationName}`,
		{ data: { description: "Updated by administrator" } },
	);
	expect(updateDescription.ok()).toBe(true);
	const administratorPromotion = await administrator.page.request.patch(
		`/api/v1/organizations/${organizationName}/members/${plainMember.profile.id}`,
		{ data: { role: "moderator" } },
	);
	expect(administratorPromotion.ok()).toBe(true);

	await setOrganizationRole(administrator, "owner");
	const members = await administrator.page.request.get(
		`/api/v1/organizations/${organizationName}/members`,
	);
	expect(members.ok()).toBe(true);
	await expect(members.json()).resolves.toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: administrator.profile.id,
				role: "owner",
			}),
			expect.objectContaining({ id: ownerProfile.id, role: "member" }),
		]),
	);

	const formerOwnerDelete = await page.request.delete(
		`/api/v1/organizations/${organizationName}`,
	);
	expect(formerOwnerDelete.status()).toBe(403);
	const ownerDelete = await administrator.page.request.delete(
		`/api/v1/organizations/${organizationName}`,
	);
	expect(ownerDelete.status()).toBe(204);

	for (const account of accounts) {
		await account.context.close();
	}
});
