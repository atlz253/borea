import { describe, expect, it } from "vitest";
import {
	commitShaSchema,
	countCommitsSchema,
	getCommitDiffSchema,
	listCommitsSchema,
} from "../schemas";

describe("repository commit validators", () => {
	describe("listCommitsSchema", () => {
		it("accepts valid commit listing input", () => {
			const result = listCommitsSchema.parse({ name: "my-repo" });
			expect(result).toEqual({
				name: "my-repo",
			});
		});

		it("accepts ref parameter", () => {
			const result = listCommitsSchema.parse({ name: "my-repo", ref: "main" });
			expect(result.ref).toBe("main");
		});

		it("accepts limit parameter", () => {
			const result = listCommitsSchema.parse({ name: "my-repo", limit: 50 });
			expect(result.limit).toBe(50);
		});

		it("accepts limit at maximum value", () => {
			const result = listCommitsSchema.parse({ name: "my-repo", limit: 500 });
			expect(result.limit).toBe(500);
		});

		it("rejects limit exceeding maximum", () => {
			expect(() =>
				listCommitsSchema.parse({ name: "my-repo", limit: 501 }),
			).toThrow(/500/);
		});

		it("rejects zero limit", () => {
			expect(() =>
				listCommitsSchema.parse({ name: "my-repo", limit: 0 }),
			).toThrow();
		});

		it("rejects negative limit", () => {
			expect(() =>
				listCommitsSchema.parse({ name: "my-repo", limit: -1 }),
			).toThrow();
		});

		it("rejects non-integer limit", () => {
			expect(() =>
				listCommitsSchema.parse({ name: "my-repo", limit: 1.5 }),
			).toThrow();
		});

		it("rejects ref with null bytes", () => {
			expect(() =>
				listCommitsSchema.parse({ name: "my-repo", ref: "main\x00" }),
			).toThrow(/null bytes/i);
		});

		it("rejects ref exceeding maximum length", () => {
			expect(() =>
				listCommitsSchema.parse({ name: "my-repo", ref: "a".repeat(1025) }),
			).toThrow();
		});

		it("rejects invalid repository name", () => {
			expect(() => listCommitsSchema.parse({ name: "Invalid!" })).toThrow();
		});
	});

	describe("countCommitsSchema", () => {
		it("accepts valid count input", () => {
			const result = countCommitsSchema.parse({ name: "my-repo" });
			expect(result).toEqual({
				name: "my-repo",
			});
		});

		it("accepts ref parameter", () => {
			const result = countCommitsSchema.parse({
				name: "my-repo",
				ref: "develop",
			});
			expect(result.ref).toBe("develop");
		});

		it("rejects ref with null bytes", () => {
			expect(() =>
				countCommitsSchema.parse({ name: "my-repo", ref: "main\x00" }),
			).toThrow();
		});

		it("rejects invalid repository name", () => {
			expect(() => countCommitsSchema.parse({ name: "Invalid!" })).toThrow();
		});
	});

	describe("commitShaSchema", () => {
		it("accepts valid short SHAs (7+ chars)", () => {
			expect(commitShaSchema.parse("abc1234")).toBe("abc1234");
			expect(commitShaSchema.parse("deadbeef")).toBe("deadbeef");
		});

		it("accepts full 40-character SHAs", () => {
			const sha = "a".repeat(40);
			expect(commitShaSchema.parse(sha)).toBe(sha);
		});

		it("rejects uppercase hex", () => {
			expect(() => commitShaSchema.parse("ABC1234")).toThrow();
		});

		it("rejects non-hex characters", () => {
			expect(() => commitShaSchema.parse("ggggggg")).toThrow();
		});

		it("rejects SHAs shorter than 7 characters", () => {
			expect(() => commitShaSchema.parse("abc123")).toThrow();
			expect(() => commitShaSchema.parse("abc12")).toThrow();
			expect(() => commitShaSchema.parse("abc")).toThrow();
		});

		it("rejects SHAs longer than 40 characters", () => {
			expect(() => commitShaSchema.parse("a".repeat(41))).toThrow();
		});

		it("rejects empty string", () => {
			expect(() => commitShaSchema.parse("")).toThrow();
		});
	});

	describe("getCommitDiffSchema", () => {
		it("accepts valid commit diff input", () => {
			const result = getCommitDiffSchema.parse({
				name: "my-repo",
				sha: "abc1234",
			});
			expect(result.sha).toBe("abc1234");
		});

		it("accepts full 40-character SHA", () => {
			const sha = "a".repeat(40);
			const result = getCommitDiffSchema.parse({ name: "my-repo", sha });
			expect(result.sha).toBe(sha);
		});

		it("accepts short 7-character SHA", () => {
			const sha = "abc1234";
			const result = getCommitDiffSchema.parse({ name: "my-repo", sha });
			expect(result.sha).toBe(sha);
		});

		it("rejects SHA with uppercase letters", () => {
			expect(() =>
				getCommitDiffSchema.parse({ name: "my-repo", sha: "ABC1234" }),
			).toThrow(/invalid commit sha/i);
		});

		it("rejects SHA with non-hex characters", () => {
			expect(() =>
				getCommitDiffSchema.parse({ name: "my-repo", sha: "ggggggg" }),
			).toThrow();
		});

		it("rejects SHA shorter than 7 characters", () => {
			expect(() =>
				getCommitDiffSchema.parse({ name: "my-repo", sha: "abc123" }),
			).toThrow();
		});

		it("rejects SHA longer than 40 characters", () => {
			expect(() =>
				getCommitDiffSchema.parse({ name: "my-repo", sha: "a".repeat(41) }),
			).toThrow();
		});

		it("rejects empty SHA", () => {
			expect(() =>
				getCommitDiffSchema.parse({ name: "my-repo", sha: "" }),
			).toThrow();
		});

		it("rejects invalid repository name", () => {
			expect(() =>
				getCommitDiffSchema.parse({ name: "Invalid!", sha: "abc1234" }),
			).toThrow();
		});

		it("rejects missing SHA", () => {
			expect(() => getCommitDiffSchema.parse({ name: "my-repo" })).toThrow();
		});
	});

	describe("combined commit validators", () => {
		it("listCommitsFn validator parses full input", () => {
			const input = { name: "my-repo", ref: "main", limit: 100 };
			const result = listCommitsSchema.parse(input);
			expect(result).toMatchObject({
				name: "my-repo",
				ref: "main",
				limit: 100,
			});
		});

		it("getCommitFn and getCommitDiffFn validators parse full input", () => {
			const input = { name: "my-repo", sha: "abc1234" };
			const result = getCommitDiffSchema.parse(input);
			expect(result).toMatchObject({
				name: "my-repo",
				sha: "abc1234",
			});
		});

		it("countCommitsFn validator parses full input", () => {
			const input = { name: "my-repo", ref: "develop" };
			const result = countCommitsSchema.parse(input);
			expect(result).toMatchObject({
				name: "my-repo",
				ref: "develop",
			});
		});
	});
});
