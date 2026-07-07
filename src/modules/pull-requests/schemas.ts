import "#/platform/http/openapi-zod";
import { z } from "zod";
import { organizationNameSchema } from "#/modules/organizations";
import * as m from "#/paraglide/messages";

const MAX_REPO_NAME_LENGTH = 100;
const MAX_BRANCH_NAME_LENGTH = 200;
const MAX_TITLE_LENGTH = 500;
const MAX_FILE_PATH_LENGTH = 4096;
const MAX_COMMENT_LENGTH = 10_000;
const MAX_PR_ID = Number.MAX_SAFE_INTEGER;

export const repoNameSchema = z
	.string()
	.min(1, m.pullRequests_schemas_nameRequired())
	.max(MAX_REPO_NAME_LENGTH, m.pullRequests_schemas_nameTooLong())
	.regex(/^[a-zA-Z0-9._-]+$/, m.pullRequests_schemas_nameInvalidChars())
	.refine(
		(name) => !name.startsWith("."),
		m.pullRequests_schemas_nameDotStart(),
	)
	.refine(
		(name) => !name.toLowerCase().endsWith(".git"),
		m.pullRequests_schemas_nameGitSuffix(),
	)
	.refine(
		(name) => name !== "." && name !== "..",
		m.pullRequests_schemas_nameInvalid(),
	);

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
	.refine(
		(name) => !name.includes("@{"),
		m.pullRequests_schemas_branchNameAtCurly(),
	);

export const prTitleSchema = z
	.string()
	.trim()
	.min(1, m.pullRequests_schemas_titleRequired())
	.max(MAX_TITLE_LENGTH, m.pullRequests_schemas_titleTooLong());

export const createPullRequestSchema = z.object({
	organizationName: organizationNameSchema,
	repoName: repoNameSchema,
	title: prTitleSchema,
	sourceBranch: branchRefSchema,
	targetBranch: branchRefSchema,
});

export const listPullRequestsSchema = z.object({
	organizationName: organizationNameSchema,
	repoName: repoNameSchema,
});

export const getPullRequestSchema = listPullRequestsSchema.extend({
	id: z
		.number()
		.int()
		.positive()
		.max(MAX_PR_ID, m.pullRequests_schemas_prIdTooLarge()),
});

export const mergePullRequestBodySchema = z.object({
	fastForward: z.boolean().optional(),
});

export const mergePullRequestSchema = getPullRequestSchema.extend(
	mergePullRequestBodySchema.shape,
);

export const mergeResultSchema = z.object({
	mergedSha: z.string(),
	fastForward: z.boolean(),
});

export const setPullRequestFileViewedSchema = getPullRequestSchema.extend({
	filePath: z.string().min(1).max(MAX_FILE_PATH_LENGTH),
	viewed: z.boolean(),
});

export const pullRequestCommentTargetSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("file"),
		filePath: z.string().min(1).max(MAX_FILE_PATH_LENGTH),
	}),
]);

export const pullRequestCommentSchema = z.object({
	id: z.uuid(),
	target: pullRequestCommentTargetSchema,
	body: z.string().min(1).max(MAX_COMMENT_LENGTH),
	authorId: z.uuid(),
	authorName: z.string().min(1),
	createdAt: z.iso.datetime(),
});

export const pullRequestCommentsSchema = z.array(pullRequestCommentSchema);

export const addPullRequestFileCommentSchema = getPullRequestSchema.extend({
	filePath: z.string().min(1).max(MAX_FILE_PATH_LENGTH),
	body: z
		.string()
		.trim()
		.min(1, m.pullRequests_schemas_commentRequired())
		.max(MAX_COMMENT_LENGTH, m.pullRequests_schemas_commentTooLong()),
});

export const pullRequestStatusSchema = z.enum(["open", "merged", "closed"]);

export const pullRequestSchema = z.object({
	id: z.number().int().positive(),
	organizationName: organizationNameSchema,
	repoName: z.string(),
	title: z.string(),
	sourceBranch: z.string(),
	targetBranch: z.string(),
	status: pullRequestStatusSchema,
	mergeCommitSha: z.string().optional(),
	authorName: z.string(),
	viewedFiles: z.array(z.string()).default([]),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const mergePullRequestResponseSchema = z.object({
	pullRequest: pullRequestSchema,
	mergeResult: mergeResultSchema,
});

export type CreatePullRequestInput = z.infer<typeof createPullRequestSchema>;
export type ListPullRequestsInput = z.infer<typeof listPullRequestsSchema>;
export type GetPullRequestInput = z.infer<typeof getPullRequestSchema>;
export type MergePullRequestInput = z.infer<typeof mergePullRequestSchema>;
export type SetPullRequestFileViewedInput = z.infer<
	typeof setPullRequestFileViewedSchema
>;
export type PullRequestCommentTarget = z.infer<
	typeof pullRequestCommentTargetSchema
>;
export type PullRequestComment = z.infer<typeof pullRequestCommentSchema>;
export type AddPullRequestFileCommentInput = z.infer<
	typeof addPullRequestFileCommentSchema
>;
export type PullRequest = z.infer<typeof pullRequestSchema>;
export type PullRequestStatus = z.infer<typeof pullRequestStatusSchema>;
