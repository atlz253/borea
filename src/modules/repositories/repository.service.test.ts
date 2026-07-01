import { describe, expect, it, vi } from "vitest";
import type { GitProvider } from "#/modules/git";
import {
	createRepository,
	getRepositoryFile,
	listRepositories,
	listRepositoryFiles,
} from "./repository.service";

function createMockGit(): GitProvider {
	return {
		init: vi.fn(),
		list: vi.fn(),
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

describe("createRepository", () => {
	it("delegates to gitProvider.init with name and description", async () => {
		const mockGit = createMockGit();
		const expected = { name: "test", createdAt: new Date() };
		vi.mocked(mockGit.init).mockResolvedValue(expected);

		const result = await createRepository(mockGit, {
			name: "test",
			description: "desc",
		});

		expect(mockGit.init).toHaveBeenCalledWith("test", "desc");
		expect(result).toBe(expected);
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
		const repos = [{ name: "a", createdAt: new Date() }];
		vi.mocked(mockGit.list).mockResolvedValue(repos);

		const result = await listRepositories(mockGit);

		expect(mockGit.list).toHaveBeenCalledOnce();
		expect(result).toBe(repos);
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
