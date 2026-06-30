import { describe, expect, it, vi } from "vitest";
import type { GitProvider } from "#/modules/git";
import { createPullRequestService } from "./pull-request.service";
import type { PullRequestStore } from "./pull-request.store";

function createMockGit(): GitProvider {
	return {
		init: vi.fn(),
		list: vi.fn(),
		exists: vi.fn(),
		listFiles: vi.fn(),
		advertiseRefs: vi.fn(),
		invokeService: vi.fn(),
		listBranches: vi.fn(),
		listCommits: vi.fn(),
		countCommits: vi.fn(),
		createBranch: vi.fn(),
		canMerge: vi.fn(),
		mergeBranch: vi.fn(),
	};
}

function createMockStore(): PullRequestStore {
	return {
		create: vi.fn(),
		list: vi.fn(),
		get: vi.fn(),
		update: vi.fn(),
	};
}

const prData = {
	id: 1,
	repoName: "my-repo",
	title: "Test PR",
	sourceBranch: "feature",
	targetBranch: "main",
	status: "open" as const,
	authorName: "anonymous",
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
