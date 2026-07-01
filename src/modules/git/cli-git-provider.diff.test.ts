import { mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CliGitProvider } from "./providers/cli-git-provider";

async function seedCommits(
	provider: CliGitProvider,
	repoName: string,
	files: Record<string, string>,
): Promise<void> {
	const storagePath = (provider as unknown as { storagePath: string })
		.storagePath;
	const barePath = join(storagePath, repoName);
	const workDir = mkdtempSync(join(tmpdir(), "nirvana-work-"));
	try {
		const { stdout: branchRaw } = await execa("git", [
			"--git-dir",
			barePath,
			"symbolic-ref",
			"--short",
			"HEAD",
		]);
		const branch = branchRaw.trim();

		await execa("git", ["clone", barePath, workDir], {
			env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
		});
		await execa("git", ["symbolic-ref", "HEAD", `refs/heads/${branch}`], {
			cwd: workDir,
		});

		for (const [relPath, content] of Object.entries(files)) {
			const fullPath = join(workDir, relPath);
			await mkdir(join(fullPath, ".."), { recursive: true });
			await writeFile(fullPath, content, "utf-8");
		}
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=seed"], {
			cwd: workDir,
			env: {
				...process.env,
				GIT_AUTHOR_NAME: "test",
				GIT_AUTHOR_EMAIL: "test@example.com",
				GIT_COMMITTER_NAME: "test",
				GIT_COMMITTER_EMAIL: "test@example.com",
			},
		});
		await execa("git", ["push", "origin", `HEAD:${branch}`], {
			cwd: workDir,
			env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
		});
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
}

describe("CliGitProvider — getCommit", () => {
	let tmpDir: string;
	let provider: CliGitProvider;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "nirvana-test-"));
		provider = new CliGitProvider(tmpDir);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns commit details for a valid sha", async () => {
		await provider.init("get-commit-repo");
		await seedCommits(provider, "get-commit-repo", {
			"file.txt": "hello",
		});

		const commits = await provider.listCommits("get-commit-repo");
		const commit = await provider.getCommit("get-commit-repo", commits[0].sha);

		expect(commit.sha).toBe(commits[0].sha);
		expect(commit.shortSha).toBe(commits[0].shortSha);
		expect(commit.subject).toBe("seed");
		expect(commit.parentSha).toBeNull();
	});

	it("accepts short sha", async () => {
		await provider.init("short-sha-repo");
		await seedCommits(provider, "short-sha-repo", {
			"file.txt": "content",
		});

		const commits = await provider.listCommits("short-sha-repo");
		const commit = await provider.getCommit(
			"short-sha-repo",
			commits[0].shortSha,
		);

		expect(commit.sha).toBe(commits[0].sha);
	});

	it("resolves parentSha for non-root commits", async () => {
		await provider.init("parent-sha-repo");
		await seedCommits(provider, "parent-sha-repo", {
			"a.txt": "first",
		});

		const firstCommit = await provider.listCommits("parent-sha-repo");
		const firstSha = firstCommit[0].sha;

		await seedCommits(provider, "parent-sha-repo", {
			"b.txt": "second",
		});

		const commits = await provider.listCommits("parent-sha-repo");
		const secondCommit = await provider.getCommit(
			"parent-sha-repo",
			commits[0].sha,
		);

		expect(secondCommit.parentSha).toBe(firstSha);
	});

	it("throws for non-existent sha", async () => {
		await provider.init("bad-sha-repo");
		await seedCommits(provider, "bad-sha-repo", { "f.txt": "" });

		await expect(
			provider.getCommit(
				"bad-sha-repo",
				"0000000000000000000000000000000000000000",
			),
		).rejects.toThrow();
	});

	it("throws for invalid sha format", async () => {
		await provider.init("invalid-sha-repo");

		await expect(provider.getCommit("invalid-sha-repo", "xyz")).rejects.toThrow(
			/SHA/,
		);
	});
});

