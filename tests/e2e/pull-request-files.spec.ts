import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "./helpers";

const STORAGE_PATH = "./data/repositories/default";
const BASE_URL = "http://localhost:3000";

test("Files changed tab shows PR diff", async ({ page }) => {
	test.setTimeout(60000);
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-prfiles-${uid}`;
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
		await writeFile(join(workDir, "README.md"), "base content\n", "utf-8");
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

		const pushUrl = `${BASE_URL}/api/git/default/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], { cwd: workDir });
		await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		await execa("git", ["checkout", "-b", "feature-branch"], { cwd: workDir });
		await writeFile(join(workDir, "feature.txt"), "feature content\n", "utf-8");
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
		await execa("git", ["push", "origin", "HEAD:feature-branch"], {
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

		await page.getByLabel("Title").fill("E2E test pull request");

		await page.getByRole("combobox", { name: "Source branch" }).click();
		const sourceOption = page.getByRole("option", { name: "feature-branch" });
		await sourceOption.click();

		await page.getByRole("button", { name: /Create pull request/i }).click();

		await page.waitForURL(
			new RegExp(`/organizations/default/repositories/${repoName}/pulls/\\d+`),
		);
		await page.waitForLoadState("load");

		expect(errors).toEqual([]);
		await expect(page.getByText("E2E test pull request")).toBeVisible();

		await page.getByRole("tab", { name: /Files changed/i }).click();
		await page.waitForURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/pulls/\\d+/files`,
			),
		);
		await waitForHydration(page);

		await expect(page.getByText("E2E test pull request")).toBeVisible();
		await expect(page.getByText("1 file changed")).toBeVisible();
		await expect(page.getByText("ADDED")).toBeVisible();
		await expect(page.getByText("feature.txt")).toBeVisible();
		await expect(page.getByText("feature content")).toBeVisible();

		const viewedCheckbox = page.getByRole("checkbox", {
			name: "Mark feature.txt as viewed",
		});
		await viewedCheckbox.check();
		await expect(viewedCheckbox).toBeChecked();
		await expect(viewedCheckbox).toBeDisabled();
		await expect(viewedCheckbox).toBeEnabled();
		await expect(page.getByText("feature content")).toBeHidden();

		await page.reload();
		await waitForHydration(page);
		await expect(viewedCheckbox).toBeChecked();
		await expect(page.getByText("feature content")).toBeHidden();

		await viewedCheckbox.uncheck();
		await expect(viewedCheckbox).not.toBeChecked();
		await expect(viewedCheckbox).toBeDisabled();
		await expect(viewedCheckbox).toBeEnabled();
		await expect(page.getByText("feature content")).toBeVisible();

		await page.reload();
		await waitForHydration(page);
		await expect(viewedCheckbox).not.toBeChecked();
		await expect(page.getByText("feature content")).toBeVisible();

		await page.getByRole("tab", { name: /Conversation/i }).click();
		await page.waitForURL(
			new RegExp(`/organizations/default/repositories/${repoName}/pulls/\\d+$`),
		);
		await waitForHydration(page);

		await expect(page.getByText("E2E test pull request")).toBeVisible();
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});
