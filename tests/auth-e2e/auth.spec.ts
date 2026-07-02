import { expect, test } from "@playwright/test";
import { waitForHydration } from "../e2e/helpers";

async function register(
	page: import("@playwright/test").Page,
	user: { name: string; email: string; password: string },
) {
	if (!new URL(page.url()).pathname.startsWith("/auth")) {
		await page.goto("/auth");
	}
	const redirectTo =
		new URL(page.url()).searchParams.get("redirect") ?? "/organizations";
	await waitForHydration(page);
	await page.getByRole("tab", { name: "Register" }).click();
	await page.getByLabel("Name").fill(user.name);
	await page.getByLabel("Email").fill(user.email);
	await page.getByRole("textbox", { name: "Password" }).fill(user.password);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page).toHaveURL(redirectTo);
}

test("registers, signs in, protects REST, and isolates organizations", async ({
	browser,
	page,
}) => {
	const suffix = Date.now().toString(36);
	const alice = {
		name: "Alice",
		email: `alice-${suffix}@example.com`,
		password: "password123",
	};
	const organizationName = `alice-${suffix}`;

	await page.goto(`/organizations?source=${suffix}`);
	await expect(page).toHaveURL(/\/auth\?redirect=/);
	await register(page, alice);
	await expect(page.getByText(alice.name, { exact: true })).toBeVisible();

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
	await expect(page).toHaveURL("/organizations");

	const bobContext = await browser.newContext();
	const bobPage = await bobContext.newPage();
	await register(bobPage, {
		name: "Bob",
		email: `bob-${suffix}@example.com`,
		password: "password123",
	});
	await expect(
		bobPage.getByRole("link", { name: organizationName }),
	).toHaveCount(0);
	const hidden = await bobPage.request.get(
		`/api/v1/organizations/${organizationName}`,
	);
	expect(hidden.status()).toBe(404);
	await bobContext.close();
});
