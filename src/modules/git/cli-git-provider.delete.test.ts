import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CliGitProvider } from "./providers/cli-git-provider";

describe("CliGitProvider repository deletion", () => {
	let tmpDir: string;
	let provider: CliGitProvider;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "borea-delete-test-"));
		provider = new CliGitProvider(tmpDir);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("deletes an existing repository", async () => {
		await provider.init("delete-me");

		await provider.delete("delete-me");

		expect(existsSync(join(tmpDir, "delete-me"))).toBe(false);
		expect(await provider.exists("delete-me")).toBe(false);
	});

	it("throws when deleting a missing repository", async () => {
		await expect(provider.delete("missing")).rejects.toThrow(/not found/);
	});

	it("does not delete neighboring repositories", async () => {
		await provider.init("delete-me");
		await provider.init("keep-me");

		await provider.delete("delete-me");

		expect(await provider.exists("keep-me")).toBe(true);
	});
});
