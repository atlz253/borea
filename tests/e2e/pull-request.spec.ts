import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Locator, test } from "@playwright/test";
import { execa } from "execa";
import { waitForHydration } from "./helpers";

const STORAGE_PATH = "./data/repositories";
const BASE_URL = "http://localhost:3000";

async function getContainerBounds(locator: Locator) {
	return locator.evaluate((element) => {
		const container = element.closest(".mantine-Container-root");
		if (!(container instanceof HTMLElement)) {
			throw new Error("Element is not inside a Mantine Container");
		}
		const bounds = container.getBoundingClientRect();
		return { left: bounds.left, right: bounds.right };
	});
}

test("create pull request via web UI and merge it", async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 });

	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-pr-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `nirvana-e2e-pr-${uid}-`));

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

		const pushUrl = `${BASE_URL}/api/git/${repoName}.git`;
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

		await page.goto(`/repositories/${repoName}/pulls/new`);
		await page.waitForLoadState("load");
		await waitForHydration(page);

		const tabsContainer = await getContainerBounds(page.getByRole("tablist"));
		const headingContainer = await getContainerBounds(
			page.getByRole("heading", { name: "New pull request", exact: true }),
		);
		const formContainer = await getContainerBounds(page.getByLabel("Title"));

		expect(headingContainer).toEqual(tabsContainer);
		expect(formContainer).toEqual(tabsContainer);
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);

		await page.getByLabel("Title").fill("E2E test pull request");

		await page.getByRole("combobox", { name: "Source branch" }).click();
		const sourceOption = page.getByRole("option", { name: "feature-branch" });
		await sourceOption.click();

		// Target branch is already set to defaultBranch (master) — skip selection

		await page.getByRole("button", { name: /Create pull request/i }).click();

		await page.waitForURL(new RegExp(`/repositories/${repoName}/pulls/\\d+`));
		await page.waitForLoadState("load");

		expect(errors).toEqual([]);
		await expect(page.getByText("E2E test pull request")).toBeVisible();

		await expect(
			page.getByRole("button", { name: "Merge (fast-forward)" }),
		).toBeVisible();

		await page.getByRole("button", { name: "Merge (fast-forward)" }).click();

		await expect(page.getByText("Merged as")).toBeVisible({ timeout: 15_000 });

		const cloneDir = join(tmpdir(), `nirvana-e2e-cloned-${uid}`);
		try {
			await execa("git", ["clone", pushUrl, cloneDir], {
				env: { GIT_TERMINAL_PROMPT: "0" },
				timeout: 30_000,
			});

			expect(existsSync(join(cloneDir, "README.md"))).toBe(true);
			expect(existsSync(join(cloneDir, "feature.txt"))).toBe(true);
		} finally {
			rmSync(cloneDir, { recursive: true, force: true });
		}
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});

test("pull request tab is visible on repository page", async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 });

	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-pr-tab-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);

	try {
		await execa("git", ["init", "--bare", barePath]);

		await page.goto(`/repositories/${repoName}`);
		await page.waitForLoadState("load");
		await waitForHydration(page);

		await expect(
			page.getByRole("tab", { name: /Pull requests/i }),
		).toBeVisible();

		await page.getByRole("tab", { name: /Pull requests/i }).click();

		await page.waitForURL(`/repositories/${repoName}/pulls`);
		const emptyState = page.getByText("No pull requests yet.", { exact: true });
		await expect(emptyState).toBeVisible();

		const tabsContainer = await getContainerBounds(page.getByRole("tablist"));
		const headingContainer = await getContainerBounds(
			page.getByRole("heading", { name: "Pull requests", exact: true }),
		);
		const emptyStateContainer = await getContainerBounds(emptyState);

		expect(headingContainer).toEqual(tabsContainer);
		expect(emptyStateContainer).toEqual(tabsContainer);
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		).toBe(true);
	} finally {
		rmSync(barePath, { recursive: true, force: true });
	}
});
