import { describe, expect, it } from "vitest";
import {
	createRepositorySchema,
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
