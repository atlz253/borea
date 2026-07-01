import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "./helpers";

const STORAGE_PATH = "./data/repositories";
const BASE_URL = "http://localhost:3000";

async function shaForRef(workDir: string, ref: string): Promise<string> {
	const { stdout } = await execa("git", ["rev-parse", ref], { cwd: workDir });
	return stdout.trim();
}

test("commit diff shows modified and added files", async ({ page }) => {
	test.setTimeout(60000);
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-diff-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `nirvana-e2e-${uid}-`));

	try {
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
		await writeFile(
			join(workDir, "README.md"),
			"base content\nline two\n",
			"utf-8",
		);
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=base commit"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});

		await writeFile(
			join(workDir, "README.md"),
			"modified content\nline two\n",
			"utf-8",
		);
		await writeFile(
			join(workDir, "newfile.txt"),
			"added file content\n",
			"utf-8",
		);
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=second commit"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});

		const sha = await shaForRef(workDir, "HEAD");

		const pushUrl = `${BASE_URL}/api/git/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], { cwd: workDir });
		await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		await page.goto(
			`/repositories/${repoName}/tree/${defaultBranch}/commits/${sha}`,
			{ waitUntil: "load" },
		);
		await waitForHydration(page);

		await expect(page).toHaveURL(
			new RegExp(
				`/repositories/${repoName}/tree/${defaultBranch}/commits/${sha}`,
			),
		);

		await expect(page.getByText("second commit")).toBeVisible();
		await expect(page.getByText("e2e", { exact: true })).toBeVisible();

		await expect(page.getByText("MODIFIED", { exact: true })).toBeVisible();
		await expect(page.getByText("README.md", { exact: true })).toBeVisible();

		await expect(page.getByText("ADDED", { exact: true })).toBeVisible();
		await expect(page.getByText("newfile.txt")).toBeVisible();

		await expect(page.getByText(/@@ -/).first()).toBeVisible();
		await expect(page.getByText("modified content")).toBeVisible();
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});

test("empty commit shows no file changes", async ({ page }) => {
	test.setTimeout(60000);
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-emptycommit-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `nirvana-e2e-${uid}-`));

	try {
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
		await writeFile(join(workDir, "base.txt"), "base\n", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=base"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});

		await execa("git", ["commit", "--allow-empty", "--message=empty"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});

		const sha = await shaForRef(workDir, "HEAD");

		const pushUrl = `${BASE_URL}/api/git/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], { cwd: workDir });
		await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		await page.goto(
			`/repositories/${repoName}/tree/${defaultBranch}/commits/${sha}`,
			{ waitUntil: "load" },
		);
		await waitForHydration(page);

		await expect(page.getByText("empty", { exact: true })).toBeVisible();
		await expect(
			page.getByText("No file changes in this commit."),
		).toBeVisible();
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});

const COMMIT_ENV = {
	GIT_AUTHOR_NAME: "e2e",
	GIT_AUTHOR_EMAIL: "e2e@test.com",
	GIT_COMMITTER_NAME: "e2e",
	GIT_COMMITTER_EMAIL: "e2e@test.com",
};
