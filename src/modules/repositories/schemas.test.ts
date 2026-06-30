import { describe, expect, it } from "vitest";
import { createRepositorySchema, repoNameSchema } from "./schemas";

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
