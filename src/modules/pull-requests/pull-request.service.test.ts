import { describe, expect, it, vi } from "vitest";
import type { GitProvider } from "#/modules/git";
import { createPullRequestService } from "./pull-request.service";
import type { PullRequestStore } from "./pull-request.store";

function createMockGit(): GitProvider {
	return {
		init: vi.fn(),
		delete: vi.fn(),
		list: vi.fn(),
		get: vi.fn(),
		exists: vi.fn().mockResolvedValue(true),
		listFiles: vi.fn(),
		getFile: vi.fn(),
		advertiseRefs: vi.fn(),
		invokeService: vi.fn(),
		listBranches: vi.fn(),
		listCommits: vi.fn(),
		countCommits: vi.fn(),
		createBranch: vi.fn(),
		canMerge: vi.fn(),
		mergeBranch: vi.fn(),
		getCommit: vi.fn(),
		getCommitDiff: vi.fn(),
		getDiff: vi.fn(),
	};
}

function createMockStore(): PullRequestStore {
	return {
		create: vi.fn(),
		list: vi.fn(),
		get: vi.fn(),
		update: vi.fn(),
		setFileViewed: vi.fn(),
		listComments: vi.fn(),
		addComment: vi.fn(),
		deleteAll: vi.fn(),
	};
}

const prData = {
	id: 1,
	organizationName: "default",
	repoName: "my-repo",
	title: "Test PR",
	sourceBranch: "feature",
	targetBranch: "main",
	status: "open" as const,
	authorName: "anonymous",
	viewedFiles: [],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("createPullRequest", () => {
	it("creates a pull request when branches exist and differ", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(git.listBranches).mockResolvedValue([
			{ name: "main", isHead: true },
			{ name: "feature", isHead: false },
		]);
		vi.mocked(store.create).mockResolvedValue(prData);

		const svc = createPullRequestService(git, store);
		const result = await svc.createPullRequest({
			repoName: "my-repo",
			title: "Test PR",
			sourceBranch: "feature",
			targetBranch: "main",
		});

		expect(result).toBe(prData);
		expect(git.listBranches).toHaveBeenCalledWith("my-repo");
		expect(store.create).toHaveBeenCalledWith({
			repoName: "my-repo",
			title: "Test PR",
			sourceBranch: "feature",
			targetBranch: "main",
			authorName: "anonymous",
		});
	});

	it("throws when source equals target", async () => {
		const git = createMockGit();
		const store = createMockStore();
		const svc = createPullRequestService(git, store);

		await expect(
			svc.createPullRequest({
				repoName: "my-repo",
				title: "Test",
				sourceBranch: "main",
				targetBranch: "main",
			}),
		).rejects.toThrow("must be different");
	});

	it("throws when source branch does not exist", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(git.listBranches).mockResolvedValue([
			{ name: "main", isHead: true },
		]);

		const svc = createPullRequestService(git, store);
		await expect(
			svc.createPullRequest({
				repoName: "my-repo",
				title: "Test",
				sourceBranch: "nope",
				targetBranch: "main",
			}),
		).rejects.toThrow("not found");
	});

	it("throws when target branch does not exist", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(git.listBranches).mockResolvedValue([
			{ name: "main", isHead: true },
			{ name: "feature", isHead: false },
		]);

		const svc = createPullRequestService(git, store);
		await expect(
			svc.createPullRequest({
				repoName: "my-repo",
				title: "Test",
				sourceBranch: "feature",
				targetBranch: "nope",
			}),
		).rejects.toThrow("not found");
	});
});

