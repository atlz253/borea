import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
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
		expect(pr.viewedFiles).toEqual([]);
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

	it("normalizes legacy pull requests without viewedFiles", async () => {
		const repoDir = join(tmpDir, "my-repo");
		const pr = await store.create(prInput);
		await writeFile(
			join(repoDir, "1.json"),
			JSON.stringify(pr, (key, value) =>
				key === "viewedFiles" ? undefined : value,
			),
			"utf-8",
		);

		const found = await store.get("my-repo", 1);

		expect(found?.viewedFiles).toEqual([]);
	});

	it("adds and removes viewed files without duplicates", async () => {
		const pr = await store.create(prInput);

		await store.setFileViewed("my-repo", pr.id, "src/file.ts", true);
		await store.setFileViewed("my-repo", pr.id, "src/file.ts", true);
		let found = await store.get("my-repo", pr.id);
		expect(found?.viewedFiles).toEqual(["src/file.ts"]);

		await store.setFileViewed("my-repo", pr.id, "src/file.ts", false);
		found = await store.get("my-repo", pr.id);
		expect(found?.viewedFiles).toEqual([]);
	});

	it("serializes concurrent viewed file updates", async () => {
		const pr = await store.create(prInput);

		await Promise.all([
			store.setFileViewed("my-repo", pr.id, "a.ts", true),
			store.setFileViewed("my-repo", pr.id, "b.ts", true),
		]);

		const found = await store.get("my-repo", pr.id);
		expect(found?.viewedFiles).toEqual(["a.ts", "b.ts"]);
	});

	it("returns an empty comment list when no comments exist", async () => {
		const pr = await store.create(prInput);

		expect(await store.listComments("my-repo", pr.id)).toEqual([]);
	});

	it("persists comment identity, author, target, and body", async () => {
		const pr = await store.create(prInput);
		const authorId = "11111111-1111-4111-8111-111111111111";

		const comment = await store.addComment("my-repo", pr.id, {
			target: { type: "file", filePath: "src/file.ts" },
			body: "Review note",
			authorId,
			authorName: "Alice",
		});

		expect(comment).toMatchObject({
			target: { type: "file", filePath: "src/file.ts" },
			body: "Review note",
			authorId,
			authorName: "Alice",
		});
		expect(comment.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(comment.createdAt).toBeTruthy();
	});

	it("reads comments from disk in chronological order", async () => {
		const pr = await store.create(prInput);
		const input = {
			target: { type: "file" as const, filePath: "src/file.ts" },
			authorId: "11111111-1111-4111-8111-111111111111",
			authorName: "Alice",
		};
		await store.addComment("my-repo", pr.id, {
			...input,
			body: "First",
		});
		await store.addComment("my-repo", pr.id, {
			...input,
			body: "Second",
		});

		const secondStore = new FileSystemPullRequestStore(tmpDir);
		const comments = await secondStore.listComments("my-repo", pr.id);

		expect(comments.map((comment) => comment.body)).toEqual([
			"First",
			"Second",
		]);
	});

	it("isolates comments by organization namespace", async () => {
		const author = {
			target: { type: "file" as const, filePath: "src/file.ts" },
			body: "Organization A",
			authorId: "11111111-1111-4111-8111-111111111111",
			authorName: "Alice",
		};
		const prA = await store.create({
			...prInput,
			organizationName: "org-a",
		});
		const prB = await store.create({
			...prInput,
			organizationName: "org-b",
		});
		const locatorA = {
			organizationName: "org-a",
			repositoryName: "my-repo",
		};
		const locatorB = {
			organizationName: "org-b",
			repositoryName: "my-repo",
		};

		await store.addComment(locatorA, prA.id, author);

		expect(await store.listComments(locatorA, prA.id)).toHaveLength(1);
		expect(await store.listComments(locatorB, prB.id)).toEqual([]);
	});

	it("serializes concurrent comment appends", async () => {
		const pr = await store.create(prInput);
		const input = {
			target: { type: "file" as const, filePath: "src/file.ts" },
			authorId: "11111111-1111-4111-8111-111111111111",
			authorName: "Alice",
		};

		await Promise.all([
			store.addComment("my-repo", pr.id, { ...input, body: "First" }),
			store.addComment("my-repo", pr.id, { ...input, body: "Second" }),
		]);

		const comments = await store.listComments("my-repo", pr.id);
		expect(comments.map((comment) => comment.body)).toEqual([
			"First",
			"Second",
		]);
	});

	it("rejects comments when the pull request is not open", async () => {
		const pr = await store.create(prInput);
		await store.update("my-repo", pr.id, { status: "merged" });

		await expect(
			store.addComment("my-repo", pr.id, {
				target: { type: "file", filePath: "src/file.ts" },
				body: "Too late",
				authorId: "11111111-1111-4111-8111-111111111111",
				authorName: "Alice",
			}),
		).rejects.toThrow("cannot be commented on");
		expect(await store.listComments("my-repo", pr.id)).toEqual([]);
	});
});
