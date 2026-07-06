import { describe, expect, it } from "vitest";
import {
	branchNameSchema,
	createBranchSchema,
	listBranchesSchema,
} from "../schemas";

describe("repository branch validators", () => {
	describe("listBranchesSchema", () => {
		it("accepts valid branch listing input", () => {
			const result = listBranchesSchema.parse({ name: "my-repo" });
			expect(result).toEqual({
				name: "my-repo",
				organizationName: "default",
			});
		});

		it("rejects invalid repository name", () => {
			expect(() => listBranchesSchema.parse({ name: "Invalid!" })).toThrow();
		});
	});

	describe("branchNameSchema", () => {
		it("accepts valid branch names", () => {
			expect(branchNameSchema.parse("main")).toBe("main");
			expect(branchNameSchema.parse("feature/test")).toBe("feature/test");
			expect(branchNameSchema.parse("v1.0.0")).toBe("v1.0.0");
			expect(branchNameSchema.parse("release-2024")).toBe("release-2024");
		});

		it("rejects names starting with hyphen", () => {
			expect(() => branchNameSchema.parse("-invalid")).toThrow(/hyphen/i);
		});

		it("rejects names containing '..'", () => {
			expect(() => branchNameSchema.parse("feature/../leak")).toThrow(/'\.\.'/);
		});

		it("rejects names ending with .lock", () => {
			expect(() => branchNameSchema.parse("feature.lock")).toThrow(/\.lock/);
		});

		it("rejects names containing '@{'", () => {
			expect(() => branchNameSchema.parse("feature@{invalid}")).toThrow(/'@{'/);
		});

		it("rejects names with spaces", () => {
			expect(() => branchNameSchema.parse("feature branch")).toThrow(
				/invalid characters/i,
			);
		});

		it("rejects names with special characters", () => {
			expect(() => branchNameSchema.parse("feature~branch")).toThrow();
			expect(() => branchNameSchema.parse("feature^branch")).toThrow();
			expect(() => branchNameSchema.parse("feature?branch")).toThrow();
			expect(() => branchNameSchema.parse("feature*branch")).toThrow();
			expect(() => branchNameSchema.parse("feature[branch")).toThrow();
		});

		it("rejects names exceeding maximum length", () => {
			expect(() => branchNameSchema.parse("a".repeat(201))).toThrow();
		});

		it("accepts name at maximum length", () => {
			const maxBranch = "a".repeat(200);
			expect(branchNameSchema.parse(maxBranch)).toBe(maxBranch);
		});

		it("rejects empty name", () => {
			expect(() => branchNameSchema.parse("")).toThrow();
		});
	});

	describe("createBranchSchema", () => {
		it("accepts valid branch creation input", () => {
			const result = createBranchSchema.parse({
				name: "my-repo",
				branch: "feature/new-ui",
			});
			expect(result.branch).toBe("feature/new-ui");
		});

		it("accepts branch with from ref", () => {
			const result = createBranchSchema.parse({
				name: "my-repo",
				branch: "feature/test",
				from: "main",
			});
			expect(result.from).toBe("main");
		});

		it("defaults from ref when omitted", () => {
			const result = createBranchSchema.parse({
				name: "my-repo",
				branch: "feature/test",
			});
			expect(result.from).toBeUndefined();
		});

		it("accepts branch name with hyphens", () => {
			const result = createBranchSchema.parse({
				name: "my-repo",
				branch: "feature/my-new-branch",
			});
			expect(result.branch).toBe("feature/my-new-branch");
		});

		it("accepts branch name with slashes", () => {
			const result = createBranchSchema.parse({
				name: "my-repo",
				branch: "feature/sub/branch",
			});
			expect(result.branch).toBe("feature/sub/branch");
		});

		it("rejects branch name starting with hyphen", () => {
			expect(() =>
				createBranchSchema.parse({ name: "my-repo", branch: "-invalid" }),
			).toThrow(/hyphen/i);
		});

		it("rejects branch name containing '..'", () => {
			expect(() =>
				createBranchSchema.parse({
					name: "my-repo",
					branch: "feature/../leak",
				}),
			).toThrow(/'\.\.'/);
		});

		it("rejects branch name ending with .lock", () => {
			expect(() =>
				createBranchSchema.parse({ name: "my-repo", branch: "feature.lock" }),
			).toThrow(/\.lock/);
		});

		it("rejects branch name containing '@{'", () => {
			expect(() =>
				createBranchSchema.parse({
					name: "my-repo",
					branch: "feature@{invalid}",
				}),
			).toThrow(/'@{'/);
		});

		it("rejects branch name with spaces", () => {
			expect(() =>
				createBranchSchema.parse({ name: "my-repo", branch: "feature branch" }),
			).toThrow(/invalid characters/i);
		});

		it("rejects branch name with special characters", () => {
			expect(() =>
				createBranchSchema.parse({ name: "my-repo", branch: "feature~branch" }),
			).toThrow(/invalid characters/i);
		});

		it("rejects branch name exceeding maximum length", () => {
			expect(() =>
				createBranchSchema.parse({ name: "my-repo", branch: "a".repeat(201) }),
			).toThrow();
		});

		it("accepts branch name at maximum length", () => {
			const maxBranch = "a".repeat(200);
			expect(
				createBranchSchema.parse({ name: "my-repo", branch: maxBranch }),
			).toMatchObject({ branch: maxBranch });
		});

		it("rejects invalid repository name", () => {
			expect(() =>
				createBranchSchema.parse({ name: "Invalid!", branch: "feature" }),
			).toThrow();
		});

		it("rejects missing branch name", () => {
			expect(() => createBranchSchema.parse({ name: "my-repo" })).toThrow();
		});
	});

	describe("combined branch validators", () => {
		it("createBranchFn validator combines all fields", () => {
			const input = {
				name: "my-repo",
				branch: "feature/new-ui",
				from: "main",
			};
			const result = createBranchSchema.parse(input);
			expect(result).toMatchObject({
				name: "my-repo",
				branch: "feature/new-ui",
				from: "main",
			});
		});
	});
});
