import { z } from "zod";

const MAX_REPO_NAME_LENGTH = 100;
const MAX_BRANCH_NAME_LENGTH = 200;
const MAX_TITLE_LENGTH = 500;
const MAX_AUTHOR_NAME_LENGTH = 200;
const MAX_PR_ID = Number.MAX_SAFE_INTEGER;

export const repoNameSchema = z
	.string()
	.min(1, "Repository name is required")
	.max(MAX_REPO_NAME_LENGTH, "Repository name is too long")
	.regex(
		/^[a-zA-Z0-9._-]+$/,
		"Only letters, numbers, dots, hyphens, and underscores allowed",
	)
	.refine((name) => !name.startsWith("."), "Name cannot start with a dot")
	.refine(
		(name) => !name.toLowerCase().endsWith(".git"),
		"Name cannot end with .git",
	)
	.refine((name) => name !== "." && name !== "..", "Invalid name");

export const branchRefSchema = z
	.string()
	.min(1, "Branch is required")
	.max(MAX_BRANCH_NAME_LENGTH, "Branch name is too long")
	.regex(/^[^\s~^:?*[\\]+$/, "Branch name contains invalid characters")
	.refine((name) => !name.includes(".."), "Branch name cannot contain '..'")
	.refine(
		(name) => !name.startsWith("-"),
		"Branch name cannot start with a hyphen",
	)
	.refine(
		(name) => !name.endsWith(".lock"),
		"Branch name cannot end with .lock",
	)
	.refine((name) => !name.includes("@{"), "Branch name cannot contain '@{'");

export const prTitleSchema = z
	.string()
	.trim()
	.min(1, "Title is required")
	.max(MAX_TITLE_LENGTH, "Title is too long");

export const createPullRequestSchema = z.object({
	repoName: repoNameSchema,
	title: prTitleSchema,
	sourceBranch: branchRefSchema,
	targetBranch: branchRefSchema,
	authorName: z.string().min(1).max(MAX_AUTHOR_NAME_LENGTH).optional(),
});

export const listPullRequestsSchema = z.object({
	repoName: repoNameSchema,
});

export const getPullRequestSchema = z.object({
	repoName: repoNameSchema,
	id: z
		.number()
		.int()
		.positive()
		.max(MAX_PR_ID, "Pull request id is too large"),
});

export const mergePullRequestSchema = z.object({
	repoName: repoNameSchema,
	id: z
		.number()
		.int()
		.positive()
		.max(MAX_PR_ID, "Pull request id is too large"),
	fastForward: z.boolean().optional(),
});

export const pullRequestStatusSchema = z.enum(["open", "merged", "closed"]);

export const pullRequestSchema = z.object({
	id: z.number().int().positive(),
	repoName: z.string(),
	title: z.string(),
	sourceBranch: z.string(),
	targetBranch: z.string(),
	status: pullRequestStatusSchema,
	mergeCommitSha: z.string().optional(),
	authorName: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type CreatePullRequestInput = z.infer<typeof createPullRequestSchema>;
export type ListPullRequestsInput = z.infer<typeof listPullRequestsSchema>;
export type GetPullRequestInput = z.infer<typeof getPullRequestSchema>;
export type MergePullRequestInput = z.infer<typeof mergePullRequestSchema>;
export type PullRequest = z.infer<typeof pullRequestSchema>;
export type PullRequestStatus = z.infer<typeof pullRequestStatusSchema>;
