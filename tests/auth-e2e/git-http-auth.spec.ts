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
	const email = `${name.toLowerCase()}-${suffix}@example.com`;
	await register(page, { name, email, password: "password123" });
	const response = await page.request.get("/api/v1/auth/me");
	expect(response.ok()).toBe(true);
	return {
		context,
		page,
		profile: (await response.json()) as TestAccount["profile"],
	};
}

async function seedRepository(
	organizationName: string,
	repositoryName: string,
	suffix: string,
) {
	const barePath = resolve(
		"./data/e2e-auth/repositories",
		organizationName,
		repositoryName,
	);
	const workDir = mkdtempSync(join(tmpdir(), `borea-git-auth-seed-${suffix}-`));
	const { stdout } = await execa("git", [
		"--git-dir",
		barePath,
		"symbolic-ref",
		"--short",
		"HEAD",
	]);
	const defaultBranch = stdout.trim();
	await execa("git", ["init", workDir]);
	await writeFile(join(workDir, "README.md"), "private repository\n", "utf-8");
	await execa("git", ["add", "--all"], { cwd: workDir });
	const env = {
		GIT_AUTHOR_NAME: "Owner",
		GIT_AUTHOR_EMAIL: "owner@example.com",
		GIT_COMMITTER_NAME: "Owner",
		GIT_COMMITTER_EMAIL: "owner@example.com",
	};
	await execa("git", ["commit", "--message=initial"], { cwd: workDir, env });
	await execa("git", ["remote", "add", "origin", barePath], { cwd: workDir });
	await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], {
		cwd: workDir,
	});
	return { defaultBranch, workDir };
}

function basicAuthorization(token: string): string {
	return `Basic ${Buffer.from(`git:${token}`).toString("base64")}`;
}

