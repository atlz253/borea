import { describe, expect, it } from "vitest";
import { addPullRequestFileCommentSchema } from "./schemas";

const input = {
	organizationName: "default",
	repoName: "my-repo",
	id: 1,
	filePath: "src/file.ts",
	body: "Review note",
};

describe("addPullRequestFileCommentSchema", () => {
	it("trims comment body", () => {
		expect(
			addPullRequestFileCommentSchema.parse({
				...input,
				body: "  Review note  ",
			}).body,
		).toBe("Review note");
	});

	it("rejects an empty comment", () => {
		expect(() =>
			addPullRequestFileCommentSchema.parse({ ...input, body: "   " }),
		).toThrow("Comment is required");
	});

	it("rejects comments longer than 10000 characters", () => {
		expect(() =>
			addPullRequestFileCommentSchema.parse({
				...input,
				body: "a".repeat(10_001),
			}),
		).toThrow("Comment is too long");
	});
});
