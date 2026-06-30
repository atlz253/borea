import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";

const STORAGE_PATH = "./data/repositories";
const BASE_URL = "http://localhost:3000";

async function waitForHydration(page: import("@playwright/test").Page) {
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

test("branch switcher lets user switch between branches", async ({ page }) => {
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-branch-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `nirvana-e2e-work-${uid}-`));

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
		const pushUrl = `${BASE_URL}/api/git/${repoName}.git`;
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
		await page.goto(`/repositories/${repoName}`, { waitUntil: "load" });
		await waitForHydration(page);

		// Should be on the tree URL
		await expect(page).toHaveURL(
			/\/repositories\/${repoName}\/tree\/${defaultBranch}/,
		);
		await expect(page.getByText("file.txt")).toBeVisible();

		// Switch to feature-x branch
		await page.getByRole("button", { name: defaultBranch }).click();
		await page.getByRole("menuitem", { name: /feature-x/ }).click();
		await page.waitForURL(/\/repositories\/${repoName}\/tree\/feature-x/);

		// Feature branch should show feature.txt, not file.txt (in this structure)
		// Actually file.txt exists in both branches; feature.txt only in feature-x
		await expect(page.getByText("feature.txt")).toBeVisible();
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});
