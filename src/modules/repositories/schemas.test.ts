import { describe, expect, it } from "vitest";
import {
	branchNameSchema,
	createBranchSchema,
	createRepositorySchema,
	deleteRepositorySchema,
	getFileSchema,
	listFilesSchema,
	repoNameSchema,
	treeEntrySchema,
} from "./schemas";

describe("repoNameSchema", () => {
	it("accepts valid names", () => {
		expect(repoNameSchema.parse("my-repo")).toBe("my-repo");
		expect(repoNameSchema.parse("repo123")).toBe("repo123");
		expect(repoNameSchema.parse("a.b")).toBe("a.b");
		expect(repoNameSchema.parse("a_b")).toBe("a_b");
		expect(repoNameSchema.parse("a-b")).toBe("a-b");
	});

	it("rejects empty name", () => {
		expect(() => repoNameSchema.parse("")).toThrow();
	});

	it("rejects name starting with dot", () => {
		expect(() => repoNameSchema.parse(".repo")).toThrow();
	});

	it("rejects name with special characters", () => {
		expect(() => repoNameSchema.parse("repo/name")).toThrow();
		expect(() => repoNameSchema.parse("repo name")).toThrow();
		expect(() => repoNameSchema.parse("repo!")).toThrow();
	});

	it("rejects .git suffix", () => {
		expect(() => repoNameSchema.parse("repo.git")).toThrow();
		expect(() => repoNameSchema.parse("Repo.Git")).toThrow();
	});

	it("rejects dot and dotdot", () => {
		expect(() => repoNameSchema.parse(".")).toThrow();
		expect(() => repoNameSchema.parse("..")).toThrow();
	});

	it("rejects overly long names", () => {
		expect(() => repoNameSchema.parse("a".repeat(101))).toThrow();
	});
});

describe("getFileSchema", () => {
	it("accepts a relative path and defaults loadLarge to false", () => {
		expect(
			getFileSchema.parse({
				name: "my-repo",
				path: "src/index.ts",
				ref: "main",
			}),
		).toEqual({
			name: "my-repo",
			path: "src/index.ts",
			ref: "main",
			loadLarge: false,
		});
	});

	it("rejects an empty or parent-relative path", () => {
		expect(() => getFileSchema.parse({ name: "my-repo", path: "" })).toThrow();
		expect(() =>
			getFileSchema.parse({ name: "my-repo", path: "../secret" }),
		).toThrow();
	});
});

describe("createRepositorySchema", () => {
	it("accepts name only", () => {
		const result = createRepositorySchema.parse({ name: "test" });
		expect(result.name).toBe("test");
		expect(result.description).toBe("");
	});

	it("accepts name with description", () => {
		const result = createRepositorySchema.parse({
			name: "test",
			description: "My repo",
		});
		expect(result.description).toBe("My repo");
	});

	it("trims description", () => {
		const result = createRepositorySchema.parse({
			name: "test",
			description: "  hello  ",
		});
		expect(result.description).toBe("hello");
	});

	it("rejects too long description", () => {
		expect(() =>
			createRepositorySchema.parse({
				name: "test",
				description: "x".repeat(501),
			}),
		).toThrow();
	});
});

describe("deleteRepositorySchema", () => {
	it("accepts an exact repository name confirmation", () => {
		expect(
			deleteRepositorySchema.parse({
				name: "my-repo",
				confirmation: "my-repo",
			}),
		).toEqual({
			name: "my-repo",
			confirmation: "my-repo",
		});
	});

	it("accepts a personal repository scope", () => {
		expect(
			deleteRepositorySchema.parse({
				userName: "alice",
				name: "my-repo",
				confirmation: "my-repo",
			}),
		).toMatchObject({ userName: "alice", name: "my-repo" });
	});

	it("rejects conflicting user and organization scopes", () => {
		expect(() =>
			deleteRepositorySchema.parse({
				organizationName: "default",
				userName: "alice",
				name: "my-repo",
				confirmation: "my-repo",
			}),
		).toThrow(/cannot include both/);
	});

	it("rejects a mismatched or differently cased confirmation", () => {
		expect(() =>
			deleteRepositorySchema.parse({
				name: "my-repo",
				confirmation: "other",
			}),
		).toThrow(/does not match/);
		expect(() =>
			deleteRepositorySchema.parse({
				name: "my-repo",
				confirmation: "My-Repo",
			}),
		).toThrow(/does not match/);
	});

	it("does not trim the confirmation", () => {
		expect(() =>
			deleteRepositorySchema.parse({
				name: "my-repo",
				confirmation: " my-repo ",
			}),
		).toThrow(/does not match/);
	});
});

