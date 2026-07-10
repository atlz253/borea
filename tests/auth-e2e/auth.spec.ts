import { expect, test } from "@playwright/test";
import { waitForHydration } from "../e2e/helpers";

async function register(
	page: import("@playwright/test").Page,
	user: { username: string; email: string; password: string },
) {
	if (!new URL(page.url()).pathname.startsWith("/auth")) {
		await page.goto("/auth");
	}
	const redirectTo =
		new URL(page.url()).searchParams.get("redirect") ?? "/repositories";
	await waitForHydration(page);
	await page.getByRole("tab", { name: "Register" }).click();
	await page.getByRole("textbox", { name: "Username" }).fill(user.username);
	await page.getByLabel("Email").fill(user.email);
	await page.getByRole("textbox", { name: "Password" }).fill(user.password);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page).toHaveURL(redirectTo);
}

test("authenticates users and shares organizations through membership", async ({
	browser,
	page,
}, testInfo) => {
	const suffix = `${Date.now().toString(36)}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`;
	const alice = {
		username: `alice-${suffix}`,
		email: `alice-${suffix}@example.com`,
		password: "password123",
	};
	const organizationName = `alice-${suffix}`;
	const repositoryName = `shared-${suffix}`;

	await page.goto(`/organizations?source=${suffix}`);
	await expect(page).toHaveURL(/\/auth\?redirect=/);
	await register(page, alice);
	await expect(page.getByText(alice.username, { exact: true })).toBeVisible();

	await waitForHydration(page);
	await page.getByRole("button", { name: "New organization" }).click();
	await page.getByLabel("Organization name").fill(organizationName);
	await page.getByRole("button", { name: "Create organization" }).click();
	await expect(page).toHaveURL(`/organizations/${organizationName}`);

	const owned = await page.request.get(
		`/api/v1/organizations/${organizationName}`,
	);
	expect(owned.ok()).toBe(true);

	await waitForHydration(page);
	await page.getByRole("button", { name: "Log out" }).click();
	await expect(page).toHaveURL(/\/auth(?:\?|$)/);
	const unauthorized = await page.request.get("/api/v1/organizations");
	expect(unauthorized.status()).toBe(401);

	await waitForHydration(page);
	await page.getByLabel("Email").fill(alice.email);
	await page.getByRole("textbox", { name: "Password" }).fill("incorrect");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.getByText("Invalid email or password")).toBeVisible();

	await page.getByRole("textbox", { name: "Password" }).fill(alice.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL("/repositories");

	const bobContext = await browser.newContext();
	const bobPage = await bobContext.newPage();
	const bob = {
		username: `bob-${suffix}`,
		email: `bob-${suffix}@example.com`,
		password: "password123",
	};
	await register(bobPage, bob);
	const bobProfile = (await (
		await bobPage.request.get("/api/v1/auth/me")
	).json()) as { id: string };
	await expect(
		bobPage.getByRole("link", { name: organizationName }),
	).toHaveCount(0);
	const hidden = await bobPage.request.get(
		`/api/v1/organizations/${organizationName}`,
	);
	expect(hidden.status()).toBe(404);

	const charlieContext = await browser.newContext();
	const charliePage = await charlieContext.newPage();
	const charlie = {
		username: `charlie-${suffix}`,
		email: `charlie-${suffix}@example.com`,
		password: "password123",
	};
	await register(charliePage, charlie);
	const hiddenMembers = await charliePage.request.get(
		`/api/v1/organizations/${organizationName}/members`,
	);
	expect(hiddenMembers.status()).toBe(404);
	const forbiddenInvite = await charliePage.request.post(
		`/api/v1/organizations/${organizationName}/members`,
		{ data: { email: charlie.email } },
	);
	expect(forbiddenInvite.status()).toBe(404);

	await page.goto(`/organizations/${organizationName}`);
	await waitForHydration(page);
	await page.getByLabel("Invite member by email").fill(bob.email);
	await page.getByRole("button", { name: "Invite member" }).click();
	await expect(page.getByText(bob.email, { exact: true })).toBeVisible();
	const promoteBob = await page.request.patch(
		`/api/v1/organizations/${organizationName}/members/${bobProfile.id}`,
		{ data: { role: "moderator" } },
	);
	expect(promoteBob.ok()).toBe(true);

	const duplicateInvite = await page.request.post(
		`/api/v1/organizations/${organizationName}/members`,
		{ data: { email: bob.email } },
	);
	expect(duplicateInvite.status()).toBe(409);
	const missingInvite = await page.request.post(
		`/api/v1/organizations/${organizationName}/members`,
		{ data: { email: `missing-${suffix}@example.com` } },
	);
	expect(missingInvite.status()).toBe(404);

	await bobPage.goto("/organizations");
	await expect(
		bobPage.getByRole("link", { name: organizationName }),
	).toBeVisible();
	await bobPage.goto(`/organizations/${organizationName}`);
	await expect(bobPage.getByText(alice.email, { exact: true })).toBeVisible();
	await expect(
		bobPage.getByRole("main").getByText(bob.email, { exact: true }),
	).toBeVisible();

	await waitForHydration(bobPage);
	await bobPage.getByRole("button", { name: "New repository" }).click();
	await bobPage.getByLabel("Repository name").fill(repositoryName);
	await bobPage.getByRole("button", { name: "Create repository" }).click();
	await expect(bobPage).toHaveURL(
		`/organizations/${organizationName}/repositories/${repositoryName}`,
	);
	await expect(
		bobPage.getByRole("heading", { name: repositoryName }),
	).toBeVisible();

	await bobPage.goto(`/organizations/${organizationName}`);
	await waitForHydration(bobPage);
	await bobPage.getByLabel("Invite member by email").fill(charlie.email);
	await bobPage.getByRole("button", { name: "Invite member" }).click();
	await expect(bobPage.getByText(charlie.email, { exact: true })).toBeVisible();

	await charliePage.goto("/organizations");
	await expect(
		charliePage.getByRole("link", { name: organizationName }),
	).toBeVisible();
	const membersResponse = await charliePage.request.get(
		`/api/v1/organizations/${organizationName}/members`,
	);
	expect(membersResponse.ok()).toBe(true);
	await expect(membersResponse.json()).resolves.toHaveLength(3);

	const openApiResponse = await page.request.get("/api/v1/openapi.json");
	const openApi = (await openApiResponse.json()) as {
		paths: Record<string, unknown>;
	};
	expect(openApi.paths).toHaveProperty(
		"/api/v1/organizations/{organization}/members",
	);

	await charlieContext.close();
	await bobContext.close();
});
