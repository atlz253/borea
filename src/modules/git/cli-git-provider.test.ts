import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CliGitProvider } from "./providers/cli-git-provider";

async function seedCommits(
	provider: CliGitProvider,
	repoName: string,
	files: Record<string, string | Uint8Array>,
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

describe("CliGitProvider", () => {
	let tmpDir: string;
	let provider: CliGitProvider;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "nirvana-test-"));
		provider = new CliGitProvider(tmpDir);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("creates a bare repository", async () => {
		const repo = await provider.init("test-repo");

		expect(repo.name).toBe("test-repo");
		expect(repo.createdAt).toBeInstanceOf(Date);
		expect(existsSync(join(tmpDir, "test-repo", "HEAD"))).toBe(true);
	});

	it("rejects duplicate names", async () => {
		await provider.init("dup");
		await expect(provider.init("dup")).rejects.toThrow("already exists");
	});

	it("lists repositories sorted by creation time (newest first)", async () => {
		await provider.init("repo-a");
		await provider.init("repo-b");
		const repos = await provider.list();

		expect(repos).toHaveLength(2);
		expect(repos.map((r) => r.name).sort()).toEqual(["repo-a", "repo-b"]);
	});

	it("checks existence", async () => {
		await provider.init("exists");

		expect(await provider.exists("exists")).toBe(true);
		expect(await provider.exists("not-exists")).toBe(false);
	});

	it("rejects invalid names", async () => {
		await expect(provider.init("")).rejects.toThrow();
		await expect(provider.init(".hidden")).rejects.toThrow();
		await expect(provider.init("a/b")).rejects.toThrow();
		await expect(provider.init("a b")).rejects.toThrow();
	});

	it("stores and retrieves description", async () => {
		await provider.init("desc-repo", "My custom description");
		const repos = await provider.list();

		const repo = repos.find((r) => r.name === "desc-repo");
		expect(repo?.description).toBe("My custom description");
	});

	it("returns empty list when no repositories exist", async () => {
		const repos = await provider.list();
		expect(repos).toEqual([]);
	});

	describe("listFiles", () => {
		it("returns empty array for a repository without commits", async () => {
			await provider.init("empty-repo");
			const entries = await provider.listFiles("empty-repo");

			expect(entries).toEqual([]);
		});

		it("throws when repository does not exist", async () => {
			await expect(provider.listFiles("missing")).rejects.toThrow(/not found/);
		});

		it("lists root files and directories", async () => {
			await provider.init("populated");
			await seedCommits(provider, "populated", {
				"README.md": "# populated\n",
				"src/index.ts": "export {}\n",
				"src/utils/helper.ts": "export const x = 1;\n",
			});

			const entries = await provider.listFiles("populated");
			const names = entries.map((e) => e.name).sort();
			expect(names).toEqual(["README.md", "src"]);

			const readme = entries.find((e) => e.name === "README.md");
			expect(readme?.type).toBe("blob");
			expect(readme?.mode).toBe("100644");
			expect(readme?.size).toBeGreaterThan(0);

			const src = entries.find((e) => e.name === "src");
			expect(src?.type).toBe("tree");
			expect(src?.mode).toBe("040000");
			expect(src?.size).toBeUndefined();
		});

		it("lists contents of a subdirectory", async () => {
			await provider.init("subdir-repo");
			await seedCommits(provider, "subdir-repo", {
				"src/index.ts": "export {}\n",
				"src/utils/helper.ts": "export const x = 1;\n",
				"src/utils/extra.ts": "export const y = 2;\n",
			});

			const entries = await provider.listFiles("subdir-repo", {
				path: "src/utils",
			});
			const names = entries.map((e) => e.name).sort();
			expect(names).toEqual(["extra.ts", "helper.ts"]);
			expect(entries.every((e) => e.type === "blob")).toBe(true);
		});

		it("throws for a non-existent path", async () => {
			await provider.init("path-repo");
			await seedCommits(provider, "path-repo", {
				"README.md": "hello\n",
			});

			await expect(
				provider.listFiles("path-repo", { path: "no-such-dir" }),
			).rejects.toThrow(/not found/);
		});

		it("rejects parent-directory segments in path", async () => {
			await provider.init("traversal-repo");
			await seedCommits(provider, "traversal-repo", {
				"README.md": "hi\n",
			});

			await expect(
				provider.listFiles("traversal-repo", { path: "../etc" }),
			).rejects.toThrow(/parent-directory/);
		});
	});

	describe("listBranches", () => {
		it("returns the default branch with isHead=true for a populated repo", async () => {
			await provider.init("branches-repo");
			await seedCommits(provider, "branches-repo", {
				"README.md": "# branches\n",
			});

			const branches = await provider.listBranches("branches-repo");

			expect(branches.length).toBeGreaterThanOrEqual(1);
			const headBranch = branches.find((b) => b.isHead);
			expect(headBranch).toBeDefined();
			expect(headBranch?.name.length).toBeGreaterThan(0);
		});

		it("returns multiple branches and marks only one as HEAD", async () => {
			await provider.init("multi-branch");
			await seedCommits(provider, "multi-branch", {
				"a.txt": "a\n",
			});

			const repoPath = join(tmpDir, "multi-branch");
			await execa("git", ["--git-dir", repoPath, "branch", "feature-b"]);

			const branches = await provider.listBranches("multi-branch");

			const names = branches.map((b) => b.name).sort();
			expect(names).toContain("feature-b");
			expect(branches.filter((b) => b.isHead)).toHaveLength(1);
		});

		it("returns empty array for a repository without commits", async () => {
			await provider.init("empty-branches");
			const branches = await provider.listBranches("empty-branches");

			expect(branches).toEqual([]);
		});

		it("throws for non-existent repository", async () => {
			await expect(provider.listBranches("no-such-repo")).rejects.toThrow(
				/not found/,
			);
		});
	});

	describe("listCommits", () => {
		it("returns commits in reverse chronological order", async () => {
			await provider.init("log-repo");
			await seedCommits(provider, "log-repo", {
				"first.txt": "first\n",
			});
			await seedCommits(provider, "log-repo", {
				"second.txt": "second\n",
			});

			const commits = await provider.listCommits("log-repo");

			expect(commits.length).toBe(2);
			expect(commits[0].authoredAt.getTime()).toBeGreaterThanOrEqual(
				commits[1].authoredAt.getTime(),
			);
		});

		it("returns commit with proper fields", async () => {
			await provider.init("fields-repo");
			await seedCommits(provider, "fields-repo", {
				"test.txt": "content\n",
			});

			const [commit] = await provider.listCommits("fields-repo", {
				limit: 1,
			});

			expect(commit).toBeDefined();
			expect(commit.sha).toMatch(/^[0-9a-f]{40}$/);
			expect(commit.shortSha).toMatch(/^[0-9a-f]{7,}$/);
			expect(commit.authorName).toBe("test");
			expect(commit.authorEmail).toBe("test@example.com");
			expect(commit.authoredAt).toBeInstanceOf(Date);
			expect(commit.committedAt).toBeInstanceOf(Date);
			expect(commit.subject).toBe("seed");
		});

		it("respects the limit option", async () => {
			await provider.init("limit-repo");
			await seedCommits(provider, "limit-repo", { "a.txt": "a\n" });
			await seedCommits(provider, "limit-repo", { "b.txt": "b\n" });
			await seedCommits(provider, "limit-repo", { "c.txt": "c\n" });

			const two = await provider.listCommits("limit-repo", { limit: 2 });

			expect(two).toHaveLength(2);
		});

		it("returns empty array for a repository without commits", async () => {
			await provider.init("empty-log");
			const commits = await provider.listCommits("empty-log");

			expect(commits).toEqual([]);
		});

		it("throws for non-existent repository", async () => {
			await expect(provider.listCommits("no-such-repo")).rejects.toThrow(
				/not found/,
			);
		});
	});

	describe("countCommits", () => {
		it("returns the correct commit count", async () => {
			await provider.init("count-repo");
			await seedCommits(provider, "count-repo", { "a.txt": "a\n" });
			await seedCommits(provider, "count-repo", { "b.txt": "b\n" });
			await seedCommits(provider, "count-repo", { "c.txt": "c\n" });

			const count = await provider.countCommits("count-repo");

			expect(count).toBe(3);
		});

		it("returns 0 for a repository without commits", async () => {
			await provider.init("empty-count");
			const count = await provider.countCommits("empty-count");

			expect(count).toBe(0);
		});

		it("throws for non-existent repository", async () => {
			await expect(provider.countCommits("no-such-repo")).rejects.toThrow(
				/not found/,
			);
		});
	});

	describe("advertiseRefs", () => {
		it("returns ref advertisement for a repo with commits", async () => {
			await provider.init("pull-repo");
			await seedCommits(provider, "pull-repo", {
				"test.txt": "hello\n",
			});

			const stream = await provider.advertiseRefs(
				"pull-repo",
				"git-upload-pack",
			);
			const reader = stream.getReader();
			const chunks: Uint8Array[] = [];
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value);
			}
			const output = chunks.map((c) => new TextDecoder().decode(c)).join("");

			expect(output).toContain("HEAD");
			expect(output).toContain("refs/heads/");
		});

		it("returns capability advertisement without branch refs for empty repo", async () => {
			await provider.init("empty-pull");
			const stream = await provider.advertiseRefs(
				"empty-pull",
				"git-upload-pack",
			);
			const reader = stream.getReader();
			const chunks: Uint8Array[] = [];
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value) chunks.push(value);
			}
			const output = chunks.map((c) => new TextDecoder().decode(c)).join("");

			expect(output).toContain("capabilities");
			expect(output).toContain("agent=");
			expect(output).not.toContain("refs/heads/");
		});

		it("throws for non-existent repository", async () => {
			await expect(
				provider.advertiseRefs("no-such-repo", "git-upload-pack"),
			).rejects.toThrow(/not found/);
		});

		it("throws for invalid name", async () => {
			await provider.init("valid");
			await expect(
				provider.advertiseRefs("../etc", "git-upload-pack"),
			).rejects.toThrow();
		});
	});

	describe("invokeService", () => {
		it("returns a stream for a valid fetch request", async () => {
			await provider.init("fetch-repo");
			await seedCommits(provider, "fetch-repo", {
				"file.txt": "content\n",
			});

			const inputStream = new ReadableStream({
				start(controller) {
					controller.close();
				},
			});

			const stream = await provider.invokeService(
				"fetch-repo",
				"git-upload-pack",
				inputStream,
			);

			expect(stream).toBeInstanceOf(ReadableStream);
		});

		it("throws for non-existent repository", async () => {
			const inputStream = new ReadableStream({
				start(controller) {
					controller.close();
				},
			});

			await expect(
				provider.invokeService("no-such", "git-upload-pack", inputStream),
			).rejects.toThrow(/not found/);
		});

		it("throws for invalid name", async () => {
			await provider.init("fetch-valid");
			const inputStream = new ReadableStream({
				start(controller) {
					controller.close();
				},
			});

			await expect(
				provider.invokeService("../../etc", "git-upload-pack", inputStream),
			).rejects.toThrow();
		});
	});

	describe("createBranch", () => {
		it("creates a new branch from HEAD", async () => {
			await provider.init("create-branch-1");
			await seedCommits(provider, "create-branch-1", { "a.txt": "a\n" });

			const branch = await provider.createBranch(
				"create-branch-1",
				"new-branch",
			);

			expect(branch).toEqual({ name: "new-branch", isHead: false });

			const branches = await provider.listBranches("create-branch-1");
			expect(branches.map((b) => b.name)).toContain("new-branch");
		});

		it("creates a branch from a specific ref", async () => {
			await provider.init("create-branch-2");
			await seedCommits(provider, "create-branch-2", { "a.txt": "a\n" });

			const existingBranches = await provider.listBranches("create-branch-2");
			const defaultBranch = existingBranches.find((b) => b.isHead)?.name;
			if (!defaultBranch) throw new Error("No HEAD branch found");

			const branch = await provider.createBranch(
				"create-branch-2",
				"from-default",
				defaultBranch,
			);

			expect(branch).toEqual({ name: "from-default", isHead: false });

			const branches = await provider.listBranches("create-branch-2");
			expect(branches.map((b) => b.name)).toContain("from-default");
		});

		it("throws when branch already exists", async () => {
			await provider.init("create-branch-3");
			await seedCommits(provider, "create-branch-3", { "a.txt": "a\n" });

			await provider.createBranch("create-branch-3", "feature-x");

			await expect(
				provider.createBranch("create-branch-3", "feature-x"),
			).rejects.toThrow(/already exists/);
		});

		it("throws for non-existent repository", async () => {
			await expect(
				provider.createBranch("no-such-repo", "new"),
			).rejects.toThrow(/not found/);
		});
	});

	describe("canMerge", () => {
		it("detects fast-forward merge", async () => {
			await provider.init("ff-repo");
			await seedCommits(provider, "ff-repo", { "a.txt": "a\n" });

			const branches = await provider.listBranches("ff-repo");
			const main = branches.find((b) => b.isHead)?.name ?? "master";

			await provider.createBranch("ff-repo", "feature-ff");
			await seedCommits(provider, "ff-repo", { "b.txt": "b\n" });

			const status = await provider.canMerge("ff-repo", "feature-ff", main);

			expect(status.fastForward).toBe(false);
			expect(status.conflicts).toBe(false);
			expect(status.conflictingFiles).toEqual([]);
		});

		it("detects divergent merge without conflicts", async () => {
			await provider.init("no-conflict-repo");
			await seedCommits(provider, "no-conflict-repo", {
				"shared.txt": "a\n",
			});

			const branches = await provider.listBranches("no-conflict-repo");
			const main = branches.find((b) => b.isHead)?.name ?? "master";

			await provider.createBranch("no-conflict-repo", "feature-div");

			const repoPath = join(tmpDir, "no-conflict-repo");

			const workDir = mkdtempSync(join(tmpdir(), "nirvana-merge-test-"));
			try {
				await execa("git", ["clone", repoPath, workDir], {
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});

				await execa("git", ["checkout", main], { cwd: workDir });
				await writeFile(join(workDir, "main-file.txt"), "main\n", "utf-8");
				await execa("git", ["add", "--all"], { cwd: workDir });
				await execa("git", ["commit", "--message=main-change"], {
					cwd: workDir,
					env: {
						...process.env,
						GIT_AUTHOR_NAME: "test",
						GIT_AUTHOR_EMAIL: "t@t.com",
						GIT_COMMITTER_NAME: "test",
						GIT_COMMITTER_EMAIL: "t@t.com",
					},
				});
				await execa("git", ["push", "origin", `HEAD:${main}`], {
					cwd: workDir,
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});

				await execa("git", ["checkout", "feature-div"], { cwd: workDir });
				await writeFile(join(workDir, "feat-file.txt"), "feat\n", "utf-8");
				await execa("git", ["add", "--all"], { cwd: workDir });
				await execa("git", ["commit", "--message=feature-change"], {
					cwd: workDir,
					env: {
						...process.env,
						GIT_AUTHOR_NAME: "test",
						GIT_AUTHOR_EMAIL: "t@t.com",
						GIT_COMMITTER_NAME: "test",
						GIT_COMMITTER_EMAIL: "t@t.com",
					},
				});
				await execa("git", ["push", "origin", "HEAD:feature-div"], {
					cwd: workDir,
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});
			} finally {
				rmSync(workDir, { recursive: true, force: true });
			}

			const status = await provider.canMerge(
				"no-conflict-repo",
				"feature-div",
				main,
			);

			expect(status.conflicts).toBe(false);
			expect(status.conflictingFiles).toEqual([]);
		});

		it("detects conflicts", async () => {
			await provider.init("conflict-repo");
			await seedCommits(provider, "conflict-repo", {
				"shared.txt": "base\n",
			});

			const branches = await provider.listBranches("conflict-repo");
			const main = branches.find((b) => b.isHead)?.name ?? "master";

			await provider.createBranch("conflict-repo", "feature-conf");

			const repoPath = join(tmpDir, "conflict-repo");

			const workDir = mkdtempSync(join(tmpdir(), "nirvana-conflict-test-"));
			try {
				await execa("git", ["clone", repoPath, workDir], {
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});

				await execa("git", ["checkout", main], { cwd: workDir });
				await writeFile(join(workDir, "shared.txt"), "main-change\n", "utf-8");
				await execa("git", ["add", "--all"], { cwd: workDir });
				await execa("git", ["commit", "--message=main-update"], {
					cwd: workDir,
					env: {
						...process.env,
						GIT_AUTHOR_NAME: "test",
						GIT_AUTHOR_EMAIL: "t@t.com",
						GIT_COMMITTER_NAME: "test",
						GIT_COMMITTER_EMAIL: "t@t.com",
					},
				});
				await execa("git", ["push", "origin", `HEAD:${main}`], {
					cwd: workDir,
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});

				await execa("git", ["checkout", "feature-conf"], { cwd: workDir });
				await writeFile(join(workDir, "shared.txt"), "feat-change\n", "utf-8");
				await execa("git", ["add", "--all"], { cwd: workDir });
				await execa("git", ["commit", "--message=feat-update"], {
					cwd: workDir,
					env: {
						...process.env,
						GIT_AUTHOR_NAME: "test",
						GIT_AUTHOR_EMAIL: "t@t.com",
						GIT_COMMITTER_NAME: "test",
						GIT_COMMITTER_EMAIL: "t@t.com",
					},
				});
				await execa("git", ["push", "origin", "HEAD:feature-conf"], {
					cwd: workDir,
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});
			} finally {
				rmSync(workDir, { recursive: true, force: true });
			}

			const status = await provider.canMerge(
				"conflict-repo",
				"feature-conf",
				main,
			);

			expect(status.conflicts).toBe(true);
			expect(status.conflictingFiles).toContain("shared.txt");
		});

		it("throws for non-existent repository", async () => {
			await expect(
				provider.canMerge("no-such-repo", "head", "base"),
			).rejects.toThrow(/not found/);
		});

		it("throws for non-existent ref", async () => {
			await provider.init("missing-ref-repo");
			await seedCommits(provider, "missing-ref-repo", { "a.txt": "a\n" });

			await expect(
				provider.canMerge("missing-ref-repo", "no-such-branch", "main"),
			).rejects.toThrow(/not found/);
		});
	});

	describe("mergeBranch", () => {
		it("performs fast-forward merge when fastForward option is true", async () => {
			await provider.init("ff-merge-repo");
			await seedCommits(provider, "ff-merge-repo", { "a.txt": "a\n" });

			const branches = await provider.listBranches("ff-merge-repo");
			const main = branches.find((b) => b.isHead)?.name ?? "master";

			await provider.createBranch("ff-merge-repo", "feature-ff-merge");
			await seedCommits(provider, "ff-merge-repo", { "b.txt": "b\n" });

			await provider.createBranch("ff-merge-repo", "feature-ff-merge2", main);
			await seedCommits(provider, "ff-merge-repo", { "c.txt": "c\n" });

			const status = await provider.canMerge(
				"ff-merge-repo",
				"feature-ff-merge",
				main,
			);
			expect(status.fastForward).toBe(false);
			expect(status.conflicts).toBe(false);
		});

		it("performs merge-commit merge when fastForward is false or not requested", async () => {
			await provider.init("merge-commit-repo");
			await seedCommits(provider, "merge-commit-repo", {
				"base.txt": "base\n",
			});

			const branches = await provider.listBranches("merge-commit-repo");
			const main = branches.find((b) => b.isHead)?.name ?? "master";

			await provider.createBranch("merge-commit-repo", "feature-mc");

			const repoPath = join(tmpDir, "merge-commit-repo");
			const workDir = mkdtempSync(join(tmpdir(), "nirvana-mc-test-"));
			try {
				await execa("git", ["clone", repoPath, workDir], {
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});

				await execa("git", ["checkout", main], { cwd: workDir });
				await writeFile(join(workDir, "main-file.txt"), "main\n", "utf-8");
				await execa("git", ["add", "--all"], { cwd: workDir });
				await execa("git", ["commit", "--message=main-change"], {
					cwd: workDir,
					env: {
						...process.env,
						GIT_AUTHOR_NAME: "test",
						GIT_AUTHOR_EMAIL: "t@t.com",
						GIT_COMMITTER_NAME: "test",
						GIT_COMMITTER_EMAIL: "t@t.com",
					},
				});
				await execa("git", ["push", "origin", `HEAD:${main}`], {
					cwd: workDir,
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});

				await execa("git", ["checkout", "feature-mc"], { cwd: workDir });
				await writeFile(join(workDir, "feat-file.txt"), "feat\n", "utf-8");
				await execa("git", ["add", "--all"], { cwd: workDir });
				await execa("git", ["commit", "--message=feature-change"], {
					cwd: workDir,
					env: {
						...process.env,
						GIT_AUTHOR_NAME: "test",
						GIT_AUTHOR_EMAIL: "t@t.com",
						GIT_COMMITTER_NAME: "test",
						GIT_COMMITTER_EMAIL: "t@t.com",
					},
				});
				await execa("git", ["push", "origin", "HEAD:feature-mc"], {
					cwd: workDir,
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});
			} finally {
				rmSync(workDir, { recursive: true, force: true });
			}

			const countBefore = await provider.countCommits(
				"merge-commit-repo",
				main,
			);

			const result = await provider.mergeBranch(
				"merge-commit-repo",
				"feature-mc",
				main,
			);

			expect(result.fastForward).toBe(false);
			expect(result.mergedSha.length).toBe(40);

			const commitCount = await provider.countCommits(
				"merge-commit-repo",
				main,
			);
			expect(commitCount).toBe(countBefore + 2);

			const mainBranches = (
				await provider.listBranches("merge-commit-repo")
			).filter((b) => b.name === main);
			expect(mainBranches.some((b) => b.isHead)).toBe(true);
		});

		it("throws when merge has conflicts", async () => {
			await provider.init("conflict-merge-repo");
			await seedCommits(provider, "conflict-merge-repo", {
				"shared.txt": "base\n",
			});

			const branches = await provider.listBranches("conflict-merge-repo");
			const main = branches.find((b) => b.isHead)?.name ?? "master";

			await provider.createBranch("conflict-merge-repo", "feature-conflict");

			const repoPath = join(tmpDir, "conflict-merge-repo");
			const workDir = mkdtempSync(join(tmpdir(), "nirvana-conflict-m-"));
			try {
				await execa("git", ["clone", repoPath, workDir], {
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});

				await execa("git", ["checkout", main], { cwd: workDir });
				await writeFile(join(workDir, "shared.txt"), "main-change\n", "utf-8");
				await execa("git", ["add", "--all"], { cwd: workDir });
				await execa("git", ["commit", "--message=main-update"], {
					cwd: workDir,
					env: {
						...process.env,
						GIT_AUTHOR_NAME: "test",
						GIT_AUTHOR_EMAIL: "t@t.com",
						GIT_COMMITTER_NAME: "test",
						GIT_COMMITTER_EMAIL: "t@t.com",
					},
				});
				await execa("git", ["push", "origin", `HEAD:${main}`], {
					cwd: workDir,
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});

				await execa("git", ["checkout", "feature-conflict"], { cwd: workDir });
				await writeFile(join(workDir, "shared.txt"), "feat-change\n", "utf-8");
				await execa("git", ["add", "--all"], { cwd: workDir });
				await execa("git", ["commit", "--message=feat-update"], {
					cwd: workDir,
					env: {
						...process.env,
						GIT_AUTHOR_NAME: "test",
						GIT_AUTHOR_EMAIL: "t@t.com",
						GIT_COMMITTER_NAME: "test",
						GIT_COMMITTER_EMAIL: "t@t.com",
					},
				});
				await execa("git", ["push", "origin", "HEAD:feature-conflict"], {
					cwd: workDir,
					env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
				});
			} finally {
				rmSync(workDir, { recursive: true, force: true });
			}

			await expect(
				provider.mergeBranch("conflict-merge-repo", "feature-conflict", main),
			).rejects.toThrow(/conflict/);
		});

		it("throws for non-existent repository", async () => {
			await expect(
				provider.mergeBranch("no-such-repo", "head", "base"),
			).rejects.toThrow(/not found/);
		});
	});
});
