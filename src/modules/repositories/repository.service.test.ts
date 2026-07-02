import { describe, expect, it, vi } from "vitest";
import type { GitProvider } from "#/modules/git";
import {
	createRepository,
	deleteRepository,
	getRepository,
	getRepositoryFile,
	listRepositories,
	listRepositoryFiles,
} from "./repository.service";

function createMockGit(): GitProvider {
	return {
		init: vi.fn(),
		delete: vi.fn(),
		list: vi.fn(),
		get: vi.fn(),
		exists: vi.fn(),
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

describe("deleteRepository", () => {
	it("deletes pull request data before the Git repository", async () => {
		const mockGit = createMockGit();
		const pullRequestStore = {
			create: vi.fn(),
			list: vi.fn(),
			get: vi.fn(),
			update: vi.fn(),
			deleteAll: vi.fn(),
		};

		await deleteRepository(mockGit, pullRequestStore, "test");

		expect(pullRequestStore.deleteAll).toHaveBeenCalledWith("test");
		expect(mockGit.delete).toHaveBeenCalledWith("test");
		expect(
			vi.mocked(pullRequestStore.deleteAll).mock.invocationCallOrder[0],
		).toBeLessThan(vi.mocked(mockGit.delete).mock.invocationCallOrder[0] ?? 0);
	});

	it("does not delete Git when pull request cleanup fails", async () => {
		const mockGit = createMockGit();
		const pullRequestStore = {
			create: vi.fn(),
			list: vi.fn(),
			get: vi.fn(),
			update: vi.fn(),
			deleteAll: vi.fn(),
		};
		pullRequestStore.deleteAll.mockRejectedValue(new Error("delete failed"));

		await expect(
			deleteRepository(mockGit, pullRequestStore, "test"),
		).rejects.toThrow("delete failed");
		expect(mockGit.delete).not.toHaveBeenCalled();
	});
});

describe("createRepository", () => {
	it("delegates to gitProvider.init with name and description", async () => {
		const mockGit = createMockGit();
		const expected = {
			organizationName: "default",
			name: "test",
			createdAt: new Date(),
		};
		vi.mocked(mockGit.init).mockResolvedValue(expected);

		const result = await createRepository(mockGit, {
			name: "test",
			description: "desc",
		});

		expect(mockGit.init).toHaveBeenCalledWith("test", "desc");
		expect(result).toEqual(expected);
	});

	it("forwards error when gitProvider.init fails", async () => {
		const mockGit = createMockGit();
		vi.mocked(mockGit.init).mockRejectedValue(new Error("git init failed"));

		await expect(
			createRepository(mockGit, { name: "fail", description: "" }),
		).rejects.toThrow("git init failed");
	});
});

describe("listRepositories", () => {
	it("delegates to gitProvider.list", async () => {
		const mockGit = createMockGit();
		const repos = [
			{ organizationName: "default", name: "a", createdAt: new Date() },
		];
		vi.mocked(mockGit.list).mockResolvedValue(repos);

		const result = await listRepositories(mockGit);

		expect(mockGit.list).toHaveBeenCalledOnce();
		expect(result).toEqual(repos);
	});
});

describe("getRepository", () => {
	it("returns repository data from the provider", async () => {
		const mockGit = createMockGit();
		const repository = {
			organizationName: "default",
			name: "test",
			createdAt: new Date(),
		};
		vi.mocked(mockGit.get).mockResolvedValue(repository);

		await expect(getRepository(mockGit, "test")).resolves.toEqual(repository);
		expect(mockGit.get).toHaveBeenCalledWith("test");
	});

	it("throws a typed not-found error for an unknown repository", async () => {
		const mockGit = createMockGit();
		vi.mocked(mockGit.get).mockResolvedValue(undefined);

		await expect(getRepository(mockGit, "missing")).rejects.toMatchObject({
			name: "NotFoundError",
			message: 'Repository "missing" not found',
		});
	});
});

describe("listRepositoryFiles", () => {
	it("delegates to gitProvider.listFiles when repository exists", async () => {
		const mockGit = createMockGit();
		const entries = [
			{ name: "README.md", type: "blob" as const, mode: "100644", size: 10 },
		];
		vi.mocked(mockGit.exists).mockResolvedValue(true);
		vi.mocked(mockGit.listFiles).mockResolvedValue(entries);

		const result = await listRepositoryFiles(mockGit, "my-repo");

		expect(mockGit.exists).toHaveBeenCalledWith("my-repo");
		expect(mockGit.listFiles).toHaveBeenCalledWith("my-repo", {
			path: undefined,
			ref: undefined,
		});
		expect(result).toBe(entries);
	});

	it("passes path through to gitProvider.listFiles", async () => {
		const mockGit = createMockGit();
		vi.mocked(mockGit.exists).mockResolvedValue(true);
		vi.mocked(mockGit.listFiles).mockResolvedValue([]);

		await listRepositoryFiles(mockGit, "my-repo", "src/components");

		expect(mockGit.listFiles).toHaveBeenCalledWith("my-repo", {
			path: "src/components",
			ref: undefined,
		});
	});

	it("throws not-found when repository does not exist", async () => {
		const mockGit = createMockGit();
		vi.mocked(mockGit.exists).mockResolvedValue(false);

		await expect(listRepositoryFiles(mockGit, "missing")).rejects.toThrow(
			/not found/,
		);
		expect(mockGit.listFiles).not.toHaveBeenCalled();
	});
});

describe("getRepositoryFile", () => {
	it("delegates to gitProvider.getFile with the server-selected limit", async () => {
		const mockGit = createMockGit();
		const expected = {
			status: "text" as const,
			path: "README.md",
			size: 6,
			content: "hello\n",
		};
		vi.mocked(mockGit.exists).mockResolvedValue(true);
		vi.mocked(mockGit.getFile).mockResolvedValue(expected);

		const result = await getRepositoryFile(
			mockGit,
			"my-repo",
			"README.md",
			"main",
			1024,
		);

		expect(mockGit.getFile).toHaveBeenCalledWith("my-repo", {
			path: "README.md",
			ref: "main",
			maxBytes: 1024,
		});
		expect(result).toBe(expected);
	});

	it("does not read a file when the repository does not exist", async () => {
		const mockGit = createMockGit();
		vi.mocked(mockGit.exists).mockResolvedValue(false);

		await expect(
			getRepositoryFile(mockGit, "missing", "README.md", "main", 1024),
		).rejects.toThrow(/not found/);
		expect(mockGit.getFile).not.toHaveBeenCalled();
	});
});
