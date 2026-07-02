import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CliGitProvider } from "./providers/cli-git-provider";

let directory: string | undefined;

afterEach(async () => {
	if (directory) {
		await rm(directory, { recursive: true, force: true });
		directory = undefined;
	}
});

describe("CliGitProvider organization namespaces", () => {
	it("isolates repositories with the same name", async () => {
		directory = await mkdtemp(path.join(tmpdir(), "nirvana-git-org-"));
		const provider = new CliGitProvider(directory);
		const first = { organizationName: "team-a", repositoryName: "shared" };
		const second = { organizationName: "team-b", repositoryName: "shared" };

		await provider.init(first);
		await provider.init(second);

		expect(existsSync(path.join(directory, "team-a", "shared", "HEAD"))).toBe(
			true,
		);
		expect(existsSync(path.join(directory, "team-b", "shared", "HEAD"))).toBe(
			true,
		);
		await expect(provider.list("team-a")).resolves.toMatchObject([
			{ organizationName: "team-a", name: "shared" },
		]);
		await expect(provider.list("team-b")).resolves.toMatchObject([
			{ organizationName: "team-b", name: "shared" },
		]);
	});
});
