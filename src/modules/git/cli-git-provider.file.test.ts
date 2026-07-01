import { mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CliGitProvider } from "./providers/cli-git-provider";

async function seedCommit(
	provider: CliGitProvider,
	repoName: string,
	files: Record<string, string | Uint8Array>,
): Promise<void> {
	const storagePath = (provider as unknown as { storagePath: string })
		.storagePath;
	const barePath = join(storagePath, repoName);
	const workDir = mkdtempSync(join(tmpdir(), "nirvana-file-work-"));
	try {
		const { stdout: branchRaw } = await execa("git", [
			"--git-dir",
			barePath,
			"symbolic-ref",
			"--short",
			"HEAD",
		]);
		const branch = branchRaw.trim();
		await execa("git", ["clone", barePath, workDir]);
		await execa("git", ["symbolic-ref", "HEAD", `refs/heads/${branch}`], {
			cwd: workDir,
		});
		for (const [relativePath, content] of Object.entries(files)) {
			const fullPath = join(workDir, relativePath);
			await mkdir(join(fullPath, ".."), { recursive: true });
			await writeFile(fullPath, content);
		}
		await execa("git", ["add", "--all"], { cwd: workDir });
		await execa("git", ["commit", "--message=seed"], {
			cwd: workDir,
			env: COMMIT_ENV,
		});
		await execa("git", ["push", "origin", `HEAD:${branch}`], {
			cwd: workDir,
		});
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
}

describe("CliGitProvider getFile", () => {
	let tmpDir: string;
	let provider: CliGitProvider;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "nirvana-file-test-"));
		provider = new CliGitProvider(tmpDir);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns exact UTF-8 file content", async () => {
		await provider.init("file-content");
		await seedCommit(provider, "file-content", {
			"src/index.ts": "export const value = 1;\n",
		});

		const result = await provider.getFile("file-content", {
			path: "src/index.ts",
			maxBytes: 1024,
		});

		expect(result).toEqual({
			status: "text",
			path: "src/index.ts",
			size: 24,
			content: "export const value = 1;\n",
		});
	});

	it("returns an empty text file", async () => {
		await provider.init("empty-file");
		await seedCommit(provider, "empty-file", { "empty.txt": "" });

		const result = await provider.getFile("empty-file", {
			path: "empty.txt",
			maxBytes: 1024,
		});

		expect(result).toEqual({
			status: "text",
			path: "empty.txt",
			size: 0,
			content: "",
		});
	});

	it("returns too-large without content over the limit", async () => {
		await provider.init("large-file");
		await seedCommit(provider, "large-file", { "large.txt": "12345" });

		const limited = await provider.getFile("large-file", {
			path: "large.txt",
			maxBytes: 4,
		});
		const opened = await provider.getFile("large-file", {
			path: "large.txt",
			maxBytes: 5,
		});

		expect(limited).toEqual({
			status: "too-large",
			path: "large.txt",
			size: 5,
		});
		expect(opened.status).toBe("text");
	});

	it("detects null bytes and invalid UTF-8 as binary", async () => {
		await provider.init("binary-files");
		await seedCommit(provider, "binary-files", {
			"null.dat": new Uint8Array([65, 0, 66]),
			"invalid.txt": new Uint8Array([0xc3, 0x28]),
		});

		const nullResult = await provider.getFile("binary-files", {
			path: "null.dat",
			maxBytes: 1024,
		});
		const invalidResult = await provider.getFile("binary-files", {
			path: "invalid.txt",
			maxBytes: 1024,
		});

		expect(nullResult.status).toBe("binary");
		expect(invalidResult.status).toBe("binary");
	});

	it("throws for a missing file and a directory path", async () => {
		await provider.init("invalid-file-path");
		await seedCommit(provider, "invalid-file-path", {
			"src/index.ts": "export {};\n",
		});

		await expect(
			provider.getFile("invalid-file-path", {
				path: "missing.txt",
				maxBytes: 1024,
			}),
		).rejects.toThrow(/not found/);
		await expect(
			provider.getFile("invalid-file-path", {
				path: "src",
				maxBytes: 1024,
			}),
		).rejects.toThrow(/not a file/);
	});

	it("reads a file from the requested branch", async () => {
		await provider.init("file-ref");
		await seedCommit(provider, "file-ref", {
			"README.md": "branch content\n",
		});
		const repoPath = join(tmpDir, "file-ref");
		await execa("git", ["--git-dir", repoPath, "branch", "feature"]);

		const result = await provider.getFile("file-ref", {
			path: "README.md",
			ref: "feature",
			maxBytes: 1024,
		});

		expect(result.status).toBe("text");
		if (result.status === "text") {
			expect(result.content).toBe("branch content\n");
		}
	});
});

const COMMIT_ENV = {
	GIT_AUTHOR_NAME: "test",
	GIT_AUTHOR_EMAIL: "test@example.com",
	GIT_COMMITTER_NAME: "test",
	GIT_COMMITTER_EMAIL: "test@example.com",
};
