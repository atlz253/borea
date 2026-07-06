import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "./helpers";

const STORAGE_PATH = "./data/repositories/default";
const BASE_URL = "http://localhost:3000";

test("view small, large, and binary repository files", async ({ page }) => {
	test.setTimeout(120000);
	await page.addInitScript(() => {
		window.localStorage.setItem("mantine-color-scheme-value", "light");
	});
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-file-${uid}`;
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
		await writeFile(
			join(workDir, "README.md"),
			"# Small file\nexport const value = 1;\n",
			"utf-8",
		);
		await writeFile(
			join(workDir, "large.txt"),
			`${"x".repeat(1024 * 1024)}\nLARGE_FILE_END\n`,
			"utf-8",
		);
		await writeFile(join(workDir, "binary.dat"), new Uint8Array([65, 0, 66]));
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=initial files"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});

		const pushUrl = `${BASE_URL}/api/git/default/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], { cwd: workDir });
		await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30000,
		});

		await execa("git", ["checkout", "-b", "feature-content"], {
			cwd: workDir,
		});
		await writeFile(
			join(workDir, "README.md"),
			"# Feature file\nexport const value = 2;\n",
			"utf-8",
		);
		await execa("git", ["add", "README.md"], { cwd: workDir });
		await execa("git", ["commit", "--message=feature content"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});
		await execa("git", ["push", "origin", "HEAD:feature-content"], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30000,
		});

		await page.goto(
			`/organizations/default/repositories/${repoName}/tree/${defaultBranch}`,
			{
				waitUntil: "load",
			},
		);
		await waitForHydration(page);
		await page.getByRole("link", { name: "README.md" }).click();
		await page.waitForURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/blob/${defaultBranch}/README\\.md$`,
			),
		);
		await expect(page.getByText("# Small file")).toBeVisible();
		const codeEditor = page.locator(".mantine-CodeHighlight-codeHighlight");
		const codeSurface = codeEditor.locator(".mantine-CodeHighlight-code");
		await expect(codeSurface).toHaveCSS(
			"background-color",
			"rgb(255, 255, 255)",
		);
		await expect(codeEditor.locator(".hljs-section").first()).toHaveCSS(
			"color",
			"rgb(0, 92, 197)",
		);
		await page.getByRole("button", { name: "Theme: light" }).click();
		await expect(page.locator("html")).toHaveAttribute(
			"data-mantine-color-scheme",
			"dark",
		);
		await expect(codeSurface).toHaveCSS("background-color", "rgb(13, 17, 23)");
		await expect(codeEditor.locator(".hljs-section").first()).toHaveCSS(
			"color",
			"rgb(31, 111, 235)",
		);

		await page.getByRole("button", { name: defaultBranch }).click();
		await page.getByRole("menuitem", { name: "feature-content" }).click();
		await page.waitForURL(
			new RegExp(
				`/organizations/default/repositories/${repoName}/blob/feature-content/README\\.md$`,
			),
		);
		await expect(page.getByText("# Feature file")).toBeVisible();

		await page.goto(
			`/organizations/default/repositories/${repoName}/tree/${defaultBranch}`,
			{
				waitUntil: "load",
			},
		);
		await waitForHydration(page);
		await page.getByRole("link", { name: "large.txt" }).click();
		await expect(page.getByText("Large file")).toBeVisible();
		await page.getByRole("button", { name: "Open file" }).click();
		await expect(page.getByText(/LARGE_FILE_END/)).toBeVisible({
			timeout: 30000,
		});

		await page.goto(
			`/organizations/default/repositories/${repoName}/tree/${defaultBranch}`,
			{ waitUntil: "load" },
		);
		await waitForHydration(page);
		await page.getByRole("link", { name: "binary.dat" }).click();
		await expect(
			page.getByText("Binary files cannot be displayed."),
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
