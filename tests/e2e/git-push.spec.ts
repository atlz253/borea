import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";

const STORAGE_PATH = "./data/repositories";
const BASE_URL = "http://localhost:3000";

test("git push over HTTP stores repository contents", async () => {
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-push-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `nirvana-e2e-work-${uid}-`));
	const cloneDir = join(tmpdir(), `nirvana-e2e-cloned-${uid}`);

	try {
		// Step 1: Seed an empty bare repository via filesystem
		await execa("git", ["init", "--bare", barePath]);

		// Read the default branch name from the bare repo
		const { stdout: branchRaw } = await execa("git", [
			"--git-dir",
			barePath,
			"symbolic-ref",
			"--short",
			"HEAD",
		]);
		const branch = branchRaw.trim();

		// Step 2: Create a local working repository with one commit
		await execa("git", ["init", workDir]);

		await writeFile(join(workDir, "README.md"), "pushed content", "utf-8");
		await writeFile(join(workDir, "data.txt"), "from git push\n", "utf-8");

		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=push-test"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});

		// Step 3: Push to the Nirvana HTTP endpoint
		const pushUrl = `${BASE_URL}/api/git/${repoName}.git`;
		await execa("git", ["remote", "add", "origin", pushUrl], { cwd: workDir });
		await execa("git", ["push", "-v", "origin", `HEAD:${branch}`], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		// Step 4: Verify the push stored refs by ls-remote over the HTTP endpoint
		const lsRemoteRef = `refs/heads/${branch}`;
		const { stdout: lsRemoteOut } = await execa(
			"git",
			["ls-remote", pushUrl, lsRemoteRef],
			{
				env: { GIT_TERMINAL_PROMPT: "0" },
				timeout: 15_000,
			},
		);
		expect(lsRemoteOut).toContain(lsRemoteRef);

		// Step 5: Clone from the Nirvana HTTP endpoint and verify pushed files
		await execa("git", ["clone", pushUrl, cloneDir], {
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		expect(existsSync(join(cloneDir, "README.md"))).toBe(true);
		expect(existsSync(join(cloneDir, "data.txt"))).toBe(true);

		const readmeContent = readFileSync(join(cloneDir, "README.md"), "utf-8");
		expect(readmeContent).toBe("pushed content");
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(cloneDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});