describe("mergePullRequest", () => {
	it("merges an open pull request without conflicts", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(git.canMerge).mockResolvedValue({
			conflicts: false,
			fastForward: true,
			conflictingFiles: [],
		});
		vi.mocked(git.mergeBranch).mockResolvedValue({
			mergedSha: "abc123",
			fastForward: true,
		});
		vi.mocked(store.update).mockResolvedValue({
			...prData,
			status: "merged",
			mergeCommitSha: "abc123",
		});

		const svc = createPullRequestService(git, store);
		const result = await svc.mergePullRequest("my-repo", 1, {
			fastForward: true,
		});

		expect(result.pullRequest.status).toBe("merged");
		expect(result.mergeResult.mergedSha).toBe("abc123");
		expect(git.mergeBranch).toHaveBeenCalled();
		expect(store.update).toHaveBeenCalledWith("my-repo", 1, {
			status: "merged",
			mergeCommitSha: "abc123",
		});
	});

	it("throws when PR is not open", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue({
			...prData,
			status: "merged",
		});

		const svc = createPullRequestService(git, store);
		await expect(svc.mergePullRequest("my-repo", 1)).rejects.toThrow(
			"already merged",
		);
	});

	it("throws when conflicts exist", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(git.canMerge).mockResolvedValue({
			conflicts: true,
			fastForward: false,
			conflictingFiles: ["README.md"],
		});

		const svc = createPullRequestService(git, store);
		await expect(svc.mergePullRequest("my-repo", 1)).rejects.toThrow(
			"Merge conflicts",
		);
	});

	it("throws when PR is not found", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(undefined);

		const svc = createPullRequestService(git, store);
		await expect(svc.mergePullRequest("my-repo", 999)).rejects.toThrow(
			"not found",
		);
	});
});

describe("listPullRequests", () => {
	it("delegates to store.list", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.list).mockResolvedValue([prData]);

		const svc = createPullRequestService(git, store);
		const result = await svc.listPullRequests("my-repo");

		expect(result).toEqual([prData]);
		expect(store.list).toHaveBeenCalledWith("my-repo");
	});

	it("throws not-found when the repository does not exist", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(git.exists).mockResolvedValue(false);

		const svc = createPullRequestService(git, store);

		await expect(svc.listPullRequests("missing")).rejects.toMatchObject({
			name: "NotFoundError",
		});
		expect(store.list).not.toHaveBeenCalled();
	});
});

describe("getPullRequest", () => {
	it("delegates to store.get", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);

		const svc = createPullRequestService(git, store);
		const result = await svc.getPullRequest("my-repo", 1);

		expect(result).toBe(prData);
		expect(store.get).toHaveBeenCalledWith("my-repo", 1);
	});

	it("throws a typed error when the pull request is missing", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(undefined);

		const svc = createPullRequestService(git, store);

		await expect(svc.getPullRequest("my-repo", 999)).rejects.toMatchObject({
			name: "NotFoundError",
		});
	});
});

describe("checkMergeStatus", () => {
	it("checks mergeability from git provider", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(git.canMerge).mockResolvedValue({
			conflicts: false,
			fastForward: true,
			conflictingFiles: [],
		});

		const svc = createPullRequestService(git, store);
		const result = await svc.checkMergeStatus("my-repo", 1);

		expect(result.conflicts).toBe(false);
		expect(git.canMerge).toHaveBeenCalledWith("my-repo", "feature", "main");
	});

	it("throws when PR not found", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(undefined);

		const svc = createPullRequestService(git, store);
		await expect(svc.checkMergeStatus("my-repo", 999)).rejects.toThrow(
			"not found",
		);
	});
});

describe("getPullRequestDiff", () => {
	it("delegates to gitProvider.getDiff with target and source branches", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		const expectedDiff = [
			{
				oldPath: null,
				newPath: "file.ts",
				status: "added" as const,
				hunks: [],
				isBinary: false,
			},
		];
		vi.mocked(git.getDiff).mockResolvedValue(expectedDiff);

		const svc = createPullRequestService(git, store);
		const files = await svc.getPullRequestDiff("my-repo", 1);

		expect(git.getDiff).toHaveBeenCalledWith("my-repo", "main", "feature");
		expect(files).toEqual(expectedDiff);
	});

	it("throws when PR not found", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(undefined);

		const svc = createPullRequestService(git, store);
		await expect(svc.getPullRequestDiff("my-repo", 999)).rejects.toThrow(
			"not found",
		);
	});
});

