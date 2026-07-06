import { describe, expect, it } from "vitest";
import {
	getFileSchema,
	listFilesSchema,
	refSchema,
	repoPathSchema,
} from "../schemas";

describe("repository file validators", () => {
	describe("listFilesSchema", () => {
		it("accepts valid file listing input", () => {
			const result = listFilesSchema.parse({ name: "my-repo" });
			expect(result).toEqual({
				name: "my-repo",
				organizationName: "default",
			});
		});

		it("accepts path parameter", () => {
			const result = listFilesSchema.parse({
				name: "my-repo",
				path: "src/components",
			});
			expect(result.path).toBe("src/components");
		});

		it("accepts ref parameter", () => {
			const result = listFilesSchema.parse({
				name: "my-repo",
				ref: "main",
			});
			expect(result.ref).toBe("main");
		});

		it("accepts both path and ref", () => {
			const result = listFilesSchema.parse({
				name: "my-repo",
				path: "src",
				ref: "develop",
			});
			expect(result).toMatchObject({
				name: "my-repo",
				path: "src",
				ref: "develop",
			});
		});

		it("rejects path with parent-directory segments", () => {
			expect(() =>
				listFilesSchema.parse({ name: "my-repo", path: "src/../config" }),
			).toThrow(/parent-directory/i);
		});

		it("rejects path with leading slash", () => {
			expect(() =>
				listFilesSchema.parse({ name: "my-repo", path: "/absolute/path" }),
			).toThrow(/leading/i);
		});

		it("rejects path with trailing slash", () => {
			expect(() =>
				listFilesSchema.parse({ name: "my-repo", path: "relative/path/" }),
			).toThrow(/trailing/i);
		});

		it("rejects path with null bytes", () => {
			expect(() =>
				listFilesSchema.parse({ name: "my-repo", path: "src\x00file" }),
			).toThrow(/null bytes/i);
		});

		it("rejects path exceeding maximum length", () => {
			expect(() =>
				listFilesSchema.parse({ name: "my-repo", path: "a".repeat(1025) }),
			).toThrow();
		});

		it("rejects invalid repository name", () => {
			expect(() => listFilesSchema.parse({ name: "Invalid Name!" })).toThrow();
		});
	});

	describe("getFileSchema", () => {
		it("accepts valid file read input", () => {
			const result = getFileSchema.parse({
				name: "my-repo",
				path: "README.md",
			});
			expect(result.path).toBe("README.md");
			expect(result.loadLarge).toBe(false);
		});

		it("defaults loadLarge to false", () => {
			const result = getFileSchema.parse({
				name: "my-repo",
				path: "large-file.bin",
			});
			expect(result.loadLarge).toBe(false);
		});

		it("accepts loadLarge=true", () => {
			const result = getFileSchema.parse({
				name: "my-repo",
				path: "large-file.bin",
				loadLarge: true,
			});
			expect(result.loadLarge).toBe(true);
		});

		it("accepts ref parameter", () => {
			const result = getFileSchema.parse({
				name: "my-repo",
				path: "README.md",
				ref: "main",
			});
			expect(result.ref).toBe("main");
		});

		it("rejects empty file path", () => {
			expect(() => getFileSchema.parse({ name: "my-repo", path: "" })).toThrow(
				/file path/i,
			);
		});

		it("rejects path with parent-directory segments", () => {
			expect(() =>
				getFileSchema.parse({ name: "my-repo", path: "../../../etc/passwd" }),
			).toThrow();
		});

		it("rejects path with null bytes", () => {
			expect(() =>
				getFileSchema.parse({ name: "my-repo", path: "src\x00file" }),
			).toThrow();
		});

		it("rejects invalid repository name", () => {
			expect(() =>
				getFileSchema.parse({ name: "Bad!", path: "README.md" }),
			).toThrow();
		});
	});

	describe("repoPathSchema", () => {
		it("accepts valid file paths", () => {
			expect(repoPathSchema.parse("README.md")).toBe("README.md");
			expect(repoPathSchema.parse("src/components/Button.tsx")).toBe(
				"src/components/Button.tsx",
			);
			expect(repoPathSchema.parse("a")).toBe("a");
		});

		it("rejects paths with parent-directory segments", () => {
			expect(() => repoPathSchema.parse("src/../config")).toThrow(
				/parent-directory/i,
			);
			expect(() => repoPathSchema.parse("../etc")).toThrow();
		});

		it("rejects paths with leading slash", () => {
			expect(() => repoPathSchema.parse("/absolute")).toThrow(/leading/i);
		});

		it("rejects paths with trailing slash", () => {
			expect(() => repoPathSchema.parse("relative/")).toThrow(/trailing/i);
		});

		it("rejects paths with null bytes", () => {
			expect(() => repoPathSchema.parse("src\x00file")).toThrow(/null bytes/i);
		});

		it("accepts empty path (no min constraint)", () => {
			expect(repoPathSchema.parse("")).toBe("");
		});

		it("rejects path exceeding maximum length", () => {
			expect(() => repoPathSchema.parse("a".repeat(1025))).toThrow();
		});

		it("accepts path at maximum length", () => {
			const maxPath = "a".repeat(1024);
			expect(repoPathSchema.parse(maxPath)).toBe(maxPath);
		});
	});

	describe("refSchema", () => {
		it("accepts valid refs", () => {
			expect(refSchema.parse("main")).toBe("main");
			expect(refSchema.parse("develop")).toBe("develop");
			expect(refSchema.parse("feature/test")).toBe("feature/test");
			expect(refSchema.parse("v1.0.0")).toBe("v1.0.0");
		});

		it("rejects refs with null bytes", () => {
			expect(() => refSchema.parse("main\x00")).toThrow(/null bytes/i);
		});

		it("rejects refs exceeding maximum length", () => {
			expect(() => refSchema.parse("a".repeat(1025))).toThrow();
		});

		it("accepts ref at maximum length", () => {
			const maxRef = "a".repeat(1024);
			expect(refSchema.parse(maxRef)).toBe(maxRef);
		});
	});

	describe("combined file validators", () => {
		it("listRepositoryFilesFn validator parses full input", () => {
			const input = {
				name: "my-repo",
				path: "src/components",
				ref: "main",
			};
			const result = listFilesSchema.parse(input);
			expect(result).toMatchObject({
				name: "my-repo",
				path: "src/components",
				ref: "main",
			});
		});

		it("getRepositoryFileFn validator parses full input with loadLarge", () => {
			const input = {
				name: "my-repo",
				path: "README.md",
				ref: "main",
				loadLarge: true,
			};
			const result = getFileSchema.parse(input);
			expect(result).toMatchObject({
				name: "my-repo",
				path: "README.md",
				ref: "main",
				loadLarge: true,
			});
		});
	});
});
