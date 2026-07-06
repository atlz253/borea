import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseProvider } from "#/platform/database";
import { cleanupAllTestDatabases, createTestDatabase } from "#/test-db";
import { PrismaPullRequestStore } from "./prisma-pull-request.store";

describe("PrismaPullRequestStore", () => {
	let db: DatabaseProvider;
	let store: PrismaPullRequestStore;

	const USER_ID = "00000000-0000-4000-8000-000000000000";
	const REVIEWER_ID = "00000000-0000-4000-8000-000000000001";

	beforeEach(async () => {
		db = createTestDatabase();
		const c = db.getClient();
		const now = new Date().toISOString();
		await c.organization.create({
			data: { name: "default", createdAt: now },
		});
		await c.user.create({
			data: {
				id: USER_ID,
				name: "test",
				email: "test@test.com",
				createdAt: now,
				credential: "{}",
			},
		});
		await c.user.create({
			data: {
				id: REVIEWER_ID,
				name: "reviewer",
				email: "r@r.com",
				createdAt: now,
				credential: "{}",
			},
		});
		await c.repository.create({
			data: {
				id: "default/my-repo",
				organizationName: "default",
				name: "my-repo",
				createdAt: now,
				ownerId: USER_ID,
			},
		});
		store = new PrismaPullRequestStore(db);
	});

	afterEach(() => {
		cleanupAllTestDatabases();
	});

	const prInput = {
		organizationName: "default",
		repoName: "my-repo",
		title: "My PR",
		sourceBranch: "feature",
		targetBranch: "main",
		authorName: "anonymous",
	};
	const locator = {
		organizationName: "default",
		repositoryName: "my-repo",
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
		const pr1 = await store.create({ ...prInput, title: "PR 1" });
		const pr2 = await store.create({ ...prInput, title: "PR 2" });
		const pr3 = await store.create({ ...prInput, title: "PR 3" });
		expect(pr1.id).toBe(1);
		expect(pr2.id).toBe(2);
		expect(pr3.id).toBe(3);
	});

	it("lists pull requests in reverse chronological order", async () => {
		await store.create({ ...prInput, title: "Oldest" });
		await store.create({ ...prInput, title: "Middle" });
		await store.create({ ...prInput, title: "Newest" });
		const list = await store.list(locator);
		expect(list).toHaveLength(3);
		expect(list[0].title).toBe("Newest");
		expect(list[2].title).toBe("Oldest");
	});

	it("returns empty list for non-existent repo", async () => {
		const list = await store.list({
			organizationName: "no-such-org",
			repositoryName: "no-such-repo",
		});
		expect(list).toEqual([]);
	});

	it("finds a pull request by id", async () => {
		await store.create(prInput);
		const pr = await store.get(locator, 1);
		expect(pr).toBeDefined();
		expect(pr?.title).toBe("My PR");
	});

	it("returns undefined for non-existent id", async () => {
		const pr = await store.get(locator, 999);
		expect(pr).toBeUndefined();
	});

	it("updates a pull request", async () => {
		const created = await store.create(prInput);
		const updated = await store.update(locator, created.id, {
			status: "closed",
			mergeCommitSha: "abc123",
		});
		expect(updated.status).toBe("closed");
		expect(updated.mergeCommitSha).toBe("abc123");
	});

	it("updates updatedAt on update", async () => {
		const created = await store.create(prInput);
		const updated = await store.update(locator, created.id, {
			title: "New title",
		});
		expect(updated.updatedAt).not.toBe(created.updatedAt);
	});

	it("tracks viewed files", async () => {
		const created = await store.create(prInput);
		const withViewed = await store.setFileViewed(
			locator,
			created.id,
			"src/index.ts",
			true,
		);
		expect(withViewed.viewedFiles).toContain("src/index.ts");
		const withoutViewed = await store.setFileViewed(
			locator,
			created.id,
			"src/index.ts",
			false,
		);
		expect(withoutViewed.viewedFiles).not.toContain("src/index.ts");
	});

	it("manages comments", async () => {
		const created = await store.create(prInput);
		const comment = await store.addComment(locator, created.id, {
			target: { type: "file", filePath: "src/index.ts" },
			body: "Great change!",
			authorId: REVIEWER_ID,
			authorName: "Reviewer",
		});
		expect(comment.body).toBe("Great change!");
		expect(comment.target).toEqual({ type: "file", filePath: "src/index.ts" });

		const comments = await store.listComments(locator, created.id);
		expect(comments).toHaveLength(1);
	});

	it("deletes all pull requests for a repo", async () => {
		await store.create(prInput);
		await store.create({ ...prInput, title: "PR 2" });
		await store.deleteAll(locator);
		const list = await store.list(locator);
		expect(list).toHaveLength(0);
	});
});