describe("setPullRequestFileViewed", () => {
	it("persists a viewed file that belongs to the pull request diff", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(git.getDiff).mockResolvedValue([
			{
				oldPath: null,
				newPath: "src/file.ts",
				status: "added",
				hunks: [],
				isBinary: false,
			},
		]);
		vi.mocked(store.setFileViewed).mockResolvedValue({
			...prData,
			viewedFiles: ["src/file.ts"],
		});

		const svc = createPullRequestService(git, store);
		const result = await svc.setPullRequestFileViewed(
			"my-repo",
			1,
			"src/file.ts",
			true,
		);

		expect(result.viewedFiles).toEqual(["src/file.ts"]);
		expect(store.setFileViewed).toHaveBeenCalledWith(
			"my-repo",
			1,
			"src/file.ts",
			true,
		);
	});

	it("supports deleted files by their old path", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(git.getDiff).mockResolvedValue([
			{
				oldPath: "deleted.ts",
				newPath: null,
				status: "deleted",
				hunks: [],
				isBinary: false,
			},
		]);
		vi.mocked(store.setFileViewed).mockResolvedValue(prData);

		const svc = createPullRequestService(git, store);
		await svc.setPullRequestFileViewed("my-repo", 1, "deleted.ts", false);

		expect(store.setFileViewed).toHaveBeenCalledWith(
			"my-repo",
			1,
			"deleted.ts",
			false,
		);
	});

	it("rejects a file that is not in the current diff", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(git.getDiff).mockResolvedValue([]);

		const svc = createPullRequestService(git, store);

		await expect(
			svc.setPullRequestFileViewed("my-repo", 1, "unknown.ts", true),
		).rejects.toThrow("is not part of pull request");
		expect(store.setFileViewed).not.toHaveBeenCalled();
	});

	it("rejects an unknown pull request", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(undefined);

		const svc = createPullRequestService(git, store);

		await expect(
			svc.setPullRequestFileViewed("my-repo", 999, "file.ts", true),
		).rejects.toThrow("not found");
	});
});

describe("pull request file comments", () => {
	const author = {
		id: "11111111-1111-4111-8111-111111111111",
		name: "Alice",
	};
	const comment = {
		id: "22222222-2222-4222-8222-222222222222",
		target: { type: "file" as const, filePath: "src/file.ts" },
		body: "Looks good",
		authorId: author.id,
		authorName: author.name,
		createdAt: "2026-01-01T00:00:00.000Z",
	};

	it("lists comments after requiring the pull request", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(store.listComments).mockResolvedValue([comment]);

		const svc = createPullRequestService(git, store);
		const result = await svc.listPullRequestComments("my-repo", 1);

		expect(result).toEqual([comment]);
		expect(store.listComments).toHaveBeenCalledWith("my-repo", 1);
	});

	it.each([
		{
			status: "added" as const,
			oldPath: null,
			newPath: "src/file.ts",
		},
		{
			status: "modified" as const,
			oldPath: "src/file.ts",
			newPath: "src/file.ts",
		},
		{
			status: "renamed" as const,
			oldPath: "src/old.ts",
			newPath: "src/file.ts",
		},
		{
			status: "deleted" as const,
			oldPath: "src/file.ts",
			newPath: null,
		},
	])("adds a comment to a $status file", async (file) => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(git.getDiff).mockResolvedValue([
			{ ...file, hunks: [], isBinary: false },
		]);
		vi.mocked(store.addComment).mockResolvedValue(comment);

		const svc = createPullRequestService(git, store);
		const result = await svc.addPullRequestFileComment(
			"my-repo",
			1,
			"src/file.ts",
			"Looks good",
			author,
		);

		expect(result).toEqual(comment);
		expect(store.addComment).toHaveBeenCalledWith("my-repo", 1, {
			target: { type: "file", filePath: "src/file.ts" },
			body: "Looks good",
			authorId: author.id,
			authorName: author.name,
		});
	});

	it("rejects a file outside the current diff", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue(prData);
		vi.mocked(git.getDiff).mockResolvedValue([]);

		const svc = createPullRequestService(git, store);

		await expect(
			svc.addPullRequestFileComment(
				"my-repo",
				1,
				"unknown.ts",
				"Comment",
				author,
			),
		).rejects.toThrow("is not part of pull request");
		expect(store.addComment).not.toHaveBeenCalled();
	});

	it("rejects comments on a non-open pull request", async () => {
		const git = createMockGit();
		const store = createMockStore();
		vi.mocked(store.get).mockResolvedValue({ ...prData, status: "merged" });

		const svc = createPullRequestService(git, store);

		await expect(
			svc.addPullRequestFileComment(
				"my-repo",
				1,
				"src/file.ts",
				"Comment",
				author,
			),
		).rejects.toMatchObject({ name: "ConflictError" });
		expect(git.getDiff).not.toHaveBeenCalled();
		expect(store.addComment).not.toHaveBeenCalled();
	});
});
