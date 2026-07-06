import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "./helpers";

const STORAGE_PATH = "./data/repositories/default";
const BASE_URL = "http://localhost:3000";

test("create branch from branch switcher", async ({ page }) => {
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-create-branch-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `borea-e2e-work-${uid}-`));

	try {
		// Seed bare repo with a single commit on default branch
		await execa("git", ["init", "--bare", barePath]);

		const { stdout: branchRaw } = await execa("git", [
			"--git-dir",
			barePath,
			"symbolic-ref",
			"--short",
			"HEAD",
		]);
		const defaultBranch = branchRaw.trim();

		await execa("git", ["init", workDir]);
		await writeFile(join(workDir, "readme.md"), "hello", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=init"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});

		const pushUrl = `${BASE_URL}/api/git/default/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], {
			cwd: workDir,
		});
		await execa(
			"git",
			["push", "-v", "origin", `${defaultBranch}:${defaultBranch}`],
			{
				cwd: workDir,
				env: { GIT_TERMINAL_PROMPT: "0" },
				timeout: 30_000,
			},
		);

		// Navigate to the repo
		await page.goto(`/organizations/default/repositories/${repoName}`, {
			waitUntil: "load",
		});
		await waitForHydration(page);

		// Should be on the tree URL
		await expect(page).toHaveURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/${defaultBranch}`,
			),
		);

		// Open branch switcher and click "New branch"
		await page.getByRole("button", { name: defaultBranch }).click();
		await page.getByRole("menuitem", { name: /New branch/ }).click();

		// Fill in branch name and create
		const input = page.getByPlaceholder("e.g. feature/awesome");
		await input.fill("feature-from-e2e");
		await page.getByRole("button", { name: /Create/ }).click();

		// Should navigate to the new branch
		await expect(page).toHaveURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/feature-from-e2e`,
			),
		);
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});

test("rename branch from branch switcher", async ({ page }) => {
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-rename-branch-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `borea-e2e-work-${uid}-`));

	try {
		// Seed bare repo
		await execa("git", ["init", "--bare", barePath]);

		const { stdout: branchRaw } = await execa("git", [
			"--git-dir",
			barePath,
			"symbolic-ref",
			"--short",
			"HEAD",
		]);
		const defaultBranch = branchRaw.trim();

		// Create working dir with content
		await execa("git", ["init", workDir]);
		await writeFile(join(workDir, "readme.md"), "hello", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=init"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});

		// Create a feature branch
		await execa("git", ["checkout", "-b", "old-name"], { cwd: workDir });
		await writeFile(join(workDir, "feature.txt"), "content", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=feature"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});

		// Push both branches
		const pushUrl = `${BASE_URL}/api/git/default/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], { cwd: workDir });
		await execa(
			"git",
			["push", "-v", "origin", `${defaultBranch}:${defaultBranch}`],
			{
				cwd: workDir,
				env: { GIT_TERMINAL_PROMPT: "0" },
				timeout: 30_000,
			},
		);
		await execa("git", ["push", "-v", "origin", "old-name:old-name"], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		// Navigate to the feature branch
		await page.goto(
			`/organizations/default/repositories/${repoName}/tree/old-name`,
			{ waitUntil: "load" },
		);
		await waitForHydration(page);

		await expect(page).toHaveURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/old-name`,
			),
		);

		// Open branch switcher and click "Rename branch"
		await page.getByRole("button", { name: "old-name" }).click();
		await page.getByRole("menuitem", { name: /Rename branch/ }).click();

		// Fill in new name and confirm
		const input = page.getByPlaceholder("e.g. feature/updated");
		await input.fill("new-name");
		await page.getByRole("button", { name: /Rename/ }).click();

		// Should navigate to the new branch
		await expect(page).toHaveURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/new-name`,
			),
		);

		// Verify the old branch no longer appears in the switcher
		await page.getByRole("button", { name: "new-name" }).click();
		await expect(
			page.getByRole("menuitem", { name: "old-name", exact: true }),
		).not.toBeVisible();
		await expect(
			page.getByRole("menuitem", { name: "new-name", exact: true }),
		).toBeVisible();
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});

test("branch switcher lets user switch between branches", async ({ page }) => {
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-branch-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `borea-e2e-work-${uid}-`));

	try {
		// Seed bare repo
		await execa("git", ["init", "--bare", barePath]);

		const { stdout: branchRaw } = await execa("git", [
			"--git-dir",
			barePath,
			"symbolic-ref",
			"--short",
			"HEAD",
		]);
		const defaultBranch = branchRaw.trim();

		// Create working dir with content on default branch
		await execa("git", ["init", workDir]);

		await writeFile(join(workDir, "file.txt"), "main content", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=main commit"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});

		// Create a second branch with different content
		await execa("git", ["checkout", "-b", "feature-x"], { cwd: workDir });
		await writeFile(join(workDir, "feature.txt"), "feature content", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=feature commit"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});

		// Switch back to default branch and push both
		await execa("git", ["checkout", defaultBranch], { cwd: workDir });
		const pushUrl = `${BASE_URL}/api/git/default/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], { cwd: workDir });
		await execa(
			"git",
			["push", "-v", "origin", `${defaultBranch}:${defaultBranch}`],
			{
				cwd: workDir,
				env: { GIT_TERMINAL_PROMPT: "0" },
				timeout: 30_000,
			},
		);
		await execa("git", ["push", "-v", "origin", "feature-x:feature-x"], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		// Navigate to the repo — redirects to /tree/<defaultBranch>
		await page.goto(`/organizations/default/repositories/${repoName}`, {
			waitUntil: "load",
		});
		await waitForHydration(page);

		// Should be on the tree URL
		await expect(page).toHaveURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/${defaultBranch}`,
			),
		);
		await expect(page.getByText("file.txt")).toBeVisible();

		// Switch to feature-x branch
		await page.getByRole("button", { name: defaultBranch }).click();
		await page.getByRole("menuitem", { name: /feature-x/ }).click();
		await page.waitForURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/feature-x`,
			),
		);

		// Feature branch should show feature.txt, not file.txt (in this structure)
		// Actually file.txt exists in both branches; feature.txt only in feature-x
		await expect(page.getByText("feature.txt")).toBeVisible();
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});
