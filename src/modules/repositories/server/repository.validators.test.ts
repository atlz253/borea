import { describe, expect, it } from "vitest";
import { organizationNameSchema } from "#/modules/organizations";
import {
	createRepositorySchema,
	deleteRepositorySchema,
	repoNameSchema,
	repositoryLocatorSchema,
} from "../schemas";

describe("repository core validators", () => {
	describe("organizationNameSchema (used by list/delete endpoints)", () => {
		it("accepts valid organization names", () => {
			expect(organizationNameSchema.parse("team")).toBe("team");
			expect(organizationNameSchema.parse("my-org")).toBe("my-org");
			expect(organizationNameSchema.parse("org_1")).toBe("org_1");
		});

		it("rejects uppercase names", () => {
			expect(() => organizationNameSchema.parse("Team")).toThrow();
		});

		it("rejects names starting with a dot", () => {
			expect(() => organizationNameSchema.parse(".hidden")).toThrow();
		});

		it("rejects reserved names", () => {
			expect(() => organizationNameSchema.parse(".")).toThrow();
			expect(() => organizationNameSchema.parse("..")).toThrow();
		});

		it("rejects empty names", () => {
			expect(() => organizationNameSchema.parse("")).toThrow();
		});

		it("rejects names exceeding 100 characters", () => {
			expect(() => organizationNameSchema.parse("a".repeat(101))).toThrow();
		});

		it("accepts names at maximum length", () => {
			const maxName = "a".repeat(100);
			expect(organizationNameSchema.parse(maxName)).toBe(maxName);
		});
	});

	describe("repoNameSchema", () => {
		it("accepts valid repository names", () => {
			expect(repoNameSchema.parse("my-repo")).toBe("my-repo");
			expect(repoNameSchema.parse("repo123")).toBe("repo123");
			expect(repoNameSchema.parse("repo.test")).toBe("repo.test");
			expect(repoNameSchema.parse("repo_test")).toBe("repo_test");
		});

		it("rejects names starting with a dot", () => {
			expect(() => repoNameSchema.parse(".hidden")).toThrow();
			expect(() => repoNameSchema.parse("..git")).toThrow();
		});

		it("rejects names ending with .git", () => {
			expect(() => repoNameSchema.parse("repo.git")).toThrow();
			expect(() => repoNameSchema.parse("my-repo.git")).toThrow();
		});

		it("rejects reserved names", () => {
			expect(() => repoNameSchema.parse(".")).toThrow();
			expect(() => repoNameSchema.parse("..")).toThrow();
		});

		it("rejects names with spaces", () => {
			expect(() => repoNameSchema.parse("my repo")).toThrow();
		});

		it("rejects names with slashes", () => {
			expect(() => repoNameSchema.parse("path/to/repo")).toThrow();
		});

		it("rejects empty names", () => {
			expect(() => repoNameSchema.parse("")).toThrow();
		});

		it("rejects names exceeding maximum length", () => {
			expect(() => repoNameSchema.parse("a".repeat(101))).toThrow();
		});

		it("accepts names at maximum length", () => {
			const maxName = "a".repeat(100);
			expect(repoNameSchema.parse(maxName)).toBe(maxName);
		});
	});

	describe("createRepositorySchema", () => {
		it("accepts valid creation input", () => {
			const result = createRepositorySchema.parse({
				name: "my-repo",
				description: "A test repository",
			});
			expect(result).toMatchObject({
				name: "my-repo",
				description: "A test repository",
			});
		});

		it("accepts creation input without an explicit scope", () => {
			const result = createRepositorySchema.parse({
				name: "my-repo",
			});
			expect(result.organizationName).toBeUndefined();
			expect(result.userName).toBeUndefined();
		});

		it("defaults description to empty string", () => {
			const result = createRepositorySchema.parse({
				name: "my-repo",
			});
			expect(result.description).toBe("");
		});

		it("trims description whitespace", () => {
			const result = createRepositorySchema.parse({
				name: "my-repo",
				description: "  spaced  ",
			});
			expect(result.description).toBe("spaced");
		});

		it("rejects invalid repository name with .git suffix", () => {
			expect(() =>
				createRepositorySchema.parse({ name: "repo.git" }),
			).toThrow();
		});

		it("rejects invalid repository name starting with dot", () => {
			expect(() => createRepositorySchema.parse({ name: ".hidden" })).toThrow();
		});

		it("rejects missing name", () => {
			expect(() =>
				createRepositorySchema.parse({ description: "test" }),
			).toThrow();
		});

		it("rejects description exceeding maximum length", () => {
			const longDesc = "a".repeat(501);
			expect(() =>
				createRepositorySchema.parse({ name: "repo", description: longDesc }),
			).toThrow();
		});

		it("accepts description at maximum length", () => {
			const maxDesc = "a".repeat(500);
			expect(
				createRepositorySchema.parse({ name: "repo", description: maxDesc }),
			).toMatchObject({ description: maxDesc });
		});

		it("accepts custom organization name", () => {
			const result = createRepositorySchema.parse({
				organizationName: "team-alpha",
				name: "repo",
			});
			expect(result.organizationName).toBe("team-alpha");
		});

		it("rejects invalid organization name", () => {
			expect(() =>
				createRepositorySchema.parse({
					organizationName: "Invalid Name!",
					name: "repo",
				}),
			).toThrow();
		});
	});

	describe("deleteRepositorySchema", () => {
		it("accepts valid deletion input with matching confirmation", () => {
			const result = deleteRepositorySchema.parse({
				name: "my-repo",
				confirmation: "my-repo",
			});
			expect(result.name).toBe("my-repo");
			expect(result.confirmation).toBe("my-repo");
		});

		it("accepts deletion input without an explicit scope", () => {
			const result = deleteRepositorySchema.parse({
				name: "my-repo",
				confirmation: "my-repo",
			});
			expect(result.organizationName).toBeUndefined();
			expect(result.userName).toBeUndefined();
		});

		it("rejects mismatched confirmation", () => {
			expect(() =>
				deleteRepositorySchema.parse({
					name: "my-repo",
					confirmation: "wrong-name",
				}),
			).toThrow(/confirmation/i);
		});

		it("rejects empty confirmation", () => {
			expect(() =>
				deleteRepositorySchema.parse({
					name: "my-repo",
					confirmation: "",
				}),
			).toThrow();
		});

		it("rejects case-sensitive mismatch", () => {
			expect(() =>
				deleteRepositorySchema.parse({
					name: "my-repo",
					confirmation: "My-Repo",
				}),
			).toThrow();
		});

		it("rejects invalid repository name", () => {
			expect(() =>
				deleteRepositorySchema.parse({
					name: "Invalid Name!",
					confirmation: "Invalid Name!",
				}),
			).toThrow();
		});

		it("rejects missing name", () => {
			expect(() =>
				deleteRepositorySchema.parse({ confirmation: "test" }),
			).toThrow();
		});

		it("rejects missing confirmation", () => {
			expect(() => deleteRepositorySchema.parse({ name: "my-repo" })).toThrow();
		});
	});

	describe("repositoryLocatorSchema", () => {
		it("accepts valid locator", () => {
			const result = repositoryLocatorSchema.parse({ name: "my-repo" });
			expect(result).toEqual({
				name: "my-repo",
			});
		});

		it("accepts locator with custom organization", () => {
			const result = repositoryLocatorSchema.parse({
				name: "repo",
				organizationName: "team",
			});
			expect(result).toEqual({
				name: "repo",
				organizationName: "team",
			});
		});

		it("rejects invalid repository name", () => {
			expect(() =>
				repositoryLocatorSchema.parse({ name: "Invalid!" }),
			).toThrow();
		});

		it("rejects missing name", () => {
			expect(() => repositoryLocatorSchema.parse({})).toThrow();
		});

		it("rejects name exceeding maximum length", () => {
			expect(() =>
				repositoryLocatorSchema.parse({ name: "a".repeat(101) }),
			).toThrow();
		});
	});

	describe("combined core validators", () => {
		it("createRepositoryFn validator combines all fields", () => {
			const input = { name: "my-repo", description: "A test repository" };
			const result = createRepositorySchema.parse(input);
			expect(result).toMatchObject({
				name: "my-repo",
				description: "A test repository",
			});
		});

		it("deleteRepositoryFn validator combines name and confirmation", () => {
			const input = { name: "my-repo", confirmation: "my-repo" };
			const result = deleteRepositorySchema.parse(input);
			expect(result.name).toBe("my-repo");
			expect(result.confirmation).toBe("my-repo");
		});

		it("deleteRepositoryApiFn validator parses repository locator", () => {
			const input = { name: "my-repo", organizationName: "team" };
			const result = repositoryLocatorSchema.parse(input);
			expect(result).toEqual({
				name: "my-repo",
				organizationName: "team",
			});
		});
	});
});
