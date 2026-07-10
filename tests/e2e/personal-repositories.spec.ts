import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "./helpers";

test("creates and pushes to a personal repository", async ({
	baseURL,
	page,
}, testInfo) => {
	if (!baseURL) {
		throw new Error("baseURL must be configured for E2E tests");
	}
	const suffix = `${Date.now().toString(36)}-${testInfo.workerIndex}`;
	const repositoryName = `personal-${suffix}`;
	const workDir = mkdtempSync(join(tmpdir(), `borea-personal-${suffix}-`));

	await page.goto("/repositories");
	await expect(page).toHaveURL("/repositories");
	await expect(page.getByRole("heading", { name: "anonymous" })).toBeVisible();
	await waitForHydration(page);
	await page.getByRole("button", { name: "New repository" }).click();
	await page.getByLabel("Repository name").fill(repositoryName);
	await page.getByRole("button", { name: "Create repository" }).click();
	await expect(page).toHaveURL(
		`/users/anonymous/repositories/${repositoryName}`,
	);
	const cloneUrl = new URL(
		`/api/git/users/anonymous/${repositoryName}.git`,
		baseURL,
	).toString();
	await expect(page.getByLabel("Git pull URL")).toHaveValue(cloneUrl);
	await execa("git", ["init", workDir]);
	await writeFile(join(workDir, "README.md"), "personal repository\n", "utf-8");
	await execa("git", ["add", "--all"], { cwd: workDir });
	await execa("git", ["commit", "--message=initial"], {
		cwd: workDir,
		env: {
			GIT_AUTHOR_NAME: "anonymous",
			GIT_AUTHOR_EMAIL: "noauth@localhost",
			GIT_COMMITTER_NAME: "anonymous",
			GIT_COMMITTER_EMAIL: "noauth@localhost",
		},
	});
	await execa("git", ["remote", "add", "origin", cloneUrl], { cwd: workDir });
	await execa("git", ["push", "origin", "HEAD:master"], {
		cwd: workDir,
		env: { GIT_TERMINAL_PROMPT: "0" },
	});

	await page.reload();
	await expect(page.getByRole("link", { name: "README.md" })).toBeVisible();
	rmSync(workDir, { recursive: true, force: true });
});
