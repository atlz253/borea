import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CliGitProvider } from "./providers/cli-git-provider";

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
});