describe("treeEntrySchema", () => {
	it("accepts a blob entry with size", () => {
		expect(
			treeEntrySchema.parse({
				name: "file.ts",
				type: "blob",
				mode: "100644",
				size: 1234,
			}),
		).toEqual({
			name: "file.ts",
			type: "blob",
			mode: "100644",
			size: 1234,
		});
	});

	it("accepts a tree entry without size", () => {
		expect(
			treeEntrySchema.parse({
				name: "src",
				type: "tree",
				mode: "040000",
			}),
		).toEqual({ name: "src", type: "tree", mode: "040000" });
	});

	it("rejects unknown entry type", () => {
		expect(() =>
			treeEntrySchema.parse({ name: "x", type: "commit", mode: "160000" }),
		).toThrow();
	});

	it("rejects empty name", () => {
		expect(() =>
			treeEntrySchema.parse({ name: "", type: "blob", mode: "100644" }),
		).toThrow();
	});
});

describe("branchNameSchema", () => {
	it("accepts simple names", () => {
		expect(branchNameSchema.parse("main")).toBe("main");
		expect(branchNameSchema.parse("develop")).toBe("develop");
		expect(branchNameSchema.parse("v1.0")).toBe("v1.0");
	});

	it("accepts names with slashes", () => {
		expect(branchNameSchema.parse("feature/login")).toBe("feature/login");
		expect(branchNameSchema.parse("feature/feat-1")).toBe("feature/feat-1");
	});

	it("accepts names with special allowed chars", () => {
		expect(branchNameSchema.parse("fix_123")).toBe("fix_123");
		expect(branchNameSchema.parse("release/1.0")).toBe("release/1.0");
	});

	it("rejects empty name", () => {
		expect(() => branchNameSchema.parse("")).toThrow();
	});

	it("rejects name starting with hyphen", () => {
		expect(() => branchNameSchema.parse("-branch")).toThrow();
	});

	it("rejects name with consecutive dots", () => {
		expect(() => branchNameSchema.parse("a..b")).toThrow();
	});

	it("rejects name ending with .lock", () => {
		expect(() => branchNameSchema.parse("main.lock")).toThrow();
	});

	it("rejects name with @{", () => {
		expect(() => branchNameSchema.parse("branch@{1}")).toThrow();
	});

	it("rejects name with spaces", () => {
		expect(() => branchNameSchema.parse("my branch")).toThrow();
	});

	it("rejects name with tilde", () => {
		expect(() => branchNameSchema.parse("branch~1")).toThrow();
	});

	it("rejects name with caret", () => {
		expect(() => branchNameSchema.parse("branch^1")).toThrow();
	});

	it("rejects name with colon", () => {
		expect(() => branchNameSchema.parse("branch:fix")).toThrow();
	});

	it("rejects name with question mark", () => {
		expect(() => branchNameSchema.parse("branch?")).toThrow();
	});

	it("rejects name with asterisk", () => {
		expect(() => branchNameSchema.parse("branch*")).toThrow();
	});

	it("rejects name with backslash", () => {
		expect(() => branchNameSchema.parse("branch\\name")).toThrow();
	});

	it("rejects too long name", () => {
		expect(() => branchNameSchema.parse("b".repeat(201))).toThrow();
	});
});

describe("createBranchSchema", () => {
	it("accepts name and branch", () => {
		const result = createBranchSchema.parse({
			name: "my-repo",
			branch: "new-feature",
		});
		expect(result.name).toBe("my-repo");
		expect(result.branch).toBe("new-feature");
		expect(result.from).toBeUndefined();
	});

	it("accepts optional from", () => {
		const result = createBranchSchema.parse({
			name: "my-repo",
			branch: "fix",
			from: "main",
		});
		expect(result.from).toBe("main");
	});

	it("rejects invalid repo name", () => {
		expect(() =>
			createBranchSchema.parse({ name: "bad repo", branch: "fix" }),
		).toThrow();
	});

	it("rejects invalid branch name", () => {
		expect(() =>
			createBranchSchema.parse({ name: "my-repo", branch: "bad branch" }),
		).toThrow();
	});
});

describe("listFilesSchema", () => {
	it("accepts name only", () => {
		const result = listFilesSchema.parse({ name: "my-repo" });
		expect(result.name).toBe("my-repo");
		expect(result.path).toBeUndefined();
	});

	it("accepts name with nested path", () => {
		const result = listFilesSchema.parse({
			name: "my-repo",
			path: "src/components",
		});
		expect(result.path).toBe("src/components");
	});

	it("rejects parent-directory segment", () => {
		expect(() =>
			listFilesSchema.parse({ name: "my-repo", path: "../etc" }),
		).toThrow();
		expect(() =>
			listFilesSchema.parse({ name: "my-repo", path: "src/../.." }),
		).toThrow();
	});

	it("rejects absolute path", () => {
		expect(() =>
			listFilesSchema.parse({ name: "my-repo", path: "/etc" }),
		).toThrow();
	});

	it("rejects path with null byte", () => {
		expect(() =>
			listFilesSchema.parse({ name: "my-repo", path: "a\0b" }),
		).toThrow();
	});

	it("rejects trailing slash", () => {
		expect(() =>
			listFilesSchema.parse({ name: "my-repo", path: "src/" }),
		).toThrow();
	});

	it("rejects invalid repo name", () => {
		expect(() => listFilesSchema.parse({ name: "rep o" })).toThrow();
	});
});