test("authorizes Git smart-HTTP with PAT and repository permissions", async ({
	baseURL,
	browser,
	page,
}) => {
	if (!baseURL) {
		throw new Error("baseURL must be configured for auth E2E tests");
	}
	test.setTimeout(120_000);
	const suffix = Date.now().toString(36);
	const organizationName = `git-auth-${suffix}`;
	const repositoryName = `private-${suffix}`;
	const owner = {
		name: "Owner",
		email: `owner-git-${suffix}@example.com`,
		password: "password123",
	};
	const cloneDir = mkdtempSync(
		join(tmpdir(), `borea-git-auth-clone-${suffix}-`),
	);

	await register(page, owner);
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
	await expect(page.getByRole("link", { name: repositoryName })).toBeVisible();

	const seeded = await seedRepository(organizationName, repositoryName, suffix);
	const reader = await createAccount(browser, "Reader", suffix);
	const hidden = await createAccount(browser, "Hidden", suffix);
	const accounts = [reader, hidden];
	for (const account of accounts) {
		const response = await page.request.post(
			`/api/v1/organizations/${organizationName}/members`,
			{ data: { email: account.profile.email } },
		);
		expect(response.status()).toBe(201);
	}

	const membersUrl = `/api/v1/organizations/${organizationName}/repositories/${repositoryName}/members`;
	const grantRead = await page.request.put(
		`${membersUrl}/${reader.profile.id}`,
		{ data: { role: "read" } },
	);
	expect(grantRead.ok()).toBe(true);

	await reader.page.goto("/settings/git-tokens");
	await waitForHydration(reader.page);
	await reader.page.getByLabel("Token name").fill("Git CLI");
	await reader.page.getByRole("button", { name: "Create token" }).click();
	await expect(
		reader.page.getByText("Copy this token now. It will not be shown again."),
	).toBeVisible();
	const readerToken = await reader.page.getByText(/^borea_/).textContent();
	expect(readerToken).toBeTruthy();
	await reader.page.keyboard.press("Escape");
	await expect(reader.page.getByText("Git CLI")).toBeVisible();
	const listedTokens = await reader.page.request.get("/api/v1/auth/git-tokens");
	expect(listedTokens.ok()).toBe(true);
	await expect(listedTokens.json()).resolves.toEqual([
		expect.not.objectContaining({ token: expect.anything() }),
	]);

	const hiddenTokenResponse = await hidden.page.request.post(
		"/api/v1/auth/git-tokens",
		{ data: { name: "Hidden client" } },
	);
	expect(hiddenTokenResponse.status()).toBe(201);
	const hiddenToken = ((await hiddenTokenResponse.json()) as { token: string })
		.token;
	const infoRefs = `/api/git/${organizationName}/${repositoryName}.git/info/refs?service=git-upload-pack`;

	const unauthenticated = await page.request.get(infoRefs);
	expect(unauthenticated.status()).toBe(401);
	expect(unauthenticated.headers()["www-authenticate"]).toBe(
		'Basic realm="Borea Git"',
	);
	const invalidToken = await page.request.get(infoRefs, {
		headers: { Authorization: basicAuthorization("invalid") },
	});
	expect(invalidToken.status()).toBe(401);
	const inaccessible = await hidden.page.request.get(infoRefs, {
		headers: { Authorization: basicAuthorization(hiddenToken) },
	});
	expect(inaccessible.status()).toBe(404);

	const cloneUrl = new URL(
		`/api/git/${organizationName}/${repositoryName}.git`,
		baseURL,
	).toString();
	const readerAuthorization = basicAuthorization(readerToken ?? "");
	const gitHeader = `Authorization: ${readerAuthorization}`;
	const receiveInfoRefs = `/api/git/${organizationName}/${repositoryName}.git/info/refs?service=git-receive-pack`;
	const forbiddenPush = await reader.page.request.get(receiveInfoRefs, {
		headers: { Authorization: readerAuthorization },
	});
	expect(forbiddenPush.status()).toBe(403);
	const clone = await execa(
		"git",
		["-c", `http.extraHeader=${gitHeader}`, "clone", cloneUrl, cloneDir],
		{
			env: { GIT_TERMINAL_PROMPT: "0" },
			reject: false,
		},
	);
	expect(clone.exitCode).toBe(0);

	await writeFile(join(cloneDir, "reader.txt"), "reader change\n", "utf-8");
	await execa("git", ["add", "--all"], { cwd: cloneDir });
	await execa("git", ["commit", "--message=reader-change"], {
		cwd: cloneDir,
		env: {
			GIT_AUTHOR_NAME: "Reader",
			GIT_AUTHOR_EMAIL: reader.profile.email,
			GIT_COMMITTER_NAME: "Reader",
			GIT_COMMITTER_EMAIL: reader.profile.email,
		},
	});
	const deniedPush = await execa(
		"git",
		[
			"-c",
			`http.extraHeader=${gitHeader}`,
			"push",
			"origin",
			`HEAD:${seeded.defaultBranch}`,
		],
		{
			cwd: cloneDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			reject: false,
		},
	);
	expect(deniedPush.exitCode).not.toBe(0);

	const grantWrite = await page.request.put(
		`${membersUrl}/${reader.profile.id}`,
		{ data: { role: "write" } },
	);
	expect(grantWrite.ok()).toBe(true);
	const allowedAdvertisement = await reader.page.request.get(receiveInfoRefs, {
		headers: { Authorization: readerAuthorization },
	});
	expect(allowedAdvertisement.status()).toBe(200);
	const allowedPush = await execa(
		"git",
		[
			"-c",
			`http.extraHeader=${gitHeader}`,
			"push",
			"origin",
			`HEAD:${seeded.defaultBranch}`,
		],
		{
			cwd: cloneDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			reject: false,
		},
	);
	expect(allowedPush.exitCode).toBe(0);

	await reader.page.getByRole("button", { name: "Revoke" }).click();
	await expect(reader.page.getByRole("button", { name: "Revoke" })).toHaveCount(
		0,
	);
	const revoked = await reader.page.request.get(infoRefs, {
		headers: { Authorization: readerAuthorization },
	});
	expect(revoked.status()).toBe(401);

	await reader.context.close();
	await hidden.context.close();
	rmSync(seeded.workDir, { recursive: true, force: true });
	rmSync(cloneDir, { recursive: true, force: true });
});
