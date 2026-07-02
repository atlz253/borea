import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "./helpers";

const STORAGE_PATH = "./data/repositories/default";
const BASE_URL = "http://localhost:3000";

test("PR with conflicting branches shows conflict alert", async ({ page }) => {
	test.setTimeout(90000);
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-prconflict-${uid}`;
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

		await writeFile(join(workDir, "conflict.txt"), "base content\n", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=base"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});

		const pushUrl = `${BASE_URL}/api/git/default/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], { cwd: workDir });
		await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		await execa("git", ["checkout", "-b", "feature-branch"], { cwd: workDir });
		await writeFile(join(workDir, "conflict.txt"), "feature change\n", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=feature side"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});
		await execa("git", ["push", "origin", "HEAD:feature-branch"], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		await execa("git", ["checkout", defaultBranch], { cwd: workDir });
		await writeFile(join(workDir, "conflict.txt"), "master change\n", "utf-8");
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=master side"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});
		await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		await page.goto(
			`/organizations/default/repositories/${repoName}/pulls/new`,
		);
		await page.waitForLoadState("load");
		await waitForHydration(page);

		await page.getByLabel("Title").fill("Conflicting PR");

		await page.getByRole("combobox", { name: "Source branch" }).click();
		await page.getByRole("option", { name: "feature-branch" }).click();

		await page.getByRole("button", { name: /Create pull request/i }).click();

		await page.waitForURL(
			new RegExp(`/organizations/default/repositories/${repoName}/pulls/\\d+`),
		);
		await page.waitForLoadState("load");
		await waitForHydration(page);

		expect(errors).toEqual([]);

		await expect(
			page.getByRole("alert", { name: /merge conflicts/i }),
		).toBeVisible();

		await expect(page.getByText("Merge conflicts")).toBeVisible();

		await expect(page.getByRole("button", { name: "Merge" })).toBeDisabled();
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
