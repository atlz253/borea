import { describe, expect, it, vi } from "vitest";
import type { GitProvider } from "#/modules/git";
import { createRepository, listRepositories } from "./repository.service";

function createMockGit(): GitProvider {
	return {
		init: vi.fn(),
		list: vi.fn(),
		exists: vi.fn(),
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
