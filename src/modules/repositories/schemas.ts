import "#/platform/http/openapi-zod";
import { z } from "zod";
import { usernameSchema } from "#/modules/auth";
import { organizationNameSchema } from "#/modules/organizations";
import * as m from "#/paraglide/messages";

const MAX_NAME_LENGTH = 100;
const MAX_DESC_LENGTH = 500;
const MAX_PATH_LENGTH = 1024;
const MAX_BRANCH_NAME_LENGTH = 200;

export const repoNameSchema = z
	.string()
	.min(1, m.repositories_schemas_nameRequired())
	.max(MAX_NAME_LENGTH, m.repositories_schemas_nameTooLong())
	.regex(/^[a-zA-Z0-9._-]+$/, m.repositories_schemas_nameInvalidChars())
	.refine(
		(name) => !name.startsWith("."),
		m.repositories_schemas_nameDotStart(),
	)
	.refine(
		(name) => !name.toLowerCase().endsWith(".git"),
		m.repositories_schemas_nameGitSuffix(),
	)
	.refine(
		(name) => name !== "." && name !== "..",
		m.repositories_schemas_nameInvalid(),
	);

export const createRepositorySchema = z
	.object({
		organizationName: organizationNameSchema.optional(),
		userName: usernameSchema.optional(),
		name: repoNameSchema,
		description: z
			.string()
			.trim()
			.max(MAX_DESC_LENGTH, m.repositories_schemas_descriptionTooLong())
			.optional()
			.default(""),
	})
	.refine((data) => !(data.organizationName && data.userName), {
		message:
			"Repository scope cannot include both organizationName and userName",
		path: ["organizationName"],
	});

export const deleteRepositorySchema = z
	.object({
		organizationName: organizationNameSchema.optional(),
		userName: usernameSchema.optional(),
		name: repoNameSchema,
		confirmation: z.string(),
	})
	.refine((data) => !(data.organizationName && data.userName), {
		message:
			"Repository scope cannot include both organizationName and userName",
		path: ["organizationName"],
	})
	.refine((data) => data.confirmation === data.name, {
		message: m.repositories_schemas_nameConfirmMismatch(),
		path: ["confirmation"],
	});

export const repositorySchema = z.object({
	organizationName: organizationNameSchema.optional(),
	userName: usernameSchema.optional(),
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
	.max(MAX_PATH_LENGTH, m.repositories_schemas_pathTooLong())
	.refine((p) => !p.includes("\0"), m.repositories_schemas_pathNullByte())
	.refine(
		(p) => p.split("/").every((seg) => seg !== ".."),
		m.repositories_schemas_pathParentSegment(),
	)
	.refine(
		(p) => !p.startsWith("/") && !p.endsWith("/"),
		m.repositories_schemas_pathFormat(),
	);

export const refSchema = z
	.string()
	.max(MAX_PATH_LENGTH)
	.refine((p) => !p.includes("\0"), m.repositories_schemas_refNullByte());

export const repositoryLocatorSchema = z
	.object({
		organizationName: organizationNameSchema.optional(),
		userName: usernameSchema.optional(),
		name: repoNameSchema,
	})
	.refine((data) => !(data.organizationName && data.userName), {
		message:
			"Repository scope cannot include both organizationName and userName",
		path: ["organizationName"],
	});

export const listFilesSchema = repositoryLocatorSchema.extend({
	path: repoPathSchema.optional(),
	ref: refSchema.optional(),
});

export const getFileSchema = repositoryLocatorSchema.extend({
	path: repoPathSchema.refine(
		(path) => path.length > 0,
		m.repositories_schemas_filePathRequired(),
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
	.min(1, m.repositories_schemas_branchNameRequired())
	.max(MAX_BRANCH_NAME_LENGTH, m.repositories_schemas_branchNameTooLong())
	.regex(/^[^\s~^:?*[\\]+$/, m.repositories_schemas_branchNameInvalidChars())
	.refine(
		(name) => !name.includes(".."),
		m.repositories_schemas_branchNameDoubleDot(),
	)
	.refine(
		(name) => !name.startsWith("-"),
		m.repositories_schemas_branchNameHyphenStart(),
	)
	.refine(
		(name) => !name.endsWith(".lock"),
		m.repositories_schemas_branchNameLockSuffix(),
	)
	.refine(
		(name) => !name.includes("@{"),
		m.repositories_schemas_branchNameAtCurly(),
	);

export const createBranchSchema = repositoryLocatorSchema.extend({
	branch: branchNameSchema,
	from: refSchema.optional(),
});

export const renameBranchSchema = repositoryLocatorSchema.extend({
	oldName: branchNameSchema,
	newName: branchNameSchema.refine(
		(name) => name !== "",
		m.repositories_schemas_newBranchNameEmpty(),
	),
});

export const commitShaSchema = z
	.string()
	.regex(/^[0-9a-f]{7,40}$/, m.repositories_schemas_invalidSha());

export const getCommitDiffSchema = repositoryLocatorSchema.extend({
	sha: commitShaSchema,
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
export type DeleteRepositoryInput = z.infer<typeof deleteRepositorySchema>;
export type Repository = z.infer<typeof repositorySchema>;
export type TreeEntryType = z.infer<typeof treeEntryTypeSchema>;
export type TreeEntry = z.infer<typeof treeEntrySchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
