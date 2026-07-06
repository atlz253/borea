import "#/platform/http/openapi-zod";
import { z } from "zod";
import { organizationNameSchema } from "#/modules/organizations";

const MAX_NAME_LENGTH = 100;
const MAX_DESC_LENGTH = 500;
const MAX_PATH_LENGTH = 1024;
const MAX_BRANCH_NAME_LENGTH = 200;

export const repoNameSchema = z
	.string()
	.min(1, "Repository name is required")
	.max(MAX_NAME_LENGTH, "Repository name is too long")
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

export const createRepositorySchema = z.object({
	organizationName: organizationNameSchema.default("default"),
	name: repoNameSchema,
	description: z
		.string()
		.trim()
		.max(MAX_DESC_LENGTH, "Description is too long")
		.optional()
		.default(""),
});

export const deleteRepositorySchema = z
	.object({
		organizationName: organizationNameSchema.default("default"),
		name: repoNameSchema,
		confirmation: z.string(),
	})
	.refine((data) => data.confirmation === data.name, {
		message: "Repository name confirmation does not match",
		path: ["confirmation"],
	});

export const repositorySchema = z.object({
	organizationName: organizationNameSchema,
	name: z.string(),
	description: z.string().optional(),
	createdAt: z.date(),
	ownerId: z.uuid().optional(),
});

export const repositoryResponseSchema = repositorySchema.extend({
	createdAt: z.iso.datetime(),
});

export const treeEntryTypeSchema = z.enum(["blob", "tree"]);

export const treeEntrySchema = z.object({
	name: z.string().min(1),
	type: treeEntryTypeSchema,
	mode: z.string(),
	size: z.number().int().nonnegative().optional(),
});

export const repoPathSchema = z
	.string()
	.max(MAX_PATH_LENGTH, "Path is too long")
	.refine((p) => !p.includes("\0"), "Path cannot contain null bytes")
	.refine(
		(p) => p.split("/").every((seg) => seg !== ".."),
		"Path cannot contain parent-directory segments",
	)
	.refine(
		(p) => !p.startsWith("/") && !p.endsWith("/"),
		"Path must be relative without leading or trailing slashes",
	);

export const refSchema = z
	.string()
	.max(MAX_PATH_LENGTH)
	.refine((p) => !p.includes("\0"), "Ref cannot contain null bytes");

export const repositoryLocatorSchema = z.object({
	organizationName: organizationNameSchema.default("default"),
	name: repoNameSchema,
});

export const listFilesSchema = repositoryLocatorSchema.extend({
	path: repoPathSchema.optional(),
	ref: refSchema.optional(),
});

export const getFileSchema = repositoryLocatorSchema.extend({
	path: repoPathSchema.refine(
		(path) => path.length > 0,
		"File path is required",
	),
	ref: refSchema.optional(),
	loadLarge: z.boolean().optional().default(false),
});

const MAX_COMMIT_LIMIT = 500;

export const listCommitsSchema = repositoryLocatorSchema.extend({
	ref: refSchema.optional(),
	limit: z
		.number()
		.int()
		.positive()
		.max(MAX_COMMIT_LIMIT, `Limit cannot exceed ${MAX_COMMIT_LIMIT}`)
		.optional(),
});

export const countCommitsSchema = repositoryLocatorSchema.extend({
	ref: refSchema.optional(),
});

export const listBranchesSchema = repositoryLocatorSchema;

export const branchNameSchema = z
	.string()
	.min(1, "Branch name is required")
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

export const createBranchSchema = repositoryLocatorSchema.extend({
	branch: branchNameSchema,
	from: refSchema.optional(),
});

export const renameBranchSchema = repositoryLocatorSchema.extend({
	oldName: branchNameSchema,
	newName: branchNameSchema.refine(
		(name) => name !== "",
		"New branch name cannot be empty",
	),
});

export const commitShaSchema = z
	.string()
	.regex(/^[0-9a-f]{7,40}$/, "Invalid commit SHA");

export const getCommitDiffSchema = repositoryLocatorSchema.extend({
	sha: commitShaSchema,
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
export type DeleteRepositoryInput = z.infer<typeof deleteRepositorySchema>;
export type Repository = z.infer<typeof repositorySchema>;
export type TreeEntryType = z.infer<typeof treeEntryTypeSchema>;
export type TreeEntry = z.infer<typeof treeEntrySchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
