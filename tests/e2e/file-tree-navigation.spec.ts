import { mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "./helpers";

const STORAGE_PATH = "./data/repositories/default";
const BASE_URL = "http://localhost:3000";

test("navigate into subdirectory and back via parent link", async ({
	page,
}) => {
	test.setTimeout(60000);
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-tree-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `borea-e2e-${uid}-`));

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

		const nestedDir = join(workDir, "src", "utils");
		await mkdir(nestedDir, { recursive: true });
		await writeFile(join(workDir, "README.md"), "root\n", "utf-8");
		await writeFile(
			join(nestedDir, "helper.js"),
			"export const x = 1;\n",
			"utf-8",
		);

		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=init"], {
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

		await page.goto(`/organizations/default/repositories/${repoName}`, {
			waitUntil: "load",
		});
		await waitForHydration(page);

		await expect(page).toHaveURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/${defaultBranch}$`,
			),
		);

		await expect(page.getByText("README.md")).toBeVisible();
		await expect(page.getByRole("link", { name: "src" })).toBeVisible();
		await expect(page.getByRole("cell", { name: "src" })).toBeVisible();

		await page.getByRole("link", { name: "src" }).click();
		await page.waitForURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/${defaultBranch}/src$`,
			),
		);
		await waitForHydration(page);

		await expect(page.getByRole("link", { name: "utils" })).toBeVisible();
		await expect(page.getByRole("link", { name: ".." })).toBeVisible();

		await page.getByRole("link", { name: "utils" }).click();
		await page.waitForURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/${defaultBranch}/src/utils$`,
			),
		);
		await waitForHydration(page);

		await expect(page.getByRole("link", { name: "helper.js" })).toBeVisible();
		await expect(page.getByRole("link", { name: ".." })).toBeVisible();

		await page.getByRole("link", { name: ".." }).click();
		await page.waitForURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/tree/${defaultBranch}/src$`,
			),
		);
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