describe("CliGitProvider — getCommitDiff", () => {
	let tmpDir: string;
	let provider: CliGitProvider;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "nirvana-test-"));
		provider = new CliGitProvider(tmpDir);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns added file for initial commit", async () => {
		await provider.init("init-diff-repo");
		await seedCommits(provider, "init-diff-repo", {
			"src/index.ts": "const x = 1;\n",
		});

		const commits = await provider.listCommits("init-diff-repo");
		const result = await provider.getCommitDiff(
			"init-diff-repo",
			commits[0].sha,
		);

		expect(result.commit.sha).toBe(commits[0].sha);
		expect(result.files).toHaveLength(1);
		expect(result.files[0].status).toBe("added");
		expect(result.files[0].newPath).toBe("src/index.ts");
		expect(result.files[0].hunks.length).toBeGreaterThan(0);
		expect(result.files[0].hunks[0].lines.length).toBeGreaterThan(0);
	});

	it("returns modified file with correct hunks", async () => {
		await provider.init("mod-diff-repo");
		await seedCommits(provider, "mod-diff-repo", {
			"file.ts": "line1\nline2\nline3\n",
		});
		await seedCommits(provider, "mod-diff-repo", {
			"file.ts": "line1\nmodified\nline3\n",
		});

		const commits = await provider.listCommits("mod-diff-repo");
		const result = await provider.getCommitDiff(
			"mod-diff-repo",
			commits[0].sha,
		);

		expect(result.files).toHaveLength(1);
		expect(result.files[0].status).toBe("modified");
		expect(result.files[0].hunks.length).toBeGreaterThan(0);

		const removedLines = result.files[0].hunks
			.flatMap((h) => h.lines)
			.filter((l) => l.type === "removed");
		const addedLines = result.files[0].hunks
			.flatMap((h) => h.lines)
			.filter((l) => l.type === "added");

		expect(removedLines.some((l) => l.content === "line2")).toBe(true);
		expect(addedLines.some((l) => l.content === "modified")).toBe(true);
	});

	it("returns added file for new file added in non-initial commit", async () => {
		await provider.init("new-file-diff-repo");
		await seedCommits(provider, "new-file-diff-repo", {
			"existing.ts": "old\n",
		});
		await seedCommits(provider, "new-file-diff-repo", {
			"new.ts": "new content\n",
		});

		const commits = await provider.listCommits("new-file-diff-repo");
		const result = await provider.getCommitDiff(
			"new-file-diff-repo",
			commits[0].sha,
		);

		const addedFile = result.files.find((f) => f.status === "added");
		expect(addedFile).toBeDefined();
		expect(addedFile?.newPath).toBe("new.ts");
	});

	it("throws for non-existent repository", async () => {
		await expect(
			provider.getCommitDiff("no-such-repo", "abc1234"),
		).rejects.toThrow(/not found/);
	});
});

describe("CliGitProvider — getDiff", () => {
	let provider: CliGitProvider;
	let storageDir: string;

	beforeEach(() => {
		storageDir = mkdtempSync(join(tmpdir(), "nirvana-diff-"));
		provider = new CliGitProvider(storageDir);
	});

	afterEach(() => {
		rmSync(storageDir, { recursive: true, force: true });
	});

	it("returns changes on source branch since divergence from base (three-dot)", async () => {
		await provider.init("branch-diff-repo");
		await seedCommits(provider, "branch-diff-repo", {
			"shared.ts": "common\n",
		});
		await seedCommits(provider, "branch-diff-repo", {
			"shared.ts": "common\nbase change\n",
		});
		const baseName = "HEAD";

		await provider.createBranch("branch-diff-repo", "feature");
		const storagePath = provider as unknown as { storagePath: string };
		const barePath = join(storagePath.storagePath, "branch-diff-repo");
		const workDir = mkdtempSync(join(tmpdir(), "nirvana-work-feat-"));
		try {
			await execa("git", ["clone", barePath, workDir], {
				env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
			});
			await execa("git", ["checkout", "feature"], { cwd: workDir });
			await writeFile(join(workDir, "feature.ts"), "feature change\n", "utf-8");
			await execa("git", ["add", "--all"], { cwd: workDir });
			await execa("git", ["commit", "--message=feat: add feature.ts"], {
				cwd: workDir,
				env: {
					...process.env,
					GIT_AUTHOR_NAME: "test",
					GIT_AUTHOR_EMAIL: "test@example.com",
					GIT_COMMITTER_NAME: "test",
					GIT_COMMITTER_EMAIL: "test@example.com",
				},
			});
			await execa("git", ["push", "origin", "feature"], {
				cwd: workDir,
				env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
			});
		} finally {
			rmSync(workDir, { recursive: true, force: true });
		}

		const files = await provider.getDiff(
			"branch-diff-repo",
			baseName,
			"feature",
		);

		expect(files).toHaveLength(1);
		expect(files[0].status).toBe("added");
		expect(files[0].newPath).toBe("feature.ts");
	});

	it("returns empty array when branches are identical", async () => {
		await provider.init("empty-diff-repo");
		await seedCommits(provider, "empty-diff-repo", {
			"file.ts": "content\n",
		});
		const baseName = "HEAD";

		await provider.createBranch("empty-diff-repo", "feature");

		const files = await provider.getDiff(
			"empty-diff-repo",
			baseName,
			"feature",
		);

		expect(files).toHaveLength(0);
	});

	it("throws for non-existent ref", async () => {
		await provider.init("bad-ref-repo");
		await seedCommits(provider, "bad-ref-repo", {
			"file.ts": "content\n",
		});

		await expect(
			provider.getDiff("bad-ref-repo", "main", "no-such-branch"),
		).rejects.toThrow(/not found/);
	});

	it("throws for non-existent repository", async () => {
		await expect(
			provider.getDiff("no-such-repo", "main", "feature"),
		).rejects.toThrow(/not found/);
	});
});
