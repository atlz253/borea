import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileSystemPullRequestStore } from "./pull-request.store";

let directory: string | undefined;

afterEach(async () => {
	if (directory) {
		await rm(directory, { recursive: true, force: true });
		directory = undefined;
	}
});

describe("FileSystemPullRequestStore organization namespaces", () => {
	it("isolates pull requests for identically named repositories", async () => {
		directory = await mkdtemp(path.join(tmpdir(), "nirvana-pr-org-"));
		const store = new FileSystemPullRequestStore(directory);
		const common = {
			repoName: "shared",
			title: "Change",
			sourceBranch: "feature",
			targetBranch: "main",
			authorName: "anonymous",
		};

		await store.create({ ...common, organizationName: "team-a" });
		await store.create({ ...common, organizationName: "team-b" });

		await expect(
			store.list({
				organizationName: "team-a",
				repositoryName: "shared",
			}),
		).resolves.toMatchObject([{ organizationName: "team-a", id: 1 }]);
		await expect(
			store.list({
				organizationName: "team-b",
				repositoryName: "shared",
			}),
		).resolves.toMatchObject([{ organizationName: "team-b", id: 1 }]);
	});
});
