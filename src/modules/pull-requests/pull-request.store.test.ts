import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemPullRequestStore } from "./pull-request.store";

describe("FileSystemPullRequestStore", () => {
	let tmpDir: string;
	let store: FileSystemPullRequestStore;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "nirvana-pr-store-"));
		store = new FileSystemPullRequestStore(tmpDir);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	const prInput = {
		repoName: "my-repo",
		title: "My PR",
		sourceBranch: "feature",
		targetBranch: "main",
		authorName: "anonymous",
	};

	it("creates a pull request and assigns an id", async () => {
		const pr = await store.create(prInput);

		expect(pr.id).toBe(1);
		expect(pr.repoName).toBe("my-repo");
		expect(pr.title).toBe("My PR");
		expect(pr.sourceBranch).toBe("feature");
		expect(pr.targetBranch).toBe("main");
		expect(pr.authorName).toBe("anonymous");
		expect(pr.status).toBe("open");
		expect(pr.createdAt).toBeTruthy();
		expect(pr.updatedAt).toBe(pr.createdAt);
	});

	it("increments id for each creation", async () => {
		await store.create({ ...prInput, title: "PR 1" });
		await store.create({ ...prInput, title: "PR 2" });
		await store.create({ ...prInput, title: "PR 3" });

		const list = await store.list("my-repo");
		const ids = list.map((p) => p.id).sort((a, b) => a - b);
		expect(ids).toEqual([1, 2, 3]);
	});

	it("lists pull requests in reverse chronological order", async () => {
		await store.create({ ...prInput, title: "Oldest" });
		await store.create({ ...prInput, title: "Middle" });
		await store.create({ ...prInput, title: "Newest" });

		const list = await store.list("my-repo");

		expect(list).toHaveLength(3);
		expect(list[0].title).toBe("Newest");
		expect(list[2].title).toBe("Oldest");
	});

	it("returns empty list for non-existent repo", async () => {
		const list = await store.list("no-such-repo");
		expect(list).toEqual([]);
	});

	it("gets a pull request by id", async () => {
		const pr = await store.create(prInput);
		const found = await store.get("my-repo", pr.id);

		expect(found).toBeDefined();
		expect(found?.id).toBe(pr.id);
		expect(found?.title).toBe("My PR");
	});

	it("returns undefined for non-existent pull request", async () => {
		await store.create(prInput);
		const found = await store.get("my-repo", 999);
		expect(found).toBeUndefined();
	});

	it("updates a pull request", async () => {
		const pr = await store.create(prInput);
		const updated = await store.update("my-repo", pr.id, {
			title: "Updated Title",
			status: "merged",
			mergeCommitSha: "abc123",
		});

		expect(updated.title).toBe("Updated Title");
		expect(updated.status).toBe("merged");
		expect(updated.mergeCommitSha).toBe("abc123");
		expect(updated.updatedAt).not.toBe(pr.updatedAt);
		expect(updated.id).toBe(pr.id);
		expect(updated.repoName).toBe(pr.repoName);
	});

	it("throws on update for non-existent pr", async () => {
		await expect(
			store.update("my-repo", 999, { title: "Nope" }),
		).rejects.toThrow("not found");
	});

	it("creates separate files per repo", async () => {
		await store.create({ ...prInput, repoName: "repo-a" });
		await store.create({ ...prInput, repoName: "repo-b" });

		const aList = await store.list("repo-a");
		const bList = await store.list("repo-b");

		expect(aList).toHaveLength(1);
		expect(bList).toHaveLength(1);
		expect(aList[0].id).toBe(1);
		expect(bList[0].id).toBe(1);
		expect(aList[0].repoName).toBe("repo-a");
		expect(bList[0].repoName).toBe("repo-b");
	});

	it("deletes all pull requests for one repository", async () => {
		await store.create({ ...prInput, repoName: "delete-me" });
		await store.create({ ...prInput, repoName: "keep-me" });

		await store.deleteAll("delete-me");

		expect(await store.list("delete-me")).toEqual([]);
		expect(await store.list("keep-me")).toHaveLength(1);
	});

	it("allows deleting pull request data that does not exist", async () => {
		await expect(store.deleteAll("missing")).resolves.toBeUndefined();
	});

	it("writes to disk so file exists", async () => {
		await store.create(prInput);
		const filePath = join(tmpDir, "my-repo", "1.json");

		expect(existsSync(filePath)).toBe(true);
	});

	it("reads existing data from disk on list", async () => {
		await store.create(prInput);
		await store.create({ ...prInput, title: "Second" });

		const secondStore = new FileSystemPullRequestStore(tmpDir);
		const list = await secondStore.list("my-repo");

		expect(list).toHaveLength(2);
	});
});
