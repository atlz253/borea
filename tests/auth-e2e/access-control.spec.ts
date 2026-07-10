import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "../e2e/helpers";

interface TestAccount {
	context: import("@playwright/test").BrowserContext;
	page: import("@playwright/test").Page;
	profile: { id: string; email: string; username: string };
}

async function register(
	page: import("@playwright/test").Page,
	user: { username: string; email: string; password: string },
) {
	await page.goto("/auth");
	await waitForHydration(page);
	await page.getByRole("tab", { name: "Register" }).click();
	await page.getByRole("textbox", { name: "Username" }).fill(user.username);
	await page.getByLabel("Email").fill(user.email);
	await page.getByRole("textbox", { name: "Password" }).fill(user.password);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page).toHaveURL("/repositories");
}

async function createAccount(
	browser: import("@playwright/test").Browser,
	name: string,
	suffix: string,
): Promise<TestAccount> {
	const context = await browser.newContext();
	const page = await context.newPage();
	const user = {
		username: `${name.toLowerCase()}-${suffix}`,
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

async function seedPullRequestBranches(
	organizationName: string,
	repositoryName: string,
	suffix: string,
) {
	const barePath = resolve(
		"./data/e2e-auth/repositories",
		organizationName,
		repositoryName,
	);
	const workDir = mkdtempSync(join(tmpdir(), `borea-auth-pr-${suffix}-`));
	const { stdout } = await execa("git", [
		"--git-dir",
		barePath,
		"symbolic-ref",
		"--short",
		"HEAD",
	]);
	const defaultBranch = stdout.trim();
	await execa("git", ["init", workDir]);
	await writeFile(join(workDir, "README.md"), "base\n", "utf-8");
	await execa("git", ["add", "--all"], { cwd: workDir });
	const gitEnv = {
		GIT_AUTHOR_NAME: "Owner",
		GIT_AUTHOR_EMAIL: "owner@example.com",
		GIT_COMMITTER_NAME: "Owner",
		GIT_COMMITTER_EMAIL: "owner@example.com",
	};
	await execa("git", ["commit", "--message=base"], {
		cwd: workDir,
		env: gitEnv,
	});
	await execa("git", ["remote", "add", "origin", barePath], { cwd: workDir });
	await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], {
		cwd: workDir,
	});
	await execa("git", ["checkout", "-b", "review-comments"], { cwd: workDir });
	await writeFile(
		join(workDir, "feature.ts"),
		"export const feature = true;\n",
	);
	await execa("git", ["add", "--all"], { cwd: workDir });
	await execa("git", ["commit", "--message=feature"], {
		cwd: workDir,
		env: gitEnv,
	});
	await execa("git", ["push", "origin", "HEAD:review-comments"], {
		cwd: workDir,
	});
	return { workDir };
}

test("enforces organization and repository role hierarchy", async ({
	browser,
	page,
}, testInfo) => {
	test.setTimeout(120_000);
	const suffix = `${Date.now().toString(36)}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`;
	const owner = {
		username: `owner-${suffix}`,
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
	await expect(page).toHaveURL(
		`/organizations/${organizationName}/repositories/${repositoryName}`,
	);
	await expect(
		page.getByRole("heading", { name: repositoryName }),
	).toBeVisible();
	const seededRepository = await seedPullRequestBranches(
		organizationName,
		repositoryName,
		suffix,
	);
	await page.goto(
		`/organizations/${organizationName}/repositories/${repositoryName}/pulls/new`,
	);
	await waitForHydration(page);
	await page.getByLabel("Title").fill("Reader review");
	await page.getByRole("combobox", { name: "Source branch" }).click();
	await page.getByRole("option", { name: "review-comments" }).click();
	await page.getByRole("button", { name: /Create pull request/i }).click();
	await page.waitForURL(
		new RegExp(
			`/organizations/${organizationName}/repositories/${repositoryName}/pulls/\\d+`,
		),
	);
	const pullRequestId = Number(page.url().split("/").at(-1));
	expect(pullRequestId).toBeGreaterThan(0);

	const reader = await createAccount(browser, "Reader", suffix);
	const repositoryModerator = await createAccount(
		browser,
		"RepositoryModerator",
		suffix,
	);
	const grantedMember = await createAccount(browser, "GrantedMember", suffix);
	const organizationModerator = await createAccount(
		browser,
		"OrganizationModerator",
		suffix,
	);
	const administrator = await createAccount(browser, "Administrator", suffix);
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
	await expect(reader.page.getByRole("tab", { name: "Settings" })).toHaveCount(
		0,
	);
	await reader.page.goto(
		`/organizations/${organizationName}/repositories/${repositoryName}/pulls/${pullRequestId}/files`,
	);
	await waitForHydration(reader.page);
	await expect(
		reader.page.getByRole("checkbox", {
			name: "Mark feature.ts as viewed",
		}),
	).toHaveCount(0);
	const readerComment = reader.page.getByRole("textbox", {
		name: "Comment on feature.ts",
	});
	await readerComment.fill("Read-only reviewer comment");
	await reader.page.getByRole("button", { name: "Add comment" }).click();
	await expect(
		reader.page.getByText("Read-only reviewer comment"),
	).toBeVisible();

	const grantWriter = await page.request.put(
		`${repositoryMemberUrl}/${reader.profile.id}`,
		{ data: { role: "write" } },
	);
	expect(grantWriter.ok()).toBe(true);
	await reader.page.goto(
		`/organizations/${organizationName}/repositories/${repositoryName}/pulls`,
	);
	await waitForHydration(reader.page);
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
	const forbiddenModeratorGrant = await repositoryModerator.page.request.put(
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

	await organizationModerator.page.goto(`/organizations/${organizationName}`);
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
	rmSync(seededRepository.workDir, { recursive: true, force: true });
});
