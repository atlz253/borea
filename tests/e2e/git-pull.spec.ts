import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { execa } from "execa";

const STORAGE_PATH = "./data/repositories/default";
const BASE_URL = "http://localhost:3000";

test("git clone over HTTP downloads repository contents", async () => {
	const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
	const repoName = `e2e-pull-${uid}`;
	const barePath = join(STORAGE_PATH, repoName);
	const workDir = mkdtempSync(join(tmpdir(), `borea-e2e-work-${uid}-`));
	const cloneDir = join(tmpdir(), `borea-e2e-cloned-${uid}`);

	try {
		// Step 1: Seed a bare repository with commits via filesystem
		await execa("git", ["init", "--bare", barePath]);

		const { stdout: branchRaw } = await execa("git", [
			"--git-dir",
			barePath,
			"symbolic-ref",
			"--short",
			"HEAD",
		]);
		const branch = branchRaw.trim();

		await execa("git", ["clone", barePath, workDir], {
			env: { GIT_TERMINAL_PROMPT: "0" },
		});
		await execa("git", ["symbolic-ref", "HEAD", `refs/heads/${branch}`], {
			cwd: workDir,
		});

		const testFileContent = "Hello from Borea!";
		const nestedDir = join(workDir, "src", "utils");
		await mkdir(nestedDir, { recursive: true });
		await writeFile(join(workDir, "README.md"), testFileContent, "utf-8");
		await writeFile(
			join(workDir, "src", "index.js"),
			"console.log('hi');\n",
			"utf-8",
		);
		await writeFile(
			join(workDir, "src", "utils", "helper.js"),
			"export const x = 1;\n",
			"utf-8",
		);

		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=initial"], {
			cwd: workDir,
			env: {
				GIT_AUTHOR_NAME: "e2e",
				GIT_AUTHOR_EMAIL: "e2e@test.com",
				GIT_COMMITTER_NAME: "e2e",
				GIT_COMMITTER_EMAIL: "e2e@test.com",
			},
		});
		await execa("git", ["push", "origin", `HEAD:${branch}`], {
			cwd: workDir,
			env: { GIT_TERMINAL_PROMPT: "0" },
		});

		// Step 2: Clone over HTTP from the Borea API
		const cloneUrl = `${BASE_URL}/api/git/default/${repoName}.git`;

		await execa("git", ["clone", cloneUrl, cloneDir], {
			env: { GIT_TERMINAL_PROMPT: "0" },
			timeout: 30_000,
		});

		// Step 3: Verify the cloned repository has the expected files
		expect(existsSync(join(cloneDir, "README.md"))).toBe(true);
		expect(existsSync(join(cloneDir, "src", "index.js"))).toBe(true);
		expect(existsSync(join(cloneDir, "src", "utils", "helper.js"))).toBe(true);

		const readmeContent = readFileSync(join(cloneDir, "README.md"), "utf-8");
		expect(readmeContent).toBe(testFileContent);
	} finally {
		rmSync(workDir, { recursive: true, force: true });
		rmSync(cloneDir, { recursive: true, force: true });
		rmSync(barePath, { recursive: true, force: true });
	}
});
